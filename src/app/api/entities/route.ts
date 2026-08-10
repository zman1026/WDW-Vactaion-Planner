import { NextRequest, NextResponse } from "next/server";

import { syncParkEntities } from "@/lib/park-entity-sync";
import { prisma } from "@/lib/prisma";
import { getDescendantEntityIds } from "@/lib/entity-hierarchy";

const PICKABLE_TYPES = ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"];

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const type = request.nextUrl.searchParams.get("type")?.toUpperCase();
  const parkId = request.nextUrl.searchParams.get("parkId")?.trim().slice(0, 100) || null;
  const entityType = type && PICKABLE_TYPES.includes(type) ? type : undefined;

  let count = await prisma.parkEntity.count();
  if (count === 0) {
    try {
      await syncParkEntities();
      count = await prisma.parkEntity.count();
    } catch (error) {
      console.error("Automatic entity sync failed", error);
    }
  }

  const parkDescendantIds = parkId ? await getDescendantEntityIds(parkId) : undefined;

  const entities = await prisma.parkEntity.findMany({
    where: {
      entityType: entityType ?? { in: PICKABLE_TYPES },
      ...(parkDescendantIds ? { id: { in: parkDescendantIds } } : {}),
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 250,
    select: { id: true, name: true, entityType: true, parentId: true },
  });

  return NextResponse.json({ entities, cachePopulated: count > 0 });
}
