import type { CuratedPlanItem } from "@/lib/curated-day-plans";

export type MatchableParkEntity = {
  id: string;
  name: string;
  entityType: string;
};

export function comparableName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/™|®/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchPlanItem(item: CuratedPlanItem, entities: MatchableParkEntity[]) {
  if (!item.matchNames?.length) return null;
  const aliases = item.matchNames.map(comparableName);
  const compatible = entities.filter((entity) => entity.entityType === item.entityType);
  return compatible.find((entity) => aliases.includes(comparableName(entity.name)))
    ?? compatible.find((entity) => {
      const entityName = comparableName(entity.name);
      return aliases.some((alias) => alias.length >= 8 && (entityName.includes(alias) || alias.includes(entityName)));
    })
    ?? null;
}
