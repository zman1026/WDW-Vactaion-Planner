import { eachDayOfInterval } from "date-fns";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  budgetToCents,
  calendarDateToUtc,
  createTripSchema,
} from "@/lib/trip-validation";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in to create a trip." }, { status: 401 });
    const payload: unknown = await request.json();
    const input = createTripSchema.parse(payload);
    const startDate = calendarDateToUtc(input.startDate);
    const endDate = calendarDateToUtc(input.endDate);
    const dayPlans = eachDayOfInterval({ start: startDate, end: endDate }).map(
      (date) => ({ date }),
    );

    const trip = await prisma.$transaction(async (database) => {
      return database.trip.create({
        data: {
          userId: user.id,
          name: input.name,
          startDate,
          endDate,
          budgetCents: budgetToCents(input.budget),
          notes: input.notes || null,
          dayPlans: {
            create: dayPlans,
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

    console.error("Failed to create trip", error);
    return NextResponse.json(
      { message: "We couldn't create your trip. Please try again." },
      { status: 500 },
    );
  }
}
