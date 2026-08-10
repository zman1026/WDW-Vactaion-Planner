import { differenceInCalendarDays, format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BudgetMeter } from "@/components/ui/budget-meter";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ParkChip } from "@/components/ui/badge";
import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { requireCurrentUser } from "@/lib/current-user";
import { normalizePartyProfile } from "@/lib/party-profile";
import { prisma } from "@/lib/prisma";
import { DayPlanner } from "./day-planner";
import { TripSettings } from "./trip-settings";

interface TripPageProps { params: Promise<{ tripId: string }>; searchParams: Promise<{ day?: string }> }

export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { name: true } });
  return { title: trip ? `${trip.name} | WDW Planner` : "Trip Not Found | WDW Planner" };
}

export default async function TripPage({ params, searchParams }: TripPageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const user = await requireCurrentUser();
  const [trip, parks, hotels] = await Promise.all([
    prisma.trip.findFirst({ where: { id: tripId, userId: user.id }, include: { dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } } } }),
    prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.parkEntity.findMany({ where: { entityType: "HOTEL" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!trip) notFound();

  const selectedIndex = Math.max(0, trip.dayPlans.findIndex((day) => day.id === query.day));
  const selectedDay = trip.dayPlans[selectedIndex] ?? trip.dayPlans[0];
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));
  const hotel = hotels.find((item) => item.id === trip.hotelId);
  const plannedCostCents = trip.dayPlans.flatMap((day) => day.items).reduce((total, item) => total + (item.estimatedCostCents ?? 0), 0);
  const nights = differenceInCalendarDays(trip.endDate, trip.startDate);
  const partyProfile = normalizePartyProfile(trip.partyProfile);

  return (
    <div className="space-y-7">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <Link href="/trips" className="text-sm font-semibold text-muted hover:text-primary">← All trips</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-gold">Your vacation journal</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span>{format(trip.startDate, "MMMM d")} – {format(trip.endDate, "MMMM d, yyyy")}</span>
            <span>{trip.dayPlans.length} days · {nights} nights</span>
            {hotel && <ParkChip name={hotel.name} />}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/share/${trip.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>Print or share</Link>
          </div>
        </div>
        <BudgetMeter plannedCents={plannedCostCents} budgetCents={trip.budgetCents} />
      </section>

      {trip.notes && <Card className="border-l-4 border-l-gold py-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Family note</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{trip.notes}</p></Card>}

      <TripSettings trip={{ id: trip.id, name: trip.name, startDate: format(trip.startDate, "yyyy-MM-dd"), endDate: format(trip.endDate, "yyyy-MM-dd"), budget: trip.budgetCents === null ? "" : (trip.budgetCents / 100).toFixed(2), notes: trip.notes ?? "", hotelId: trip.hotelId, partyProfile }} hotels={hotels} />

      {parks.length === 0 && <Card className="border-warning/30 bg-warning/5"><p className="mb-3 text-sm font-semibold text-primary">The WDW directory is empty. Sync it to assign parks and add offerings.</p><SyncEntitiesButton /></Card>}

      {selectedDay && <section id="day-canvas" className="space-y-4">
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Trip days">
          <ol className="flex min-w-max gap-2">
            {trip.dayPlans.map((day, index) => {
              const active = day.id === selectedDay.id;
              return <li key={day.id}><Link href={`/trips/${trip.id}?day=${day.id}#day-canvas`} aria-current={active ? "date" : undefined} className={`block w-36 rounded-card border p-3 transition ${active ? "border-gold bg-primary text-white shadow-lift" : "border-border bg-surface hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-card"}`}>
                <span className={`block text-[10px] font-bold uppercase tracking-widest ${active ? "text-sand" : "text-muted"}`}>Day {index + 1}</span>
                <span className="mt-1 block font-display text-lg font-semibold">{format(day.date, "EEE, MMM d")}</span>
                <ParkChip name={day.parkId ? parkNames.get(day.parkId) : null} className={`mt-2 max-w-full truncate ${active ? "border-white/20 bg-white/10 text-white" : ""}`} />
              </Link></li>;
            })}
          </ol>
        </div>

        <Card className="overflow-hidden p-0" key={selectedDay.id}>
          <div className="border-b border-border bg-sand/15 px-5 py-5 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Day {selectedIndex + 1}</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-3xl font-semibold text-primary">{format(selectedDay.date, "EEEE")}</h2><p className="text-sm text-muted">{format(selectedDay.date, "MMMM d, yyyy")}</p></div><ParkChip name={selectedDay.parkId ? parkNames.get(selectedDay.parkId) : null} /></div>
          </div>
          <div className="p-5 sm:p-7">
            <DayPlanner tripId={trip.id} dayPlanId={selectedDay.id} parkId={selectedDay.parkId} parks={parks} items={selectedDay.items} days={trip.dayPlans.map((day, index) => ({ id: day.id, label: `Day ${index + 1} · ${format(day.date, "MMM d")}` }))} />
          </div>
        </Card>
      </section>}
    </div>
  );
}
