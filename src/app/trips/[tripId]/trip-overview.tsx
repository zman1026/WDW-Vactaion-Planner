import { format } from "date-fns";
import Link from "next/link";
import { ParkMark } from "@/components/park-mark";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export function TripOverview({ tripId, days, hotelName, partySize, companionCount, reservationCount, openReservationCount, progress, mustDos, plannedCostCents, budgetCents }: {
  tripId: string;
  days: OverviewDay[];
  hotelName: string | null;
  partySize: number;
  companionCount: number;
  reservationCount: number;
  openReservationCount: number;
  progress: TripProgress;
  mustDos: Array<{ dayPlanItemId: string | null }>;
  plannedCostCents: number;
  budgetCents: number | null;
}) {
  const unplacedMustDos = mustDos.filter((item) => !item.dayPlanItemId).length;
  const openDays = days.filter((day) => !day.parkName && !day.notes?.trim() && day.items.length === 0);
  const attention = [
    openDays.length > 0 && { label: `${openDays.length} open day${openDays.length === 1 ? "" : "s"}`, help: "Choose a park or protect a resort day.", href: dayHref(tripId, openDays[0].id), tone: "gold" },
    openReservationCount > 0 && { label: `${openReservationCount} booking${openReservationCount === 1 ? "" : "s"} need attention`, help: "Finish wish-list and pending reservation details.", href: `/trips/${tripId}?view=reservations`, tone: "warning" },
    unplacedMustDos > 0 && { label: `${unplacedMustDos} must-do${unplacedMustDos === 1 ? "" : "s"} still unplaced`, help: "Give the family's priorities a home.", href: dayHref(tripId, days[0]?.id), tone: "success" },
  ].filter(Boolean) as Array<{ label: string; help: string; href: string; tone: string }>;

  return <div className="space-y-5">
    <section className="overview-hero relative overflow-hidden rounded-[1.75rem] border border-gold/25 bg-primary text-white shadow-lift">
      <div className="magic-dust absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sand">Your vacation story</p><h2 className="mt-2 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">Everything important, all in one place.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">Start with the shape of the trip, anchor the moments that matter, then leave enough breathing room for a little magic.</p><div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{days.length} days</span>{hotelName && <span className="max-w-full truncate rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{hotelName}</span>}<span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Party of {partySize}{companionCount ? ` · ${companionCount + 1} connected` : ""}</span></div></div>
        <div className="rounded-card border border-white/15 bg-white/10 p-4 backdrop-blur"><TripProgressMeter progress={progress} /><Link href={progress.nextAction.dayId ? dayHref(tripId, progress.nextAction.dayId) : `/trips/${tripId}?view=day`} className={buttonStyles({ variant: "secondary", className: "mt-4 w-full border-white/20 bg-white text-primary hover:bg-sand" })}>{progress.nextAction.title}</Link><p className="mt-2 text-center text-xs leading-relaxed text-white/65">{progress.nextAction.description}</p></div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Trip snapshot">
      <Snapshot label="Park days" value={String(days.filter((day) => day.parkName).length)} help={`${days.length - days.filter((day) => day.parkName).length} resort or open`} icon="⌖" />
      <Snapshot label="Reservations" value={String(reservationCount)} help={openReservationCount ? `${openReservationCount} still need attention` : "Bookings look settled"} icon="◇" />
      <Snapshot label="Must-dos placed" value={String(mustDos.length - unplacedMustDos)} help={`${unplacedMustDos} still on the wish list`} icon="★" />
      <Snapshot label="Planned spend" value={money(plannedCostCents)} help={budgetCents === null ? "No budget set" : `${money(Math.max(0, budgetCents - plannedCostCents))} unallocated`} icon="$" />
    </section>

    {attention.length > 0 && <section aria-labelledby="attention-title"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">A little pixie dust</p><h2 id="attention-title" className="mt-1 text-2xl font-semibold text-primary">What needs attention</h2></div><Badge>{attention.length} next steps</Badge></div><div className="mt-3 grid gap-3 md:grid-cols-3">{attention.map((item) => <Link key={item.label} href={item.href} className="group rounded-card border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lift"><span className={`mb-3 block size-2.5 rounded-full ${item.tone === "warning" ? "bg-warning" : item.tone === "success" ? "bg-success" : "bg-gold"}`} /><p className="font-semibold text-primary group-hover:text-gold">{item.label}</p><p className="mt-1 text-xs leading-relaxed text-muted">{item.help}</p></Link>)}</div></section>}

    <section aria-labelledby="roadmap-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Your trip, day by day</p><h2 id="roadmap-title" className="mt-1 text-2xl font-semibold text-primary">Vacation roadmap</h2></div><p className="text-xs text-muted">Select any day to shape its plan</p></div><ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{days.map((day, index) => <RoadmapDay key={day.id} tripId={tripId} day={day} index={index} hotelName={hotelName} />)}</ol></section>
  </div>;
}

function RoadmapDay({ tripId, day, index, hotelName }: { tripId: string; day: OverviewDay; index: number; hotelName: string | null }) {
  const theme = resolveDayTheme({ parkName: day.parkName, hotelName });
  const exact = day.items.filter((item) => item.timingType === "EXACT").length;
  const dining = day.items.filter((item) => item.entityType === "RESTAURANT").length;
  return <li><Link href={dayHref(tripId, day.id)} data-theme={theme.id} data-pattern={theme.pattern} className="day-theme day-theme__hero group block h-full min-h-44 rounded-card border p-4 shadow-card transition hover:-translate-y-1 hover:shadow-lift"><div className="flex items-start justify-between gap-3"><div><p className="day-accent-text text-[9px] font-bold uppercase tracking-[0.18em]">Day {index + 1} · {format(day.date, "EEE, MMM d")}</p><h3 className="mt-1 font-display text-xl font-semibold leading-tight text-primary">{day.parkName || (hotelName ? "Resort day" : "Open day")}</h3>{day.secondaryParkName && <p className="mt-1 text-xs font-semibold text-muted">Hopper to {day.secondaryParkName}</p>}</div><span className="day-accent-text grid size-12 shrink-0 place-items-center rounded-full border border-[rgb(var(--day-accent)/.2)] bg-white/55"><ParkMark theme={theme.id} className="size-8" /></span></div><div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted"><span>{day.items.length} plan{day.items.length === 1 ? "" : "s"}</span>{exact > 0 && <><span className="text-border">•</span><span>{exact} fixed</span></>}{dining > 0 && <><span className="text-border">•</span><span>{dining} dining</span></>}{day.reservationCount > 0 && <><span className="text-border">•</span><span>{day.reservationCount} booked</span></>}</div><p className="day-accent-text mt-3 text-xs font-bold">Open this day <span aria-hidden="true">→</span></p></Link></li>;
}

function Snapshot({ label, value, help, icon }: { label: string; value: string; help: string; icon: string }) { return <Card className="flex items-center gap-4 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand/25 font-display text-lg font-bold text-gold">{icon}</span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-0.5 font-display text-2xl font-semibold text-primary">{value}</p><p className="truncate text-[11px] text-muted">{help}</p></div></Card>; }
function dayHref(tripId: string, dayId?: string) { return `/trips/${tripId}?view=day${dayId ? `&day=${dayId}` : ""}#day-canvas`; }
function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100); }
