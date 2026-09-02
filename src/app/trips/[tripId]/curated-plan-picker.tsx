"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getCuratedPlans } from "@/lib/curated-day-plans";
import type { DayThemeId } from "@/lib/day-themes";

const TIME_LABELS = { MORNING: "Morning", AFTERNOON: "Afternoon", EVENING: "Evening" } as const;

export function CuratedPlanPicker({
  themeId,
  hasItems,
  disabled,
  onApply,
}: {
  themeId: DayThemeId;
  hasItems: boolean;
  disabled: boolean;
  onApply: (planId: string) => void;
}) {
  const plans = useMemo(() => getCuratedPlans(themeId), [themeId]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plans.find((plan) => plan.id === selectedId);

  if (!plans.length) return null;

  if (selected) {
    return (
      <div>
        <button
          type="button"
          className="mb-3 min-h-11 text-sm font-semibold text-primary underline decoration-border underline-offset-4"
          onClick={() => setSelectedId(null)}
        >
          ← See all plans
        </button>
        <div className="rounded-control border border-[rgb(var(--day-accent)/.3)] bg-white/75 p-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
            <span className="rounded-full bg-parchment px-2 py-1">{selected.bestFor}</span>
            <span className="rounded-full bg-parchment px-2 py-1">{selected.pace}</span>
            <span className="rounded-full bg-parchment px-2 py-1">{selected.items.length} stops</span>
          </div>
          <h4 className="mt-3 text-lg font-semibold text-primary">{selected.title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted">{selected.description}</p>
          <ol className="mt-4 space-y-2 border-l-2 border-[rgb(var(--day-accent)/.25)] pl-3">
            {selected.items.map((item, index) => (
              <li key={`${item.title}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                <span className="font-medium text-primary">{item.title}</span>
                <span className="shrink-0 text-xs text-muted">{TIME_LABELS[item.timing]}</span>
              </li>
            ))}
          </ol>
        </div>
        <Button type="button" className="day-primary mt-3 w-full" disabled={disabled} onClick={() => onApply(selected.id)}>
          {hasItems ? "Add missing stops" : "Use this plan"}
        </Button>
        <p className="mt-2 text-center text-xs leading-relaxed text-muted">
          {hasItems ? "Your current plans stay put. Only new stops are added." : "Everything stays editable after it is added."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plans.map((plan) => (
        <button
          key={plan.id}
          type="button"
          className="min-h-16 w-full rounded-control border border-border bg-white/75 px-3 py-3 text-left transition hover:border-[rgb(var(--day-accent)/.45)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--day-accent))]"
          onClick={() => setSelectedId(plan.id)}
        >
          <span className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-primary">{plan.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">{plan.description}</span>
            </span>
            <span className="day-accent-text shrink-0 pt-1" aria-hidden="true">›</span>
          </span>
          <span className="mt-2 flex flex-wrap gap-x-3 text-[11px] font-semibold text-muted">
            <span>{plan.bestFor}</span>
            <span>{plan.pace}</span>
            <span>{plan.items.length} stops</span>
          </span>
        </button>
      ))}
    </div>
  );
}
