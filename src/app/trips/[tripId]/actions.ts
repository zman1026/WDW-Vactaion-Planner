"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eachDayOfInterval, format } from "date-fns";

import { requireCurrentUser } from "@/lib/current-user";
import { dayPlanItemSchema, itemMutationSchema, parkAssignmentSchema, type DayPlanItemInput } from "@/lib/day-plan-validation";
import { prisma } from "@/lib/prisma";
import { budgetToCents, calendarDateToUtc } from "@/lib/trip-validation";
import { clearDaySchema, copyDaySchema, hotelAssignmentSchema, partyProfileSchema, tripIdSchema, updateTripSchema } from "@/lib/trip-management-validation";

export type MutationResult = { success: true; message?: string } | { success: false; message: string };

async function ownedDayPlan(dayPlanId: string) {
  const user = await requireCurrentUser();
  return prisma.dayPlan.findFirst({ where: { id: dayPlanId, trip: { userId: user.id } }, select: { id: true, tripId: true } });
}

export async function updateTrip(input: unknown): Promise<MutationResult> {
  const parsed = updateTripSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the trip details." };
  const user = await requireCurrentUser();
  const trip = await prisma.trip.findFirst({ where: { id: parsed.data.tripId, userId: user.id }, include: { dayPlans: { select: { id: true, date: true, parkId: true, notes: true, _count: { select: { items: true } } } } } });
  if (!trip) return { success: false, message: "Trip not found." };
  const startDate = calendarDateToUtc(parsed.data.startDate);
  const endDate = calendarDateToUtc(parsed.data.endDate);
  const outside = trip.dayPlans.filter((day) => day.date < startDate || day.date > endDate);
  const plannedOutside = outside.filter((day) => day.parkId || day.notes || day._count.items > 0);
  if (plannedOutside.length) return { success: false, message: `The new dates exclude planned ${plannedOutside.length === 1 ? "day" : "days"}: ${plannedOutside.map((day) => format(day.date, "MMM d")).join(", ")}. Remove their items, notes, and park assignments before shortening the trip.` };
  const desiredDates = eachDayOfInterval({ start: startDate, end: endDate });
  const existingDates = new Set(trip.dayPlans.map((day) => day.date.toISOString().slice(0, 10)));
  await prisma.$transaction([
    prisma.trip.update({ where: { id: trip.id }, data: { name: parsed.data.name, startDate, endDate, budgetCents: budgetToCents(parsed.data.budget), notes: parsed.data.notes || null } }),
    prisma.dayPlan.deleteMany({ where: { id: { in: outside.map((day) => day.id) } } }),
    ...desiredDates.filter((date) => !existingDates.has(date.toISOString().slice(0, 10))).map((date) => prisma.dayPlan.create({ data: { tripId: trip.id, date } })),
  ]);
  revalidatePath("/trips"); revalidatePath(`/trips/${trip.id}`); revalidatePath(`/share/${trip.id}`);
  return { success: true, message: "Trip details saved." };
}

export async function deleteTrip(input: unknown) {
  const { tripId } = tripIdSchema.parse(input);
  const user = await requireCurrentUser();
  const deleted = await prisma.trip.deleteMany({ where: { id: tripId, userId: user.id } });
  if (!deleted.count) throw new Error("Trip not found.");
  revalidatePath("/trips");
  redirect("/trips");
}

export async function assignHotel(input: unknown): Promise<MutationResult> {
  const parsed = hotelAssignmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Choose a valid hotel." };
  const user = await requireCurrentUser();
  if (parsed.data.hotelId) {
    const hotel = await prisma.parkEntity.findFirst({ where: { id: parsed.data.hotelId, entityType: "HOTEL" }, select: { id: true } });
    if (!hotel) return { success: false, message: "Choose a hotel from the WDW directory." };
  }
  const updated = await prisma.trip.updateMany({ where: { id: parsed.data.tripId, userId: user.id }, data: { hotelId: parsed.data.hotelId || null } });
  if (!updated.count) return { success: false, message: "Trip not found." };
  revalidatePath(`/trips/${parsed.data.tripId}`); revalidatePath(`/share/${parsed.data.tripId}`);
  return { success: true, message: "Hotel selection saved." };
}

export async function updatePartyProfile(input: unknown): Promise<MutationResult> {
  const parsed = partyProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the party details." };
  const user = await requireCurrentUser();
  const { tripId, ...profile } = parsed.data;
  const updated = await prisma.trip.updateMany({ where: { id: tripId, userId: user.id }, data: { partyProfile: profile } });
  if (!updated.count) return { success: false, message: "Trip not found." };
  revalidatePath(`/trips/${tripId}`); revalidatePath(`/share/${tripId}`);
  return { success: true, message: "Party profile saved." };
}

export async function clearDay(input: unknown) {
  const { dayPlanId } = clearDaySchema.parse(input);
  const day = await ownedDayPlan(dayPlanId);
  if (!day) throw new Error("Planning day not found.");
  await prisma.$transaction([
    prisma.dayPlanItem.deleteMany({ where: { dayPlanId: day.id } }),
    prisma.dayPlan.update({ where: { id: day.id }, data: { notes: null } }),
  ]);
  revalidatePath(`/trips/${day.tripId}`);
}

export async function copyDay(input: unknown) {
  const parsed = copyDaySchema.parse(input);
  const user = await requireCurrentUser();
  const source = await prisma.dayPlan.findFirst({ where: { id: parsed.sourceDayPlanId, trip: { userId: user.id } }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!source) throw new Error("Source day not found.");
  const target = await prisma.dayPlan.findFirst({ where: { id: parsed.targetDayPlanId, tripId: source.tripId, trip: { userId: user.id } }, select: { id: true } });
  if (!target) throw new Error("Target day not found.");
  const last = await prisma.dayPlanItem.aggregate({ where: { dayPlanId: target.id }, _max: { sortOrder: true } });
  await prisma.dayPlanItem.createMany({ data: source.items.map((item, index) => ({ dayPlanId: target.id, entityId: item.entityId, entityType: item.entityType, title: item.title, timingType: item.timingType, timeOfDay: item.timeOfDay, startTime: item.startTime, endTime: item.endTime, estimatedCostCents: item.estimatedCostCents, notes: item.notes, sortOrder: (last._max.sortOrder ?? -1) + index + 1 })) });
  revalidatePath(`/trips/${source.tripId}`);
}

export async function assignPark(input: { dayPlanId: string; parkId: string | null }) {
  const parsed = parkAssignmentSchema.parse(input);
  const dayPlan = await ownedDayPlan(parsed.dayPlanId);
  if (!dayPlan) throw new Error("Planning day not found.");
  if (parsed.parkId) {
    const park = await prisma.parkEntity.findFirst({ where: { id: parsed.parkId, entityType: "PARK" }, select: { id: true } });
    if (!park) throw new Error("Choose a valid park.");
  }
  await prisma.dayPlan.update({ where: { id: dayPlan.id }, data: { parkId: parsed.parkId || null } });
  revalidatePath(`/trips/${dayPlan.tripId}`);
}

export async function saveDayPlanItem(input: DayPlanItemInput) {
  const parsed = dayPlanItemSchema.parse(input);
  const dayPlan = await ownedDayPlan(parsed.dayPlanId);
  if (!dayPlan) throw new Error("Planning day not found.");
  const estimatedCostCents = parsed.estimatedCost === "" ? null : Math.round(Number(parsed.estimatedCost) * 100);
  const timing = parsed.timingType === "EXACT"
    ? { timingType: parsed.timingType, timeOfDay: null, startTime: parsed.startTime, endTime: parsed.endTime }
    : parsed.timingType === "TIME_OF_DAY"
      ? { timingType: parsed.timingType, timeOfDay: parsed.timeOfDay, startTime: null, endTime: null }
      : { timingType: parsed.timingType, timeOfDay: null, startTime: null, endTime: null };
  const data = { entityId: parsed.entityId, entityType: parsed.entityType, title: parsed.title, ...timing, estimatedCostCents, notes: parsed.notes };

  if (parsed.id) {
    const existing = await prisma.dayPlanItem.findFirst({ where: { id: parsed.id, dayPlanId: dayPlan.id }, select: { id: true } });
    if (!existing) throw new Error("Plan item not found.");
    await prisma.dayPlanItem.update({ where: { id: existing.id }, data });
  } else {
    const last = await prisma.dayPlanItem.aggregate({ where: { dayPlanId: dayPlan.id }, _max: { sortOrder: true } });
    await prisma.dayPlanItem.create({ data: { ...data, dayPlanId: dayPlan.id, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  revalidatePath(`/trips/${dayPlan.tripId}`);
}

export async function removeDayPlanItem(input: { itemId: string }) {
  const { itemId } = itemMutationSchema.pick({ itemId: true }).parse(input);
  const user = await requireCurrentUser();
  const item = await prisma.dayPlanItem.findFirst({ where: { id: itemId, dayPlan: { trip: { userId: user.id } } }, select: { id: true, dayPlan: { select: { tripId: true } } } });
  if (!item) throw new Error("Plan item not found.");
  await prisma.dayPlanItem.delete({ where: { id: item.id } });
  revalidatePath(`/trips/${item.dayPlan.tripId}`);
}

export async function reorderDayPlanItem(input: { itemId: string; direction: "up" | "down" }) {
  const parsed = itemMutationSchema.required({ direction: true }).parse(input);
  const user = await requireCurrentUser();
  const item = await prisma.dayPlanItem.findFirst({ where: { id: parsed.itemId, dayPlan: { trip: { userId: user.id } } }, include: { dayPlan: { select: { tripId: true } } } });
  if (!item) throw new Error("Plan item not found.");
  const neighbor = await prisma.dayPlanItem.findFirst({
    where: { dayPlanId: item.dayPlanId, sortOrder: parsed.direction === "up" ? { lt: item.sortOrder } : { gt: item.sortOrder } },
    orderBy: { sortOrder: parsed.direction === "up" ? "desc" : "asc" },
  });
  if (neighbor) {
    await prisma.$transaction([
      prisma.dayPlanItem.update({ where: { id: item.id }, data: { sortOrder: neighbor.sortOrder } }),
      prisma.dayPlanItem.update({ where: { id: neighbor.id }, data: { sortOrder: item.sortOrder } }),
    ]);
  }
  revalidatePath(`/trips/${item.dayPlan.tripId}`);
}
