import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getWDWHierarchy, WDW_DESTINATION_ID } from "@/lib/themeparks";
import { WDW_HOTELS } from "@/lib/wdw-hotels";

const BATCH_SIZE = 100;

export async function syncParkEntities() {
  let hierarchy: Awaited<ReturnType<typeof getWDWHierarchy>> = [];
  let liveDirectoryAvailable = true;
  try {
    hierarchy = await getWDWHierarchy();
  } catch (error) {
    liveDirectoryAvailable = false;
    console.error("Live WDW directory unavailable; refreshing the bundled hotel catalog instead.", error);
  }
  const upstreamHasHotels = hierarchy.some((entity) => entity.entityType === "HOTEL");
  const entities = upstreamHasHotels ? hierarchy : [...hierarchy, ...WDW_HOTELS];
  const syncedAt = new Date();

  for (let offset = 0; offset < entities.length; offset += BATCH_SIZE) {
    const batch = entities.slice(offset, offset + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((entity) => {
        const rawData = JSON.parse(JSON.stringify(entity)) as Prisma.InputJsonValue;
        const data = {
          name: entity.name,
          entityType: entity.entityType,
          parentId: typeof entity.parentId === "string" ? entity.parentId : null,
          destination: WDW_DESTINATION_ID,
          slug: typeof entity.slug === "string" ? entity.slug : null,
          location: entity.location ? JSON.stringify(entity.location) : null,
          description: typeof entity.description === "string" ? entity.description : null,
          rawData,
          lastSynced: syncedAt,
        };

        return prisma.parkEntity.upsert({
          where: { id: entity.id },
          update: data,
          create: { id: entity.id, ...data },
        });
      }),
    );
  }

  return {
    count: entities.length,
    hotelCount: entities.filter((entity) => entity.entityType === "HOTEL").length,
    syncedAt,
    mode: liveDirectoryAvailable ? "live" : "hotel-fallback",
    warning: liveDirectoryAvailable ? null : "The resort catalog is ready. Live park listings could not be refreshed yet.",
  };
}
