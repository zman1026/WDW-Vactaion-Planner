"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import type { ReservationSummary } from "./reservation-center";
import {
  clock,
  entityTypeLabel,
  reservationCategoryLabel,
  timingDescription,
  type PlanItem,
} from "./day-planner-types";

type TimelineEntry =
  | { kind: "plan"; item: PlanItem; index: number }
  | { kind: "reservation"; item: ReservationSummary };

export function DayTimeline({
  tripId,
  items,
  reservations,
  disabled,
  onEdit,
  onMove,
}: {
  tripId: string;
  items: PlanItem[];
  reservations: ReservationSummary[];
  disabled: boolean;
  onEdit: (item: PlanItem) => void;
  onMove: (itemId: string, direction: "up" | "down") => void;
}) {
  return (
    <div className="space-y-4" aria-label="Day timeline">
      {timelineBands(items, reservations).map((band) => band.entries.length > 0 && (
        <section key={band.label} aria-labelledby={`band-${band.label.toLowerCase()}`}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="day-accent-bg size-2 rounded-full" aria-hidden="true" />
            <h3 id={`band-${band.label.toLowerCase()}`} className="text-sm font-bold text-primary">{band.label}</h3>
            <span className="text-[10px] text-muted">{band.range}</span>
          </div>
          <ol className="space-y-1.5">
            {band.entries.map((entry) => entry.kind === "reservation" ? (
              <LegacyReservationRow key={`reservation-${entry.item.id}`} tripId={tripId} item={entry.item} />
            ) : (
              <TimelinePlanItem
                key={entry.item.id}
                item={entry.item}
                index={entry.index}
                itemCount={items.length}
                disabled={disabled}
                onEdit={() => onEdit(entry.item)}
                onMove={(direction) => onMove(entry.item.id, direction)}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function LegacyReservationRow({ tripId, item }: { tripId: string; item: ReservationSummary }) {
  return (
    <li>
      <Link href={`/trips/${tripId}?view=reservations&reservation=${item.id}`} className="grid min-h-14 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-control border border-gold/25 bg-sand/15 px-3 py-2 transition hover:border-gold/50">
        <span className="text-xs font-bold text-gold">{item.startTime ? clock(item.startTime) : "Flexible"}</span>
        <span className="min-w-0">
          <strong className="block truncate text-sm text-primary">{item.title}</strong>
          <span className="block truncate text-[11px] text-muted">Older booking · {reservationCategoryLabel(item.category)}</span>
        </span>
        <span className="text-sm font-semibold text-primary">Edit</span>
      </Link>
    </li>
  );
}

function TimelinePlanItem({ item, index, itemCount, disabled, onEdit, onMove }: {
  item: PlanItem;
  index: number;
  itemCount: number;
  disabled: boolean;
  onEdit: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <li className="group flex items-stretch gap-1.5">
      <button type="button" onClick={onEdit} className="grid min-h-14 min-w-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-control border border-[rgb(var(--day-accent)/.18)] bg-white/70 px-3 py-2 text-left transition hover:border-[rgb(var(--day-accent)/.45)]">
        <span className={`text-xs font-bold ${item.startTime ? "day-accent-text" : "text-muted"}`}>{timingDescription(item)}</span>
        <span className="min-w-0">
          <strong className="block truncate text-sm text-primary">{item.title}</strong>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
            <span>{entityTypeLabel(item.entityType)}</span>
            {item.bookingStatus === "BOOKED" && <Badge tone="success">Booked</Badge>}
            {item.bookingStatus === "WISHLIST" && <span>Still trying</span>}
          </span>
        </span>
        <span className="text-sm font-semibold text-primary">Edit</span>
      </button>
      <div className="hidden shrink-0 items-center gap-1 lg:flex lg:opacity-0 lg:transition lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <button type="button" aria-label={`Move ${item.title} up`} disabled={disabled || index === 0} onClick={() => onMove("up")} className={buttonStyles({ variant: "ghost", size: "sm", className: "w-11 px-0" })}>↑</button>
        <button type="button" aria-label={`Move ${item.title} down`} disabled={disabled || index === itemCount - 1} onClick={() => onMove("down")} className={buttonStyles({ variant: "ghost", size: "sm", className: "w-11 px-0" })}>↓</button>
      </div>
    </li>
  );
}

function timelineBands(items: PlanItem[], reservations: ReservationSummary[]) {
  const entries: TimelineEntry[] = [
    ...items.map((item, index) => ({ kind: "plan" as const, item, index })),
    ...reservations.map((item) => ({ kind: "reservation" as const, item })),
  ];
  const bands = [
    { label: "Morning", range: "Before noon" },
    { label: "Afternoon", range: "Noon to 5 PM" },
    { label: "Evening", range: "After 5 PM" },
    { label: "Flexible", range: "Anytime" },
  ];
  return bands.map((band) => ({
    ...band,
    entries: entries
      .filter((entry) => entryBand(entry) === band.label)
      .sort((a, b) => entrySortKey(a) - entrySortKey(b)),
  }));
}

function entryBand(entry: TimelineEntry) {
  if (entry.kind === "plan" && entry.item.timingType !== "EXACT") {
    if (entry.item.timeOfDay === "MORNING") return "Morning";
    if (entry.item.timeOfDay === "AFTERNOON") return "Afternoon";
    if (entry.item.timeOfDay === "EVENING") return "Evening";
    return "Flexible";
  }
  const startTime = entry.item.startTime;
  if (!startTime) return "Flexible";
  if (startTime < "12:00") return "Morning";
  if (startTime < "17:00") return "Afternoon";
  return "Evening";
}

function entrySortKey(entry: TimelineEntry) {
  const startTime = entry.item.startTime;
  if (startTime) {
    const [hour, minute] = startTime.split(":").map(Number);
    return hour * 60 + minute;
  }
  if (entry.kind === "plan") {
    if (entry.item.timeOfDay === "MORNING") return 8 * 60 + entry.index;
    if (entry.item.timeOfDay === "AFTERNOON") return 13 * 60 + entry.index;
    if (entry.item.timeOfDay === "EVENING") return 18 * 60 + entry.index;
    return 24 * 60 + entry.index;
  }
  return 25 * 60;
}
