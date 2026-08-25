"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addEntityToDay } from "./actions";

export type ExploreDayOption = {
  id: string;
  tripName: string;
  dayNumber: number;
  dateLabel: string;
  parkName: string | null;
};

export function AddToDay({ entity, days }: { entity: { id: string; name: string; entityType: string }; days: ExploreDayOption[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tripId?: string; dayPlanId?: string; label?: string; error?: string } | null>(null);

  function add(day: ExploreDayOption) {
    setResult(null);
    startTransition(async () => {
      try {
        const value = await addEntityToDay({ dayPlanId: day.id, entityId: entity.id, entityType: entity.entityType, title: entity.name });
        setResult({ tripId: value.tripId, dayPlanId: day.id, label: `Day ${day.dayNumber}` });
      } catch (error) {
        setResult({ error: error instanceof Error ? error.message : "Could not add this item." });
      }
    });
  }

  return (
    <details className="group mt-4 border-t border-border pt-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-primary">
        <span>Add to a day</span><span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>
      {days.length > 0 ? (
        <div className="day-chip-scroller -mx-1 mt-2 overflow-x-auto px-1 pb-2">
          <div className="flex min-w-max gap-2">
            {days.map((day) => (
              <button
                key={day.id}
                type="button"
                disabled={pending}
                onClick={() => add(day)}
                aria-label={`Add ${entity.name} to ${day.tripName}, day ${day.dayNumber}, ${day.parkName || "rest day"}`}
                className="flex min-h-16 w-36 flex-col justify-center rounded-control border border-border bg-surface px-3 text-left shadow-sm transition hover:border-gold/60 hover:bg-sand/15 disabled:opacity-50"
              >
                <span className="truncate text-[10px] font-bold uppercase tracking-wide text-gold">{day.tripName}</span>
                <strong className="mt-0.5 text-xs text-primary">Day {day.dayNumber} · {day.dateLabel}</strong>
                <span className="mt-0.5 truncate text-[11px] text-muted">{day.parkName || "Rest day"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Create a trip first, then add this to one of its days.</p>
      )}
      {pending && <p className="mt-1 text-xs text-muted">Adding…</p>}
      {result?.tripId && result.dayPlanId && <p className="mt-1 text-xs font-semibold text-success">Added to {result.label}. <Link href={`/trips/${result.tripId}?view=day&day=${result.dayPlanId}#day-canvas`} className="underline">Open day</Link></p>}
      {result?.error && <p className="mt-1 text-xs text-danger">{result.error}</p>}
    </details>
  );
}
