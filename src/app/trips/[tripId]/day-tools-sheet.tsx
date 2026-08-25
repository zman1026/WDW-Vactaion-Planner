"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  applyStarterTemplate,
  assignSecondaryPark,
  clearDay,
  copyDay,
  saveDayPlanItem,
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
  onClose,
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
  onClose: () => void;
  run: DayActionRunner;
}) {
  const [copyTarget, setCopyTarget] = useState("");
  const openMustDos = mustDos.filter((item) => !item.dayPlanItemId).length;
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
    <Modal open={open} title="Day tools" onClose={onClose}>
      <div className="space-y-5">
        <details className="group rounded-control border border-border bg-parchment/40">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary">
            <span>Must-dos{openMustDos ? ` (${openMustDos})` : ""}</span>
            <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
          </summary>
          <div className="border-t border-border p-2"><MustDoBoard tripId={tripId} mustDos={mustDos} days={days} activeDayId={dayPlanId} compact /></div>
        </details>

        <section>
          <h3 className="text-sm font-semibold text-primary">Park hopper</h3>
          <p className="mt-1 text-xs text-muted">Optional: add a second park after your main park.</p>
          <Select className="mt-2" value={secondaryParkId ?? ""} disabled={isPending || !parkId} onChange={(event) => run(() => assignSecondaryPark({ dayPlanId, secondaryParkId: event.target.value || null }))}>
            <option value="">No second park</option>
            {parks.filter((park) => park.id !== parkId).map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}
          </Select>
        </section>

        {parkId && items.length === 0 && (
          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-primary">Starter plan</h3>
            <p className="mt-1 text-xs text-muted">Add a few gentle suggestions for this park.</p>
            <Button type="button" variant="secondary" className="mt-3 w-full" disabled={isPending} onClick={() => run(() => applyStarterTemplate({ dayPlanId }), onClose)}>Add starter plan</Button>
          </section>
        )}

        <section className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-primary">Timing check</h3>
          <div className="mt-2"><TimingHelper parkId={parkId} items={timingItems} coachingNote={coachingNote} /></div>
        </section>

        <section className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-primary">Suggested day</h3>
          <div className="mt-2">
            <AiSuggestions
              tripId={tripId}
              dayPlanId={dayPlanId}
              hasPark={Boolean(parkId)}
              disabled={isPending}
              onApply={(suggestions) => run(async () => {
                for (const item of suggestions) {
                  await saveDayPlanItem({
                    dayPlanId,
                    entityId: item.entityId,
                    entityType: item.entityType,
                    title: item.title,
                    timingType: "EXACT",
                    timeOfDay: "",
                    startTime: item.startTime,
                    endTime: item.endTime,
                    estimatedCost: (item.estimatedCostCents / 100).toFixed(2),
                    notes: item.notes,
                    bookingStatus: item.entityType === "RESTAURANT" ? "WISHLIST" : "NONE",
                    confirmationNumber: "",
                    partySizeOverride: "",
                    backupNote: "",
                    paidExtraType: "",
                  });
                }
              })}
            />
          </div>
        </section>

        {items.length > 0 && (
          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-primary">Copy or clear</h3>
            <div className="mt-3 space-y-2">
              <Select value={copyTarget} onChange={(event) => setCopyTarget(event.target.value)} disabled={isPending}>
                <option value="">Copy this day to…</option>
                {days.filter((day) => day.id !== dayPlanId).map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
              </Select>
              <Button type="button" variant="secondary" className="w-full" disabled={isPending || !copyTarget} onClick={() => run(() => copyDay({ sourceDayPlanId: dayPlanId, targetDayPlanId: copyTarget }), () => setCopyTarget(""))}>Copy items</Button>
              <Button type="button" variant="danger" className="w-full" disabled={isPending} onClick={() => { if (window.confirm("Remove every planned item from this day? Older booking records will stay in place.")) run(() => clearDay({ dayPlanId }), onClose); }}>Clear this day</Button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
