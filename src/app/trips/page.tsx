import { differenceInCalendarDays, format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { ParkChip, parkTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveDayTheme, themeAccent } from "@/lib/day-themes";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Trips | WDW Planner" };
export const dynamic = "force-dynamic";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const accents = { mk: "border-t-park-mk", epcot: "border-t-park-epcot", hs: "border-t-park-hs", ak: "border-t-park-ak", rest: "border-t-park-rest" };

export default async function TripsPage() {
  const user = await requireCurrentUser();
  const trips = await prisma.trip.findMany({ where: { userId: user.id }, orderBy: [{ startDate: "asc" }, { createdAt: "desc" }], include: { dayPlans: { orderBy: { date: "asc" }, select: { parkId: true, _count: { select: { items: true } } } } } });
  const entityIds = [...new Set(trips.flatMap((trip) => [...trip.dayPlans.flatMap((day) => day.parkId ? [day.parkId] : []), ...(trip.hotelId ? [trip.hotelId] : [])]))];
  const entities = await prisma.parkEntity.findMany({ where: { id: { in: entityIds } }, select: { id: true, name: true } });
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));

  return <div className="space-y-8"><header className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Your adventures</p><h1 className="mt-2 text-4xl font-semibold text-primary sm:text-5xl">My trips</h1><p className="mt-2 text-muted">Pick up the next page of your family’s plans.</p></div><Link href="/trips/new" className={buttonStyles({ size: "lg" })}>Plan a new trip</Link></header>
    {trips.length === 0 ? <EmptyState title="Your first adventure starts with a date" description="Create a trip and we’ll prepare a themed planning canvas for every day, with space for parks, meals, must-dos, and the moments between." href="/trips/new" actionLabel="Create your first trip" /> : <ul className="grid gap-5 md:grid-cols-2">{trips.map((trip) => {
      const firstParkName = names.get(trip.dayPlans.find((day) => day.parkId)?.parkId ?? "");
      const itemCount = trip.dayPlans.reduce((sum, day) => sum + day._count.items, 0);
      const parkDays = trip.dayPlans.filter((day) => day.parkId).length;
      const hotelName = trip.hotelId ? names.get(trip.hotelId) : null;
      return <li key={trip.id}><Card className={`h-full border-t-4 p-6 ${accents[parkTone(firstParkName)]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-gold">{relativeTrip(trip.startDate, trip.endDate)}</p><h2 className="mt-1 text-2xl font-semibold text-primary">{trip.name}</h2></div>{firstParkName && <ParkChip name={firstParkName} />}</div><p className="mt-2 text-sm text-muted">{format(trip.startDate, "MMM d, yyyy")} – {format(trip.endDate, "MMM d, yyyy")}</p>{hotelName && <p className="mt-4 text-xs font-semibold text-muted">Staying at {hotelName}</p>}<div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label={`${parkDays} of ${trip.dayPlans.length} days assigned`}>{trip.dayPlans.map((day, index) => { const name = day.parkId ? names.get(day.parkId) : null; const theme = resolveDayTheme({ parkName: name, hotelName }); return <span key={index} title={name || hotelName || "Open day"} className={`size-3 rounded-full ${day.parkId ? "" : "opacity-35 ring-1 ring-border"}`} style={{ backgroundColor: themeAccent(theme) }} />; })}<span className="ml-2 text-xs font-semibold text-muted">{parkDays}/{trip.dayPlans.length} days assigned</span></div><dl className="mt-5 grid grid-cols-3 gap-2"><TripStat label="Days" value={String(trip.dayPlans.length)} /><TripStat label="Assigned" value={`${parkDays}/${trip.dayPlans.length}`} /><TripStat label="Plans" value={String(itemCount)} /></dl><div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4"><span className="text-sm font-semibold text-muted">{trip.budgetCents === null ? "Budget not set" : `${currency.format(trip.budgetCents / 100)} budget`}</span><Link href={`/trips/${trip.id}`} className={buttonStyles({ size: "sm" })}>Continue planning</Link></div></Card></li>;
    })}</ul>}
  </div>;
}

function relativeTrip(start: Date, end: Date) { const now = new Date(); if (now >= start && now <= end) return "Happening now"; const days = differenceInCalendarDays(start, now); if (days > 0) return `${days} day${days === 1 ? "" : "s"} to go`; const past = differenceInCalendarDays(now, end); return `${past} day${past === 1 ? "" : "s"} ago`; }
function TripStat({ label, value }: { label: string; value: string }) { return <div className="rounded-control bg-parchment px-3 py-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt><dd className="mt-1 font-display text-lg font-semibold text-primary">{value}</dd></div>; }
