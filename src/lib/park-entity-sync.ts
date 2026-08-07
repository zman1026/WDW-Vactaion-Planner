import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getWDWHierarchy, WDW_DESTINATION_ID } from "@/lib/themeparks";

const BATCH_SIZE = 100;

export async function syncParkEntities() {
  const entities = await getWDWHierarchy();
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

  return { count: entities.length, syncedAt };
}
