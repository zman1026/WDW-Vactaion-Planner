"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eachDayOfInterval, format } from "date-fns";

import { requireCurrentUser } from "@/lib/current-user";
import { assignMustDoSchema, dayPlanItemSchema, itemMutationSchema, mustDoSchema, parkAssignmentSchema, secondaryParkAssignmentSchema, starterTemplateSchema, type DayPlanItemInput } from "@/lib/day-plan-validation";
import { getDescendantEntityIds } from "@/lib/entity-hierarchy";
import { prisma } from "@/lib/prisma";
import { budgetToCents, calendarDateToUtc } from "@/lib/trip-validation";
import { clearDaySchema, companionMutationSchema, companionSchema, copyDaySchema, hotelAssignmentSchema, partyProfileSchema, reservationMutationSchema, reservationSchema, tripIdSchema, updateTripSchema } from "@/lib/trip-management-validation";

export type MutationResult = { success: true; message?: string } | { success: false; message: string };

async function ownedDayPlan(dayPlanId: string) {
  const user = await requireCurrentUser();
  return prisma.dayPlan.findFirst({ where: { id: dayPlanId, trip: { userId: user.id } }, select: { id: true, tripId: true, parkId: true } });
}

export async function updateTrip(input: unknown): Promise<MutationResult> {
  const parsed = updateTripSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the trip details." };
  const user = await requireCurrentUser();
  const trip = await prisma.trip.findFirst({ where: { id: parsed.data.tripId, userId: user.id }, include: { reservations: { select: { date: true, title: true } }, dayPlans: { select: { id: true, date: true, parkId: true, secondaryParkId: true, notes: true, _count: { select: { items: true } } } } } });
  if (!trip) return { success: false, message: "Trip not found." };
  const startDate = calendarDateToUtc(parsed.data.startDate);
  const endDate = calendarDateToUtc(parsed.data.endDate);
  const outside = trip.dayPlans.filter((day) => day.date < startDate || day.date > endDate);
  const plannedOutside = outside.filter((day) => day.parkId || day.secondaryParkId || day.notes || day._count.items > 0);
  if (plannedOutside.length) return { success: false, message: `The new dates exclude planned ${plannedOutside.length === 1 ? "day" : "days"}: ${plannedOutside.map((day) => format(day.date, "MMM d")).join(", ")}. Remove their items, notes, and park assignments before shortening the trip.` };
  const reservationsOutside = trip.reservations.filter((reservation) => reservation.date < startDate || reservation.date > endDate);
  if (reservationsOutside.length) return { success: false, message: `The new dates leave out ${reservationsOutside.length === 1 ? "a reservation" : `${reservationsOutside.length} reservations`}: ${reservationsOutside.slice(0, 3).map((reservation) => reservation.title).join(", ")}. Move or remove ${reservationsOutside.length === 1 ? "it" : "them"} before shortening the trip.` };
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
  const updated = await prisma.trip.updateMany({ where: { id: parsed.data.tripId, userId: user.id }, data: { hotelId: parsed.data.hotelId || null, customHotelName: parsed.data.hotelId ? null : parsed.data.customHotelName || null } });
  if (!updated.count) return { success: false, message: "Trip not found." };
  revalidatePath(`/trips/${parsed.data.tripId}`); revalidatePath(`/share/${parsed.data.tripId}`);
  return { success: true, message: parsed.data.hotelId || parsed.data.customHotelName ? "Hotel selection saved." : "Hotel selection cleared." };
}

export async function saveReservation(input: unknown): Promise<MutationResult> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the reservation details." };
  const user = await requireCurrentUser();
  const trip = await prisma.trip.findFirst({ where: { id: parsed.data.tripId, userId: user.id }, select: { id: true, startDate: true, endDate: true } });
  if (!trip) return { success: false, message: "Trip not found." };
  const requestedDate = calendarDateToUtc(parsed.data.reservationDate);
  const day = parsed.data.dayPlanId
    ? await prisma.dayPlan.findFirst({ where: { id: parsed.data.dayPlanId, tripId: trip.id }, select: { id: true, date: true } })
    : await prisma.dayPlan.findUnique({ where: { tripId_date: { tripId: trip.id, date: requestedDate } }, select: { id: true, date: true } });
  if (parsed.data.dayPlanId && !day) return { success: false, message: "Choose a day from this trip." };
  const date = day?.date ?? requestedDate;
  if (date < trip.startDate || date > trip.endDate) return { success: false, message: "Reservation date must fall within the trip." };
  const data = {
    dayPlanId: day?.id ?? null,
    category: parsed.data.category,
    title: parsed.data.title,
    date,
    startTime: parsed.data.startTime || null,
    endTime: parsed.data.endTime || null,
    status: parsed.data.status,
    confirmationNumber: parsed.data.confirmationNumber || null,
    location: parsed.data.location || null,
    notes: parsed.data.notes || null,
    costCents: parsed.data.estimatedCost === "" ? null : Math.round(Number(parsed.data.estimatedCost) * 100),
    partySize: parsed.data.partySize === "" ? null : Number(parsed.data.partySize),
  };
  if (parsed.data.id) {
    const existing = await prisma.reservation.findFirst({ where: { id: parsed.data.id, tripId: trip.id }, select: { id: true } });
    if (!existing) return { success: false, message: "Reservation not found." };
    await prisma.reservation.update({ where: { id: existing.id }, data });
  } else {
    await prisma.reservation.create({ data: { ...data, tripId: trip.id } });
  }
  revalidatePath(`/trips/${trip.id}`); revalidatePath(`/share/${trip.id}`);
  return { success: true, message: parsed.data.id ? "Reservation updated everywhere." : "Reservation added to your trip day." };
}

export async function removeReservation(input: unknown): Promise<MutationResult> {
  const parsed = reservationMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Reservation not found." };
  const user = await requireCurrentUser();
  const reservation = await prisma.reservation.findFirst({ where: { id: parsed.data.reservationId, trip: { userId: user.id } }, select: { id: true, tripId: true } });
  if (!reservation) return { success: false, message: "Reservation not found." };
  await prisma.reservation.delete({ where: { id: reservation.id } });
  revalidatePath(`/trips/${reservation.tripId}`); revalidatePath(`/share/${reservation.tripId}`);
  return { success: true, message: "Reservation removed." };
}

export async function saveCompanion(input: unknown): Promise<MutationResult> {
  const parsed = companionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the traveler details." };
  const user = await requireCurrentUser();
  const trip = await prisma.trip.findFirst({ where: { id: parsed.data.tripId, userId: user.id }, select: { id: true } });
  if (!trip) return { success: false, message: "Trip not found." };
  const data = { name: parsed.data.name, email: parsed.data.email || null, role: parsed.data.role, rsvp: parsed.data.rsvp };
  if (parsed.data.id) {
    const existing = await prisma.tripCompanion.findFirst({ where: { id: parsed.data.id, tripId: trip.id }, select: { id: true } });
    if (!existing) return { success: false, message: "Traveler not found." };
    await prisma.tripCompanion.update({ where: { id: existing.id }, data });
  } else {
    await prisma.tripCompanion.create({ data: { ...data, tripId: trip.id } });
  }
  revalidatePath(`/trips/${trip.id}`);
  return { success: true, message: parsed.data.id ? "Traveler updated." : "Traveler added to the party." };
}

export async function removeCompanion(input: unknown): Promise<MutationResult> {
  const parsed = companionMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Traveler not found." };
  const user = await requireCurrentUser();
  const companion = await prisma.tripCompanion.findFirst({ where: { id: parsed.data.companionId, trip: { userId: user.id } }, select: { id: true, tripId: true } });
  if (!companion) return { success: false, message: "Traveler not found." };
  await prisma.tripCompanion.delete({ where: { id: companion.id } });
  revalidatePath(`/trips/${companion.tripId}`);
  return { success: true, message: "Traveler removed." };
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
  await prisma.dayPlanItem.createMany({ data: source.items.map((item, index) => ({ dayPlanId: target.id, entityId: item.entityId, entityType: item.entityType, title: item.title, timingType: item.timingType, timeOfDay: item.timeOfDay, startTime: item.startTime, endTime: item.endTime, estimatedCostCents: item.estimatedCostCents, notes: item.notes, bookingStatus: item.bookingStatus === "NONE" ? "NONE" : "WISHLIST", confirmationNumber: null, partySizeOverride: item.partySizeOverride, backupNote: item.backupNote, paidExtraType: item.paidExtraType, sortOrder: (last._max.sortOrder ?? -1) + index + 1 })) });
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
  await prisma.dayPlan.update({ where: { id: dayPlan.id }, data: { parkId: parsed.parkId || null, ...(!parsed.parkId ? { secondaryParkId: null } : {}) } });
  revalidatePath(`/trips/${dayPlan.tripId}`);
}

export async function assignSecondaryPark(input: { dayPlanId: string; secondaryParkId: string | null }) {
  const parsed = secondaryParkAssignmentSchema.parse(input);
  const dayPlan = await ownedDayPlan(parsed.dayPlanId);
  if (!dayPlan) throw new Error("Planning day not found.");
  if (parsed.secondaryParkId && parsed.secondaryParkId === dayPlan.parkId) throw new Error("Choose a different second park.");
  if (parsed.secondaryParkId) {
    const park = await prisma.parkEntity.findFirst({ where: { id: parsed.secondaryParkId, entityType: "PARK" }, select: { id: true } });
    if (!park) throw new Error("Choose a valid second park.");
  }
  await prisma.dayPlan.update({ where: { id: dayPlan.id }, data: { secondaryParkId: parsed.secondaryParkId || null } });
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
  const data = { entityId: parsed.entityId, entityType: parsed.entityType, title: parsed.title, ...timing, estimatedCostCents, notes: parsed.notes, bookingStatus: parsed.bookingStatus, confirmationNumber: parsed.confirmationNumber, partySizeOverride: parsed.partySizeOverride, backupNote: parsed.backupNote, paidExtraType: parsed.paidExtraType };

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

export async function saveMustDo(input: unknown) {
  const parsed = mustDoSchema.parse(input);
  const user = await requireCurrentUser();
  const trip = await prisma.trip.findFirst({ where: { id: parsed.tripId, userId: user.id }, select: { id: true } });
  if (!trip) throw new Error("Trip not found.");
  const data = { title: parsed.title, entityId: parsed.entityId, entityType: parsed.entityType, notes: parsed.notes, priority: parsed.priority };
  if (parsed.id) {
    const existing = await prisma.mustDo.findFirst({ where: { id: parsed.id, tripId: trip.id }, select: { id: true } });
    if (!existing) throw new Error("Must-do not found.");
    await prisma.mustDo.update({ where: { id: existing.id }, data });
  } else {
    await prisma.mustDo.create({ data: { ...data, tripId: trip.id } });
  }
  revalidatePath(`/trips/${trip.id}`);
}

export async function removeMustDo(input: { mustDoId: string }) {
  const { mustDoId } = assignMustDoSchema.pick({ mustDoId: true }).parse(input);
  const user = await requireCurrentUser();
  const mustDo = await prisma.mustDo.findFirst({ where: { id: mustDoId, trip: { userId: user.id } }, select: { id: true, tripId: true } });
  if (!mustDo) throw new Error("Must-do not found.");
  await prisma.mustDo.delete({ where: { id: mustDo.id } });
  revalidatePath(`/trips/${mustDo.tripId}`);
}

export async function assignMustDo(input: unknown) {
  const parsed = assignMustDoSchema.parse(input);
  const user = await requireCurrentUser();
  const mustDo = await prisma.mustDo.findFirst({ where: { id: parsed.mustDoId, trip: { userId: user.id } }, select: { id: true, tripId: true, title: true, entityId: true, entityType: true, notes: true, dayPlanItemId: true } });
  if (!mustDo || mustDo.dayPlanItemId) throw new Error("Must-do is unavailable.");
  const day = await prisma.dayPlan.findFirst({ where: { id: parsed.dayPlanId, tripId: mustDo.tripId, trip: { userId: user.id } }, select: { id: true } });
  if (!day) throw new Error("Planning day not found.");
  const last = await prisma.dayPlanItem.aggregate({ where: { dayPlanId: day.id }, _max: { sortOrder: true } });
  const item = await prisma.dayPlanItem.create({ data: { dayPlanId: day.id, entityId: mustDo.entityId ?? `must-do:${mustDo.id}`, entityType: mustDo.entityType ?? "EXPERIENCE", title: mustDo.title, notes: mustDo.notes, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  await prisma.mustDo.update({ where: { id: mustDo.id }, data: { dayPlanItemId: item.id } });
  revalidatePath(`/trips/${mustDo.tripId}`);
}

const STARTER_NAMES: Array<[RegExp, string[]]> = [
  [/magic kingdom/i, ["Jungle Cruise", "Haunted Mansion", "Pirates of the Caribbean"]],
  [/epcot/i, ["Spaceship Earth", "Living with the Land", "Remy's Ratatouille Adventure"]],
  [/hollywood/i, ["The Twilight Zone Tower of Terror", "Toy Story Mania!", "Mickey & Minnie's Runaway Railway"]],
  [/animal kingdom/i, ["Kilimanjaro Safaris", "Expedition Everest - Legend of the Forbidden Mountain", "Na'vi River Journey"]],
];

export async function applyStarterTemplate(input: unknown) {
  const { dayPlanId } = starterTemplateSchema.parse(input);
  const user = await requireCurrentUser();
  const day = await prisma.dayPlan.findFirst({ where: { id: dayPlanId, trip: { userId: user.id } }, include: { items: { select: { id: true } } } });
  if (!day?.parkId || day.items.length) throw new Error("Starter plans are available for empty park days.");
  const park = await prisma.parkEntity.findFirst({ where: { id: day.parkId, entityType: "PARK" }, select: { name: true } });
  const names = STARTER_NAMES.find(([pattern]) => pattern.test(park?.name ?? ""))?.[1] ?? [];
  const descendantIds = await getDescendantEntityIds(day.parkId);
  const entities = await prisma.parkEntity.findMany({ where: { id: { in: descendantIds }, name: { in: names }, entityType: { in: ["ATTRACTION", "SHOW", "EXPERIENCE"] } }, select: { id: true, name: true, entityType: true } });
  const ordered = names.flatMap((name) => entities.filter((entity) => entity.name === name));
  if (!ordered.length) throw new Error("No starter offerings were found in the current directory. Refresh the directory and try again.");
  await prisma.dayPlanItem.createMany({ data: ordered.map((entity, index) => ({ dayPlanId: day.id, entityId: entity.id, entityType: entity.entityType, title: entity.name, timingType: "TIME_OF_DAY", timeOfDay: index === 0 ? "MORNING" : index === ordered.length - 1 ? "EVENING" : "AFTERNOON", sortOrder: index })) });
  revalidatePath(`/trips/${day.tripId}`);
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
