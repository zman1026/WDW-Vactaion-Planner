import { format } from "date-fns";
import Link from "next/link";
import { ParkMark } from "@/components/park-mark";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { TripProgressMeter } from "@/components/ui/trip-progress";
import { resolveDayTheme } from "@/lib/day-themes";
import type { TripProgress } from "@/lib/trip-progress";

type OverviewItem = {
  entityType: string;
  title: string;
  timingType: string;
  startTime: string | null;
  bookingStatus: string;
};

type OverviewDay = {
  id: string;
  date: Date;
  parkName: string | null;
  secondaryParkName: string | null;
  notes: string | null;
  reservationCount: number;
  items: OverviewItem[];
};

export function TripOverview({
  tripId,
  days,
  hotelName,
  reservationCount,
  openReservationCount,
  progress,
  mustDos,
}: {
  tripId: string;
  days: OverviewDay[];
  hotelName: string | null;
  reservationCount: number;
  openReservationCount: number;
  progress: TripProgress;
  mustDos: Array<{ dayPlanItemId: string | null }>;
}) {
  const unplacedMustDos = mustDos.filter((item) => !item.dayPlanItemId).length;
  const openDays = days.filter((day) => !day.parkName && !day.notes?.trim() && day.items.length === 0);
  const attention = [
    openDays.length > 0 && {
      label: `${openDays.length} open day${openDays.length === 1 ? "" : "s"}`,
      help: "Choose a park or leave it as a rest day.",
      href: dayHref(tripId, openDays[0].id),
    },
    openReservationCount > 0 && {
      label: `${openReservationCount} booking${openReservationCount === 1 ? "" : "s"} need attention`,
      help: "Finish the missing booking details.",
      href: `/trips/${tripId}?view=reservations`,
    },
    unplacedMustDos > 0 && {
      label: `${unplacedMustDos} must-do${unplacedMustDos === 1 ? "" : "s"} not placed`,
      help: "Open a day and place your priorities.",
      href: dayHref(tripId, days[0]?.id),
    },
  ].filter(Boolean) as Array<{ label: string; help: string; href: string }>;

  return (
    <div className="space-y-5">
      <section aria-labelledby="days-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Your trip</p>
            <h2 id="days-title" className="mt-1 text-2xl font-semibold text-primary">Choose a day</h2>
          </div>
          <p className="text-xs text-muted">Tap to plan</p>
        </div>
        <ol className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {days.map((day, index) => (
            <RoadmapDay key={day.id} tripId={tripId} day={day} index={index} hotelName={hotelName} />
          ))}
        </ol>
      </section>

      <section className="rounded-card border border-border bg-surface p-4 shadow-card" aria-label="Trip progress">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <TripProgressMeter progress={progress} compact />
            <p className="mt-2 text-xs text-muted">Next: {progress.nextAction.title}</p>
          </div>
          <Link
            href={progress.nextAction.dayId ? dayHref(tripId, progress.nextAction.dayId) : dayHref(tripId, days[0]?.id)}
            className={buttonStyles({ className: "w-full sm:w-auto" })}
          >
            Continue
          </Link>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface px-4 py-3 text-sm shadow-card">
        <span><strong className="text-primary">{reservationCount}</strong> booked item{reservationCount === 1 ? "" : "s"}</span>
        <Link href={`/trips/${tripId}?view=reservations`} className="min-h-11 content-center font-semibold text-primary hover:text-gold">View bookings</Link>
      </div>

      {attention.length > 0 && (
        <details className="group rounded-card border border-border bg-surface shadow-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-primary">
            <span>Trip to-dos</span>
            <span className="flex items-center gap-2"><Badge>{attention.length}</Badge><span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span></span>
          </summary>
          <ul className="space-y-2 border-t border-border p-3">
            {attention.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="block min-h-11 rounded-control px-3 py-2 hover:bg-parchment">
                  <span className="block text-sm font-semibold text-primary">{item.label}</span>
                  <span className="block text-xs text-muted">{item.help}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RoadmapDay({ tripId, day, index, hotelName }: { tripId: string; day: OverviewDay; index: number; hotelName: string | null }) {
  const theme = resolveDayTheme({ parkName: day.parkName, hotelName });
  const total = day.items.length + day.reservationCount;
  const label = day.parkName || (hotelName ? "Resort / rest" : "Open day");

  return (
    <li className="min-w-0">
      <Link
        href={dayHref(tripId, day.id)}
        data-theme={theme.id}
        data-pattern={theme.pattern}
        className="day-theme day-theme__hero group flex min-h-28 flex-col rounded-card border p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="day-accent-text text-[9px] font-bold uppercase tracking-[0.14em]">Day {index + 1}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted">{format(day.date, "EEE, MMM d")}</p>
          </div>
          <span className="day-accent-text grid size-8 shrink-0 place-items-center rounded-full border border-[rgb(var(--day-accent)/.2)] bg-white/60">
            <ParkMark theme={theme.id} className="size-5" />
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-primary">{label}</h3>
        {day.secondaryParkName && <p className="mt-1 truncate text-[10px] text-muted">Then {day.secondaryParkName}</p>}
        <p className="mt-auto pt-3 text-[11px] font-semibold text-muted">{total ? `${total} planned` : "Nothing yet"}</p>
      </Link>
    </li>
  );
}

function dayHref(tripId: string, dayId?: string) {
  return `/trips/${tripId}?view=day${dayId ? `&day=${dayId}` : ""}#day-canvas`;
}
