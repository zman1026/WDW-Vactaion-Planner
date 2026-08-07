import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { suggestionRequestSchema, suggestionResponseSchema } from "@/lib/ai-validation";
import { getCurrentUser } from "@/lib/current-user";
import { getDescendantEntityIds } from "@/lib/entity-hierarchy";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
    const { tripId } = await params;
    const input = suggestionRequestSchema.parse(await request.json());
    const day = await prisma.dayPlan.findFirst({
      where: { id: input.dayPlanId, tripId, trip: { userId: user.id } },
      include: { trip: { select: { name: true, budgetCents: true, notes: true } }, items: { orderBy: { sortOrder: "asc" } }, },
    });
    if (!day) return NextResponse.json({ message: "Planning day not found." }, { status: 404 });
    if (!day.parkId) return NextResponse.json({ message: "Assign a park before requesting suggestions." }, { status: 400 });
    const park = await prisma.parkEntity.findUnique({ where: { id: day.parkId }, select: { name: true } });
    const descendantIds = await getDescendantEntityIds(day.parkId);
    const candidates = await prisma.parkEntity.findMany({ where: { id: { in: descendantIds }, entityType: { in: ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"] } }, orderBy: { name: "asc" }, take: 250, select: { id: true, name: true, entityType: true } });
    if (!candidates.length) return NextResponse.json({ message: "Sync park entities before requesting suggestions." }, { status: 409 });

    const apiKey = process.env.OPENAI_API_KEY ?? process.env.XAI_API_KEY;
    if (!apiKey) return NextResponse.json({ message: "Set OPENAI_API_KEY or XAI_API_KEY to enable suggestions." }, { status: 503 });
    const usingOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const client = new OpenAI({ apiKey, ...(usingOpenAI ? {} : { baseURL: "https://api.x.ai/v1" }) });
    const response = await client.responses.create({
      model: process.env.AI_MODEL ?? (usingOpenAI ? "gpt-5.6-luna" : "grok-3-mini"),
      store: false,
      safety_identifier: user.id,
      input: `Create a realistic, family-friendly one-day itinerary. Use ONLY candidate entity IDs below and do not repeat existing items. Keep times chronological with reasonable breaks. Costs are estimates in cents.\n\nTrip: ${day.trip.name}\nPark: ${park?.name ?? "WDW park"}\nParty preferences: ${input.preferences}\nTrip notes: ${day.trip.notes ?? "None"}\nExisting items: ${JSON.stringify(day.items.map((item) => ({ title: item.title, startTime: item.startTime, endTime: item.endTime })))}\nCandidates: ${JSON.stringify(candidates)}`,
      text: { format: { type: "json_schema", name: "wdw_itinerary", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["summary", "items"], properties: {
          summary: { type: "string" }, items: { type: "array", minItems: 1, maxItems: 8, items: { type: "object", additionalProperties: false, required: ["entityId", "entityType", "title", "startTime", "endTime", "estimatedCostCents", "notes", "reason"], properties: {
            entityId: { type: "string" }, entityType: { type: "string", enum: ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"] }, title: { type: "string" }, startTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }, endTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }, estimatedCostCents: { type: "integer", minimum: 0, maximum: 1000000 }, notes: { type: "string" }, reason: { type: "string" },
          } } },
        },
      } } },
    });
    const parsed = suggestionResponseSchema.parse(JSON.parse(response.output_text));
    const allowed = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const validItems = parsed.items.filter((item) => allowed.get(item.entityId)?.entityType === item.entityType && !day.items.some((existing) => existing.entityId === item.entityId));
    if (!validItems.length) return NextResponse.json({ message: "The suggestion did not contain usable park items. Try again." }, { status: 502 });
    return NextResponse.json({ summary: parsed.summary, items: validItems });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ message: "The suggestion request or response was invalid." }, { status: 400 });
    console.error("AI itinerary suggestion failed", error);
    return NextResponse.json({ message: "Suggestions are temporarily unavailable." }, { status: 502 });
  }
}
