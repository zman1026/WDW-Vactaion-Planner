import { eachDayOfInterval } from "date-fns";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import {
  budgetToCents,
  calendarDateToUtc,
  createTripSchema,
} from "@/lib/trip-validation";

const LOCAL_USER_EMAIL = "local-planner@wdw-planner.local";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const input = createTripSchema.parse(payload);
    const startDate = calendarDateToUtc(input.startDate);
    const endDate = calendarDateToUtc(input.endDate);
    const dayPlans = eachDayOfInterval({ start: startDate, end: endDate }).map(
      (date) => ({ date }),
    );

    const trip = await prisma.$transaction(async (database) => {
      const user = await database.user.upsert({
        where: { email: LOCAL_USER_EMAIL },
        update: {},
        create: {
          email: LOCAL_USER_EMAIL,
          name: "Local Planner",
        },
      });

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
