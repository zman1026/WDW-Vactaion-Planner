"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const addEntitySchema = z.object({
  dayPlanId: z.string().cuid(),
  entityId: z.string().min(1).max(150),
  entityType: z.enum(["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"]),
  title: z.string().trim().min(1).max(150),
});

export async function addEntityToDay(input: unknown) {
  const parsed = addEntitySchema.parse(input);
  const user = await requireCurrentUser();
  const [day, entity] = await Promise.all([
    prisma.dayPlan.findFirst({ where: { id: parsed.dayPlanId, trip: { userId: user.id } }, select: { id: true, tripId: true } }),
    prisma.parkEntity.findFirst({ where: { id: parsed.entityId, entityType: parsed.entityType }, select: { id: true, name: true } }),
  ]);
  if (!day || !entity) throw new Error("That trip day or offering is unavailable.");
  const last = await prisma.dayPlanItem.aggregate({ where: { dayPlanId: day.id }, _max: { sortOrder: true } });
  await prisma.dayPlanItem.create({ data: { dayPlanId: day.id, entityId: entity.id, entityType: parsed.entityType, title: entity.name, bookingStatus: parsed.entityType === "RESTAURANT" ? "WISHLIST" : "NONE", sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  revalidatePath(`/trips/${day.tripId}`);
  return { tripId: day.tripId };
}
