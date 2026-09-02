"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  addSuggestedDayItems,
  applyStarterTemplate,
  assignSecondaryPark,
  clearDay,
  copyDay,
} from "./actions";
import { AiSuggestions } from "./ai-suggestions";
import type { DayActionRunner, DayOption, ParkOption, PlanItem } from "./day-planner-types";
import { MustDoBoard, type MustDoSummary } from "./must-do-board";
import type { ReservationSummary } from "./reservation-center";
import { TimingHelper } from "./timing-helper";

export function DayToolsSheet({
  open,
  tripId,
  dayPlanId,
  parkId,
  secondaryParkId,
  parks,
  items,
  reservations,
  days,
  mustDos,
  coachingNote,
  isPending,
  error,
  onClose,
  onChoosePark,
  run,
}: {
  open: boolean;
  tripId: string;
  dayPlanId: string;
  parkId: string | null;
  secondaryParkId: string | null;
  parks: ParkOption[];
  items: PlanItem[];
  reservations: ReservationSummary[];
  days: DayOption[];
  mustDos: MustDoSummary[];
  coachingNote?: string | null;
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onChoosePark: () => void;
  run: DayActionRunner;
}) {
  const [copyTarget, setCopyTarget] = useState("");
  const openMustDos = mustDos.filter((item) => !item.dayPlanItemId).length;
  const primaryParkName = parks.find((park) => park.id === parkId)?.name;
  const timingItems = [
    ...items,
    ...reservations.map((item) => ({
      id: `reservation-${item.id}`,
      entityId: `reservation-${item.id}`,
      title: item.title,
      timingType: item.startTime ? "EXACT" : "FLEXIBLE",
      startTime: item.startTime,
      endTime: item.endTime,
    })),
  ];

  return (
    <Modal open={open} title="Day tools" onClose={onClose} size="compact">
      <p className="-mt-2 mb-4 text-sm leading-relaxed text-muted">Optional help for this day. Your timeline stays unchanged until you choose to add or save something.</p>
      {error && <p role="alert" className="mb-4 rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="space-y-3">
        <details className="group rounded-control border border-border bg-parchment/40">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary">
            <span>Must-dos{openMustDos ? ` (${openMustDos})` : ""}</span>
            <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
          </summary>
          <div className="border-t border-border p-2"><MustDoBoard tripId={tripId} mustDos={mustDos} days={days} activeDayId={dayPlanId} compact /></div>
        </details>

        {!parkId ? (
          <section className="day-theme__hero rounded-card border border-[rgb(var(--day-accent)/.28)] p-4 text-center">
            <span className="day-accent-text mx-auto grid size-10 place-items-center rounded-full border border-[rgb(var(--day-accent)/.22)] bg-white/70 text-lg" aria-hidden="true">✦</span>
            <h3 className="mt-3 font-semibold text-primary">Choose a park first</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">Suggested plans, park hours, and Park Hopper all need to know where you’re going.</p>
            <Button type="button" className="day-primary mt-4 w-full" onClick={onChoosePark}>Choose a park</Button>
          </section>
        ) : (
          <>
            <section className="day-theme__hero rounded-card border border-[rgb(var(--day-accent)/.28)] p-4">
              <p className="day-accent-text text-[10px] font-bold uppercase tracking-[0.16em]">A little planning magic</p>
              <h3 className="mt-1 text-lg font-semibold text-primary">Build a {primaryParkName} day</h3>
              <p className="mt-1 mb-3 text-sm leading-relaxed text-muted">Get a balanced starting plan using your saved party preferences and the park directory.</p>
            <AiSuggestions
              tripId={tripId}
              dayPlanId={dayPlanId}
              disabled={isPending}
              onApply={(suggestions) => run(() => addSuggestedDayItems({ dayPlanId, items: suggestions }), onClose)}
            />
            </section>

            <details className="group rounded-control border border-border bg-parchment/40">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary">
                <span>Park Hopper</span>
                <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="border-t border-border p-3">
                <p className="text-xs text-muted">Add an optional second park after {primaryParkName}.</p>
                <Select className="mt-2" value={secondaryParkId ?? ""} disabled={isPending} onChange={(event) => run(() => assignSecondaryPark({ dayPlanId, secondaryParkId: event.target.value || null }))}>
                  <option value="">No second park</option>
                  {parks.filter((park) => park.id !== parkId).map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}
                </Select>
              </div>
            </details>

            <details className="group rounded-control border border-border bg-parchment/40">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary">
                <span>Check timing</span>
                <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="border-t border-border p-3"><TimingHelper parkId={parkId} items={timingItems} coachingNote={coachingNote} /></div>
            </details>

            {items.length === 0 && (
              <details className="group rounded-control border border-border bg-parchment/40">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary">
                  <span>Quick starter plan</span>
                  <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
                </summary>
                <div className="border-t border-border p-3">
                  <p className="text-xs text-muted">Add a few flexible favorites without building a full suggested day.</p>
                  <Button type="button" variant="secondary" className="mt-3 w-full" disabled={isPending} onClick={() => run(() => applyStarterTemplate({ dayPlanId }), onClose)}>Add starter plan</Button>
                </div>
              </details>
            )}
          </>
        )}

        {items.length > 0 && (
          <details className="group rounded-control border border-border bg-parchment/40">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary">
              <span>Copy or clear this day</span>
              <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="space-y-2 border-t border-border p-3">
              <Select value={copyTarget} onChange={(event) => setCopyTarget(event.target.value)} disabled={isPending}>
                <option value="">Copy this day to…</option>
                {days.filter((day) => day.id !== dayPlanId).map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
              </Select>
              <Button type="button" variant="secondary" className="w-full" disabled={isPending || !copyTarget} onClick={() => run(() => copyDay({ sourceDayPlanId: dayPlanId, targetDayPlanId: copyTarget }), () => setCopyTarget(""))}>Copy items</Button>
              <Button type="button" variant="danger" className="w-full" disabled={isPending} onClick={() => { if (window.confirm("Remove every planned item from this day? Older booking records will stay in place.")) run(() => clearDay({ dayPlanId }), onClose); }}>Clear this day</Button>
            </div>
          </details>
        )}
      </div>
    </Modal>
  );
}
