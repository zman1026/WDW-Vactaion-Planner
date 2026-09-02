import OpenAI, { APIError } from "openai";
import { NextResponse } from "next/server";

import { suggestionRequestSchema, suggestionResponseSchema } from "@/lib/ai-validation";
import { getCurrentUser } from "@/lib/current-user";
import { getDescendantEntityIds } from "@/lib/entity-hierarchy";
import { prisma } from "@/lib/prisma";
import { normalizePartyProfile, partyProfileSummary } from "@/lib/party-profile";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
    const { tripId } = await params;
    const requestBody = await request.json().catch(() => null);
    const inputResult = suggestionRequestSchema.safeParse(requestBody);
    if (!inputResult.success) return NextResponse.json({ message: "Check the suggestion preferences and try again." }, { status: 400 });
    const input = inputResult.data;
    const day = await prisma.dayPlan.findFirst({
      where: { id: input.dayPlanId, tripId, trip: { userId: user.id } },
      include: { trip: { select: { name: true, budgetCents: true, notes: true, partyProfile: true } }, items: { orderBy: { sortOrder: "asc" } }, },
    });
    if (!day) return NextResponse.json({ message: "Planning day not found." }, { status: 404 });
    if (!day.parkId) return NextResponse.json({ code: "PARK_REQUIRED", message: "Choose a park before asking for a suggested day." }, { status: 400 });
    const park = await prisma.parkEntity.findUnique({ where: { id: day.parkId }, select: { name: true } });
    const descendantIds = await getDescendantEntityIds(day.parkId);
    const candidates = await prisma.parkEntity.findMany({ where: { id: { in: descendantIds }, entityType: { in: ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"] } }, orderBy: { name: "asc" }, take: 250, select: { id: true, name: true, entityType: true } });
    if (!candidates.length) return NextResponse.json({ code: "DIRECTORY_EMPTY", message: "The park directory needs a refresh before suggestions can be made." }, { status: 409 });

    const openAIKey = process.env.OPENAI_API_KEY?.trim();
    const xAIKey = process.env.XAI_API_KEY?.trim();
    const apiKey = openAIKey || xAIKey;
    if (!apiKey) return NextResponse.json({ code: "AI_NOT_CONFIGURED", message: "AI suggestions aren’t set up on this site yet. The site owner needs to add an AI API key." }, { status: 503 });
    const usingOpenAI = Boolean(openAIKey);
    const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1, ...(usingOpenAI ? {} : { baseURL: "https://api.x.ai/v1" }) });
    const configuredModel = process.env.AI_MODEL?.trim();
    const model = usingOpenAI && configuredModel === "gpt-5.6-luna"
      ? "gpt-5-mini"
      : configuredModel || (usingOpenAI ? "gpt-5-mini" : "grok-3-mini");
    const response = await client.responses.create({
      model,
      store: false,
      ...(usingOpenAI ? { safety_identifier: user.id } : {}),
      input: `Create a realistic, family-friendly one-day itinerary. Use ONLY candidate entity IDs below and do not repeat existing items. Keep times chronological with reasonable breaks between locations. Prefer five to seven well-spaced items over a packed schedule. Costs are estimates in cents.\n\nTrip: ${day.trip.name}\nPark: ${park?.name ?? "WDW park"}\nSaved party profile:\n${partyProfileSummary(normalizePartyProfile(day.trip.partyProfile))}\nAdditional preferences for this request: ${input.preferences || "None"}\nTrip notes: ${day.trip.notes ?? "None"}\nExisting items: ${JSON.stringify(day.items.map((item) => ({ title: item.title, startTime: item.startTime, endTime: item.endTime })))}\nCandidates: ${JSON.stringify(candidates)}`,
      text: { format: { type: "json_schema", name: "wdw_itinerary", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["summary", "items"], properties: {
          summary: { type: "string" }, items: { type: "array", minItems: 1, maxItems: 8, items: { type: "object", additionalProperties: false, required: ["entityId", "entityType", "title", "startTime", "endTime", "estimatedCostCents", "notes", "reason"], properties: {
            entityId: { type: "string" }, entityType: { type: "string", enum: ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"] }, title: { type: "string" }, startTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }, endTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }, estimatedCostCents: { type: "integer", minimum: 0, maximum: 1000000 }, notes: { type: "string" }, reason: { type: "string" },
          } } },
        },
      } } },
    });
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(response.output_text);
    } catch {
      return NextResponse.json({ message: "The AI returned an incomplete plan. Please try again." }, { status: 502 });
    }
    const parsedResult = suggestionResponseSchema.safeParse(responseBody);
    if (!parsedResult.success) return NextResponse.json({ message: "The AI returned an incomplete plan. Please try again." }, { status: 502 });
    const parsed = parsedResult.data;
    const allowed = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const validItems = parsed.items.filter((item) => allowed.get(item.entityId)?.entityType === item.entityType && !day.items.some((existing) => existing.entityId === item.entityId));
    if (!validItems.length) return NextResponse.json({ message: "The suggestion did not contain usable park items. Try again." }, { status: 502 });
    return NextResponse.json({ summary: parsed.summary, items: validItems });
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 401 || error.status === 403) return NextResponse.json({ code: "AI_SETUP_ERROR", message: "The AI connection needs attention. Check the site’s API key." }, { status: 503 });
      if (error.status === 404) return NextResponse.json({ code: "AI_SETUP_ERROR", message: "The selected AI model is unavailable. Check the site’s AI model setting." }, { status: 503 });
      if (error.status === 429) return NextResponse.json({ message: "AI is busy right now. Wait a moment, then try again." }, { status: 429 });
      if (error.status === undefined) return NextResponse.json({ message: "The AI service did not respond in time. Please try again." }, { status: 504 });
    }
    console.error("AI itinerary suggestion failed", error);
    return NextResponse.json({ message: "AI suggestions are temporarily unavailable. Please try again." }, { status: 502 });
  }
}
