import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { ParkChip, parkTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TripProgressMeter } from "@/components/ui/trip-progress";
import { resolveDayTheme, themeAccent } from "@/lib/day-themes";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { calculateTripProgress, type TripProgress } from "@/lib/trip-progress";

export const metadata: Metadata = { title: "My Trips | WDW Planner" };
export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const accents = { mk: "border-t-park-mk", epcot: "border-t-park-epcot", hs: "border-t-park-hs", ak: "border-t-park-ak", rest: "border-t-park-rest" };

type TripSummary = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  budgetCents: number | null;
  hotelName: string | null;
  firstParkName: string | undefined;
  dayThemes: Array<{ color: string; title: string; open: boolean }>;
  progress: TripProgress;
};

export default async function TripsPage() {
  const user = await requireCurrentUser();
  const trips = await prisma.trip.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "asc" },
    include: {
      _count: { select: { mustDos: true } },
      dayPlans: {
        orderBy: { date: "asc" },
        select: { id: true, parkId: true, notes: true, items: { select: { bookingStatus: true } } },
      },
    },
  });
  const entityIds = [...new Set(trips.flatMap((trip) => [...trip.dayPlans.flatMap((day) => day.parkId ? [day.parkId] : []), ...(trip.hotelId ? [trip.hotelId] : [])]))];
  const entities = await prisma.parkEntity.findMany({ where: { id: { in: entityIds } }, select: { id: true, name: true } });
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));
  const summaries: TripSummary[] = trips.map((trip) => {
    const hotelName = trip.hotelId ? names.get(trip.hotelId) ?? null : null;
    const firstParkName = names.get(trip.dayPlans.find((day) => day.parkId)?.parkId ?? "");
    return {
      id: trip.id,
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budgetCents: trip.budgetCents,
      hotelName,
      firstParkName,
      dayThemes: trip.dayPlans.map((day) => {
        const parkName = day.parkId ? names.get(day.parkId) : null;
        return { color: themeAccent(resolveDayTheme({ parkName, hotelName })), title: parkName || hotelName || "Open day", open: !day.parkId && !day.notes && day.items.length === 0 };
      }),
      progress: calculateTripProgress({ hotelId: trip.hotelId, budgetCents: trip.budgetCents, hasPartyProfile: Boolean(trip.partyProfile), mustDoCount: trip._count.mustDos, days: trip.dayPlans }),
    };
  });

  const today = startOfDay(new Date());
  const activeTrips = summaries.filter((trip) => trip.endDate >= today).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const pastTrips = summaries.filter((trip) => trip.endDate < today).sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  const featured = activeTrips[0];

  return <div className="space-y-10">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Planning command center</p><h1 className="mt-2 text-4xl font-semibold text-primary sm:text-5xl">My trips</h1><p className="mt-2 max-w-2xl text-muted">See what needs attention, then jump straight back into the plan.</p></div><Link href="/trips/new" className={buttonStyles({ size: "lg" })}>Plan a new trip</Link></header>

    {summaries.length === 0 ? <EmptyState title="Your first adventure starts with a date" description="Create a trip and we’ll prepare a themed planning canvas for every day, with space for parks, meals, must-dos, and the moments between." href="/trips/new" actionLabel="Create your first trip" /> : <>
      {featured && <FeaturedTrip trip={featured} />}
      {activeTrips.length > 1 && <section aria-labelledby="other-trips-title"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">On the horizon</p><h2 id="other-trips-title" className="mt-1 text-2xl font-semibold text-primary">Other upcoming trips</h2></div><span className="text-sm text-muted">{activeTrips.length - 1} more</span></div><ul className="mt-5 grid gap-5 md:grid-cols-2">{activeTrips.slice(1).map((trip) => <li key={trip.id}><TripCard trip={trip} /></li>)}</ul></section>}
      {pastTrips.length > 0 && <details className="group rounded-card border border-border bg-surface/55 p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-primary"><span>Past adventures <span className="ml-2 font-normal text-muted">({pastTrips.length})</span></span><span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span></summary><ul className="mt-5 grid gap-5 md:grid-cols-2">{pastTrips.map((trip) => <li key={trip.id}><TripCard trip={trip} past /></li>)}</ul></details>}
    </>}
  </div>;
}

function FeaturedTrip({ trip }: { trip: TripSummary }) {
  const actionHref = `/trips/${trip.id}${trip.progress.nextAction.dayId ? `?day=${trip.progress.nextAction.dayId}#day-canvas` : ""}`;
  return <section aria-labelledby="next-trip-title"><Card className="relative overflow-hidden border-gold/25 bg-primary text-white shadow-lift"><div className="absolute inset-y-0 right-0 w-2/5 opacity-20 [background-image:radial-gradient(circle,rgba(232,213,163,.8)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:linear-gradient(to_left,black,transparent)]" /><div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_19rem] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.2em] text-sand">Your next adventure</p>{trip.firstParkName && <ParkChip name={trip.firstParkName} className="border-white/15 bg-white/10 text-white" />}</div><h2 id="next-trip-title" className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{trip.name}</h2><p className="mt-2 text-sm text-sand">{format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")} · {relativeTrip(trip.startDate, trip.endDate)}</p>{trip.hotelName && <p className="mt-3 text-sm text-white/75">Staying at {trip.hotelName}</p>}<div className="mt-6 flex flex-wrap gap-3"><Link href={actionHref} className={buttonStyles({ variant: "secondary", size: "lg", className: "border-white/20 bg-white text-primary hover:bg-sand" })}>{trip.progress.nextAction.title}</Link><Link href={`/trips/${trip.id}`} className={buttonStyles({ variant: "ghost", size: "lg", className: "text-white hover:bg-white/10" })}>Open full plan</Link></div></div><div className="rounded-card border border-white/15 bg-white/10 p-5 backdrop-blur"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sand">Plan progress</p><p className="mt-1 font-display text-xl font-semibold">{trip.progress.label}</p></div><span className="font-display text-4xl font-semibold text-sand">{trip.progress.score}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-sand" style={{ width: `${trip.progress.score}%` }} /></div><dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4"><MiniStat label="Assigned" value={`${trip.progress.stats.assignedDays}/${trip.progress.stats.totalDays}`} /><MiniStat label="Planned" value={String(trip.progress.stats.plannedDays)} /><MiniStat label="To book" value={String(trip.progress.stats.openReservations)} /></dl><p className="mt-4 text-xs leading-relaxed text-white/70">{trip.progress.nextAction.description}</p></div></div></Card></section>;
}

function TripCard({ trip, past = false }: { trip: TripSummary; past?: boolean }) {
  return <Card className={`h-full border-t-4 p-6 ${accents[parkTone(trip.firstParkName)]} ${past ? "opacity-85" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-gold">{relativeTrip(trip.startDate, trip.endDate)}</p><h3 className="mt-1 text-2xl font-semibold text-primary">{trip.name}</h3></div>{trip.firstParkName && <ParkChip name={trip.firstParkName} />}</div><p className="mt-2 text-sm text-muted">{format(trip.startDate, "MMM d, yyyy")} – {format(trip.endDate, "MMM d, yyyy")}</p>{trip.hotelName && <p className="mt-3 text-xs font-semibold text-muted">Staying at {trip.hotelName}</p>}<div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label={`${trip.progress.stats.assignedDays} of ${trip.progress.stats.totalDays} days assigned`}>{trip.dayThemes.map((day, index) => <span key={index} title={day.title} className={`size-3 rounded-full ${day.open ? "opacity-30 ring-1 ring-border" : ""}`} style={{ backgroundColor: day.color }} />)}</div><div className="mt-5"><TripProgressMeter progress={trip.progress} compact /></div><div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4"><span className="text-sm font-semibold text-muted">{trip.budgetCents === null ? "Budget not set" : `${currency.format(trip.budgetCents / 100)} budget`}</span><Link href={`/trips/${trip.id}`} className={buttonStyles({ size: "sm", variant: past ? "secondary" : "primary" })}>{past ? "View trip" : "Continue planning"}</Link></div></Card>;
}

function MiniStat({ label, value }: { label: string; value: string }) { return <div><dt className="text-[9px] font-bold uppercase tracking-wider text-white/55">{label}</dt><dd className="mt-1 font-display text-xl font-semibold text-white">{value}</dd></div>; }
function relativeTrip(start: Date, end: Date) { const now = startOfDay(new Date()); if (now >= start && now <= end) return "Happening now"; const days = differenceInCalendarDays(start, now); if (days > 0) return `${days} day${days === 1 ? "" : "s"} to go`; const past = differenceInCalendarDays(now, end); return `${past} day${past === 1 ? "" : "s"} ago`; }
