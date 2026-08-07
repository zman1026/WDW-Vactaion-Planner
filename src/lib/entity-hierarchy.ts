import { prisma } from "@/lib/prisma";

/** Resolve all cached descendants without relying on a fixed ThemeParks nesting depth. */
export async function getDescendantEntityIds(rootId: string) {
  const entities = await prisma.parkEntity.findMany({ select: { id: true, parentId: true } });
  const children = new Map<string, string[]>();
  for (const entity of entities) {
    if (!entity.parentId) continue;
    const siblings = children.get(entity.parentId) ?? [];
    siblings.push(entity.id);
    children.set(entity.parentId, siblings);
  }
  const descendants: string[] = [];
  const queue = [...(children.get(rootId) ?? [])];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    descendants.push(id);
    queue.push(...(children.get(id) ?? []));
  }
  return descendants;
}
