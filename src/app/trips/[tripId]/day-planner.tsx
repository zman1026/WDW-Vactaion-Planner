"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ParkMark } from "@/components/park-mark";
import { Button } from "@/components/ui/button";
import type { DayThemeId } from "@/lib/day-themes";
import { assignPark, removeDayPlanItem, reorderDayPlanItem, saveDayPlanItem } from "./actions";
import { DayItemSheet } from "./day-item-sheet";
import type { DayActionRunner, DayOption, ParkOption, PickType, PlanItem } from "./day-planner-types";
import { DayTimeline } from "./day-timeline";
import { DayToolsSheet } from "./day-tools-sheet";
import type { MustDoSummary } from "./must-do-board";
import { ParkPickerSheet } from "./park-picker-sheet";
import type { ReservationSummary } from "./reservation-center";

export function DayPlanner({
  tripId,
  dayPlanId,
  dayNumber,
  dateLabel,
  themeId,
  parkId,
  secondaryParkId,
  parks,
  items,
  reservations,
  days,
  mustDos,
  emptyTitle,
  emptyDescription,
  coachingNote,
  initialEditorItemId,
}: {
  tripId: string;
  dayPlanId: string;
  dayNumber: number;
  dateLabel: string;
  themeId: DayThemeId;
  parkId: string | null;
  secondaryParkId: string | null;
  parks: ParkOption[];
  items: PlanItem[];
  reservations: ReservationSummary[];
  days: DayOption[];
  mustDos: MustDoSummary[];
  emptyTitle: string;
  emptyDescription: string;
  coachingNote?: string | null;
  initialEditorItemId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<PlanItem | PickType | null>(items.find((item) => item.id === initialEditorItemId) ?? null);
  const [parkOpen, setParkOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryParkName = parks.find((park) => park.id === parkId)?.name;
  const secondaryParkName = parks.find((park) => park.id === secondaryParkId)?.name;
  const totalCount = items.length + reservations.length;
  const bookedCount = items.filter((item) => item.bookingStatus === "BOOKED").length + reservations.filter((item) => item.status === "CONFIRMED").length;

  const run: DayActionRunner = (action, after) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        after?.();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That change could not be saved.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <header className="day-theme__hero day-planner-hero rounded-card border p-3 shadow-card sm:p-4">
        <div className="flex items-center gap-3">
          <span className="day-accent-text grid size-11 shrink-0 place-items-center rounded-full border border-[rgb(var(--day-accent)/.24)] bg-white/70 shadow-sm">
            <ParkMark theme={themeId} className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="day-accent-text text-[10px] font-bold uppercase tracking-[0.16em]">Day {dayNumber}</p>
            <h2 className="mt-0.5 truncate text-xl font-semibold text-primary">{dateLabel}</h2>
            <p className="mt-0.5 text-xs text-muted">{totalCount ? `${totalCount} planned${bookedCount ? ` · ${bookedCount} booked` : ""}` : "Ready for a little magic"}</p>
          </div>
          {totalCount > 0 && <Button type="button" onClick={() => setEditor("ATTRACTION")} className="day-primary shrink-0 px-4">+ Add</Button>}
          <button type="button" onClick={() => setToolsOpen(true)} aria-label="Day tools" className="grid size-11 shrink-0 place-items-center rounded-control border border-[rgb(var(--day-accent)/.24)] bg-white/70 text-lg tracking-widest text-primary hover:border-[rgb(var(--day-accent)/.5)]">•••</button>
        </div>
        {totalCount > 0 && (
          <button type="button" onClick={() => setParkOpen(true)} className="day-accent-border mt-3 flex min-h-11 w-full items-center gap-2 rounded-control border bg-white/70 px-3 text-left text-sm font-semibold text-primary sm:w-auto">
            <span className="day-accent-bg size-2.5 shrink-0 rounded-full" aria-hidden="true" />
            <span className="truncate">{primaryParkName || "Choose a park"}{secondaryParkName ? ` + ${secondaryParkName}` : ""}</span>
          </button>
        )}
      </header>

      {error && <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      {totalCount === 0 ? (
        <section className="rounded-card border border-dashed border-[rgb(var(--day-accent)/.3)] bg-white/50 px-4 py-6 text-center">
          <h3 className="text-lg font-semibold text-primary">{emptyTitle}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">{emptyDescription}</p>
          <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => setParkOpen(true)} className="day-accent-border min-w-0 bg-white/75 px-3">
              <span className="truncate">{primaryParkName || "Choose a park"}</span>
            </Button>
            <Button type="button" className="day-primary px-3" onClick={() => setEditor("ATTRACTION")}>Add something</Button>
          </div>
        </section>
      ) : (
        <DayTimeline
          tripId={tripId}
          items={items}
          reservations={reservations}
          disabled={isPending}
          onEdit={setEditor}
          onMove={(itemId, direction) => run(() => reorderDayPlanItem({ itemId, direction }))}
        />
      )}

      <ParkPickerSheet
        open={parkOpen}
        parkId={parkId}
        parks={parks}
        disabled={isPending}
        onClose={() => setParkOpen(false)}
        onChoose={(nextParkId) => run(() => assignPark({ dayPlanId, parkId: nextParkId }), () => setParkOpen(false))}
      />

      <DayToolsSheet
        open={toolsOpen}
        tripId={tripId}
        dayPlanId={dayPlanId}
        parkId={parkId}
        secondaryParkId={secondaryParkId}
        parks={parks}
        items={items}
        reservations={reservations}
        days={days}
        mustDos={mustDos}
        coachingNote={coachingNote}
        isPending={isPending}
        onClose={() => setToolsOpen(false)}
        run={run}
      />

      <DayItemSheet
        editor={editor}
        dayPlanId={dayPlanId}
        parkId={parkId}
        isPending={isPending}
        onClose={() => setEditor(null)}
        onSave={(input) => run(() => saveDayPlanItem(input), () => setEditor(null))}
        onRemove={(item) => {
          if (window.confirm(`Remove “${item.title}” from this day?`)) run(() => removeDayPlanItem({ itemId: item.id }), () => setEditor(null));
        }}
      />
    </div>
  );
}
