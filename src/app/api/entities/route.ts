import { NextRequest, NextResponse } from "next/server";

import { syncParkEntities } from "@/lib/park-entity-sync";
import { prisma } from "@/lib/prisma";

const PICKABLE_TYPES = ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"];

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const type = request.nextUrl.searchParams.get("type")?.toUpperCase();
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

  const entities = await prisma.parkEntity.findMany({
    where: {
      entityType: entityType ?? { in: PICKABLE_TYPES },
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 30,
    select: { id: true, name: true, entityType: true, parentId: true },
  });

  return NextResponse.json({ entities, cachePopulated: count > 0 });
}
