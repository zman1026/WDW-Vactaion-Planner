"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/current-user";
import { dayPlanItemSchema, itemMutationSchema, parkAssignmentSchema, type DayPlanItemInput } from "@/lib/day-plan-validation";
import { prisma } from "@/lib/prisma";

async function ownedDayPlan(dayPlanId: string) {
  const user = await requireCurrentUser();
  return prisma.dayPlan.findFirst({ where: { id: dayPlanId, trip: { userId: user.id } }, select: { id: true, tripId: true } });
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
  const data = { entityId: parsed.entityId, entityType: parsed.entityType, title: parsed.title, startTime: parsed.startTime, endTime: parsed.endTime, estimatedCostCents, notes: parsed.notes };

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
