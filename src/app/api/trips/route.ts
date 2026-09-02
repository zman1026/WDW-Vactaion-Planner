import { eachDayOfInterval } from "date-fns";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getCuratedPlan } from "@/lib/curated-day-plans";
import { parkThemeId } from "@/lib/day-themes";
import { buildGuidedWeek, guidedDraftNote, type MainParkTheme } from "@/lib/guided-trip";
import { matchPlanItem } from "@/lib/plan-matching";
import {
  budgetToCents,
  calendarDateToUtc,
  createTripSchema,
  guidedTripSchema,
  veteranTripSchema,
} from "@/lib/trip-validation";
import { WDW_HOTELS } from "@/lib/wdw-hotels";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in to create a trip." }, { status: 401 });
    const payload: unknown = await request.json();
    const isGuidedRequest = Boolean(payload && typeof payload === "object" && "path" in payload && payload.path === "guide");
    const isVeteranRequest = Boolean(payload && typeof payload === "object" && "path" in payload && payload.path === "veteran");
    const guidedInput = isGuidedRequest ? guidedTripSchema.parse(payload) : null;
    const veteranInput = isVeteranRequest ? veteranTripSchema.parse(payload) : null;
    const input = guidedInput ?? veteranInput ?? createTripSchema.parse(payload);
    const startDate = calendarDateToUtc(input.startDate);
    const endDate = calendarDateToUtc(input.endDate);
    const dates = eachDayOfInterval({ start: startDate, end: endDate });

    const trip = await prisma.$transaction(async (database) => {
      if (guidedInput) {
        const selectedHotel = guidedInput.hotelId ? WDW_HOTELS.find((hotel) => hotel.id === guidedInput.hotelId) : null;
        if (guidedInput.hotelId && !selectedHotel) throw new Error("Choose a hotel from the list.");
        if (selectedHotel) {
          await database.parkEntity.upsert({
            where: { id: selectedHotel.id },
            create: { id: selectedHotel.id, name: selectedHotel.name, entityType: selectedHotel.entityType, parentId: selectedHotel.parentId, destination: selectedHotel.destination, slug: selectedHotel.slug },
            update: { name: selectedHotel.name, entityType: selectedHotel.entityType, parentId: selectedHotel.parentId, destination: selectedHotel.destination, slug: selectedHotel.slug },
          });
        }

        const cached = await database.parkEntity.findMany({ select: { id: true, name: true, entityType: true, parentId: true } });
        const parks = new Map<MainParkTheme, { id: string; name: string }>();
        for (const entity of cached) {
          if (entity.entityType !== "PARK") continue;
          const theme = parkThemeId(entity.name);
          if (theme === "mk" || theme === "epcot" || theme === "hs" || theme === "ak") parks.set(theme, entity);
        }
        if (parks.size < 4) throw new Error("Refresh the WDW directory before creating a guided trip.");

        const children = new Map<string, string[]>();
        for (const entity of cached) {
          if (!entity.parentId) continue;
          children.set(entity.parentId, [...(children.get(entity.parentId) ?? []), entity.id]);
        }
        const week = buildGuidedWeek(dates.length, guidedInput.style, guidedInput.restPreference);
        const partySize = guidedInput.adults + guidedInput.teens + guidedInput.kids + guidedInput.toddlers;
        const ageSummary = [guidedInput.adults && `${guidedInput.adults} adult${guidedInput.adults === 1 ? "" : "s"}`, guidedInput.teens && `${guidedInput.teens} teen${guidedInput.teens === 1 ? "" : "s"}`, guidedInput.kids && `${guidedInput.kids} kid${guidedInput.kids === 1 ? "" : "s"}`, guidedInput.toddlers && `${guidedInput.toddlers} toddler${guidedInput.toddlers === 1 ? "" : "s"}`].filter(Boolean).join(", ");

        return database.trip.create({
          data: {
            userId: user.id,
            name: input.name,
            startDate,
            endDate,
            budgetCents: budgetToCents(input.budget),
            notes: guidedDraftNote(guidedInput.style, guidedInput.restPreference),
            hotelId: selectedHotel?.id ?? null,
            partyProfile: { partySize, ages: ageSummary, dietaryNotes: "", accessibilityNotes: "", mustDos: "", avoidList: "" },
            dayPlans: {
              create: week.map((draftDay, dayIndex) => {
                const park = draftDay.park ? parks.get(draftDay.park) : null;
                const plan = draftDay.planId ? getCuratedPlan(draftDay.planId) : null;
                const descendants = park ? descendantIds(park.id, children) : new Set<string>();
                const available = cached.filter((entity) => descendants.has(entity.id));
                const seen = new Set<string>();
                const items = plan?.items.flatMap((item) => {
                  const entity = matchPlanItem(item, available);
                  if (!entity || seen.has(entity.id)) return [];
                  seen.add(entity.id);
                  return [{ entityId: entity.id, entityType: entity.entityType, title: entity.name, timingType: "TIME_OF_DAY", timeOfDay: item.timing, notes: item.note ?? null, sortOrder: seen.size - 1 }];
                }) ?? [];
                return { date: dates[dayIndex], parkId: park?.id ?? null, items: { create: items } };
              }),
            },
          },
          select: { id: true },
        });
      }

      const selectedHotel = veteranInput?.hotelId ? WDW_HOTELS.find((hotel) => hotel.id === veteranInput.hotelId) : null;
      if (veteranInput?.hotelId && !selectedHotel) throw new Error("Choose a hotel from the list.");
      if (selectedHotel) {
        await database.parkEntity.upsert({
          where: { id: selectedHotel.id },
          create: { id: selectedHotel.id, name: selectedHotel.name, entityType: selectedHotel.entityType, parentId: selectedHotel.parentId, destination: selectedHotel.destination, slug: selectedHotel.slug },
          update: { name: selectedHotel.name, entityType: selectedHotel.entityType, parentId: selectedHotel.parentId, destination: selectedHotel.destination, slug: selectedHotel.slug },
        });
      }
      const partySize = veteranInput ? veteranInput.adults + veteranInput.teens + veteranInput.kids + veteranInput.toddlers : 0;
      const ageSummary = veteranInput ? [veteranInput.adults && `${veteranInput.adults} adults`, veteranInput.teens && `${veteranInput.teens} teens`, veteranInput.kids && `${veteranInput.kids} kids`, veteranInput.toddlers && `${veteranInput.toddlers} toddlers`].filter(Boolean).join(", ") : "";
      return database.trip.create({
        data: {
          userId: user.id,
          name: input.name,
          startDate,
          endDate,
          budgetCents: budgetToCents(input.budget),
          notes: input.notes || null,
          hotelId: selectedHotel?.id ?? null,
          partyProfile: partySize ? { partySize, ages: ageSummary, dietaryNotes: "", accessibilityNotes: "", mustDos: "", avoidList: "" } : undefined,
          dayPlans: {
            create: dates.map((date) => ({ date })),
          },
        },
        select: { id: true },
      });
    });

    return NextResponse.json({ tripId: trip.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Please check the highlighted fields.",
          fieldErrors: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    if (error instanceof Error && (error.message === "Choose a hotel from the list." || error.message === "Refresh the WDW directory before creating a guided trip.")) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    console.error("Failed to create trip", error);
    return NextResponse.json(
      { message: "We couldn't create your trip. Please try again." },
      { status: 500 },
    );
  }
}

function descendantIds(rootId: string, children: Map<string, string[]>) {
  const result = new Set<string>();
  const queue = [...(children.get(rootId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (result.has(id)) continue;
    result.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return result;
}
