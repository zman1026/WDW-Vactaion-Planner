import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveDayTheme, themeAccent } from "@/lib/day-themes";
import { requireCurrentUser } from "@/lib/current-user";
import { normalizePartyProfile } from "@/lib/party-profile";
import { prisma } from "@/lib/prisma";
import { DayPlanner } from "./day-planner";
import { MustDoBoard } from "./must-do-board";
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
    prisma.trip.findFirst({ where: { id: tripId, userId: user.id }, include: { mustDos: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }, dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } } } }),
    prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.parkEntity.findMany({ where: { entityType: "HOTEL" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!trip) notFound();

  const selectedIndex = Math.max(0, trip.dayPlans.findIndex((day) => day.id === query.day));
  const selectedDay = trip.dayPlans[selectedIndex] ?? trip.dayPlans[0];
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));
  const hotel = hotels.find((item) => item.id === trip.hotelId);
  const plannedCostCents = trip.dayPlans.flatMap((day) => day.items).reduce((total, item) => total + (item.estimatedCostCents ?? 0), 0);
  const paidExtrasCents = trip.dayPlans.flatMap((day) => day.items).filter((item) => item.paidExtraType).reduce((total, item) => total + (item.estimatedCostCents ?? 0), 0);
  const nights = differenceInCalendarDays(trip.endDate, trip.startDate);
  const countdown = differenceInCalendarDays(startOfDay(trip.startDate), startOfDay(new Date()));
  const partyProfile = normalizePartyProfile(trip.partyProfile);
  const parkDayCount = trip.dayPlans.filter((day) => day.parkId).length;
  const selectedParkName = selectedDay?.parkId ? parkNames.get(selectedDay.parkId) : null;
  const selectedTheme = resolveDayTheme({ parkName: selectedParkName, hotelName: hotel?.name });
  const specialDay = selectedDay ? dayMoment(selectedIndex, trip.dayPlans.length) : null;
  const coachingNote = rhythmCoaching(trip.dayPlans, selectedIndex);
  const onboarding = [Boolean(trip.hotelId), parkDayCount > 0, trip.mustDos.length > 0 || trip.dayPlans.some((day) => day.items.length > 0)];

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
            {hotel && <span className="font-semibold text-primary">Staying at {hotel.name}</span>}
          </div>
          {countdown > 0 && <p className="mt-4 font-display text-xl font-semibold text-gold">{countdown} day{countdown === 1 ? "" : "s"} to go</p>}
          {countdown === 0 && <p className="mt-4 font-display text-xl font-semibold text-gold">Your adventure begins today</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/share/${trip.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>Print or share</Link>
          </div>
        </div>
        <BudgetMeter plannedCents={plannedCostCents} budgetCents={trip.budgetCents} paidExtrasCents={paidExtrasCents} />
      </section>

      {trip.notes && <Card className="border-l-4 border-l-gold py-4"><p className="px-5 text-xs font-bold uppercase tracking-wider text-muted">Family note</p><p className="mt-1 whitespace-pre-wrap px-5 text-sm leading-relaxed">{trip.notes}</p></Card>}

      <TripSettings trip={{ id: trip.id, name: trip.name, startDate: format(trip.startDate, "yyyy-MM-dd"), endDate: format(trip.endDate, "yyyy-MM-dd"), budget: trip.budgetCents === null ? "" : (trip.budgetCents / 100).toFixed(2), notes: trip.notes ?? "", hotelId: trip.hotelId, partyProfile }} hotels={hotels} />

      {parks.length === 0 && <Card className="border-warning/30 bg-warning/5 p-5"><p className="mb-3 text-sm font-semibold text-primary">The WDW directory is empty. Sync it to assign parks and add offerings.</p><SyncEntitiesButton /></Card>}

      {!onboarding.every(Boolean) && <Card className="border-gold/25 bg-sand/10 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">A simple way to begin</p><h2 className="mt-1 text-2xl font-semibold text-primary">Set up your planning center</h2></div><span className="text-xs font-bold text-muted">{onboarding.filter(Boolean).length}/3 complete</span></div><ol className="mt-4 grid gap-2 sm:grid-cols-3"><SetupStep done={onboarding[0]} label="Choose your hotel" /><SetupStep done={onboarding[1]} label="Assign the first park" /><SetupStep done={onboarding[2]} label="Add a must-do or plan" /></ol></Card>}

      <MustDoBoard tripId={trip.id} mustDos={trip.mustDos} days={trip.dayPlans.map((day, index) => ({ id: day.id, label: `Day ${index + 1} · ${format(day.date, "MMM d")}` }))} />

      {trip.dayPlans.length > 0 && <section aria-labelledby="trip-overview-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">The whole trip</p><h2 id="trip-overview-title" className="mt-1 text-2xl font-semibold text-primary">At a glance</h2></div>
          <p className="text-sm text-muted"><strong className="text-primary">{parkDayCount} of {trip.dayPlans.length}</strong> days have a park</p>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {trip.dayPlans.map((day, index) => {
            const parkName = day.parkId ? parkNames.get(day.parkId) : null;
            const secondParkName = day.secondaryParkId ? parkNames.get(day.secondaryParkId) : null;
            const theme = resolveDayTheme({ parkName, hotelName: hotel?.name });
            const dayCost = day.items.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0);
            const status = day.items.length === 0 ? "Open day" : day.items.length >= 8 ? "Full day" : `${day.items.length} plan${day.items.length === 1 ? "" : "s"}`;
            return <li key={day.id}><Link href={`/trips/${trip.id}?day=${day.id}#day-canvas`} className={`group flex min-h-24 items-start gap-3 rounded-control border bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-card ${day.id === selectedDay?.id ? "border-primary/35 ring-2 ring-gold/15" : day.items.length === 0 ? "border-dashed border-border" : "border-border"}`}>
              <span className="mt-1 size-3 shrink-0 rounded-full ring-4 ring-parchment" style={{ backgroundColor: themeAccent(theme) }} />
              <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Day {index + 1} · {format(day.date, "EEE, MMM d")}</span><span className="mt-1 block truncate font-display font-semibold text-primary">{parkName || hotel?.name || "Resort day"}</span>{secondParkName && <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-wider text-gold">Hopper · {secondParkName}</span>}<span className={`mt-2 block text-xs ${day.items.length >= 8 ? "font-semibold text-warning" : "text-muted"}`}>{status}{dayCost > 0 ? ` · $${(dayCost / 100).toFixed(0)}` : ""}</span></span>
            </Link></li>;
          })}
        </ol>
      </section>}

      {selectedDay && <section id="day-canvas" data-theme={selectedTheme.id} data-pattern={selectedTheme.pattern} className="day-theme day-canvas-enter -mx-4 overflow-clip border-y border-[rgb(var(--day-accent)/.2)] px-4 py-4 shadow-[0_18px_50px_rgba(35,29,20,.06)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:rounded-card lg:border lg:px-8">
        <div className="sticky top-[73px] z-30 -mx-4 overflow-x-auto border-b border-[rgb(var(--day-accent)/.16)] bg-[rgb(var(--day-wash)/.92)] px-4 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Trip days">
          <ol className="flex min-w-max gap-2">
            {trip.dayPlans.map((day, index) => {
              const active = day.id === selectedDay.id;
              const dayParkName = day.parkId ? parkNames.get(day.parkId) : null;
              const theme = resolveDayTheme({ parkName: dayParkName, hotelName: hotel?.name });
              return <li key={day.id}><Link href={`/trips/${trip.id}?day=${day.id}#day-canvas`} aria-current={active ? "date" : undefined} className={`block min-h-16 w-36 rounded-control border p-3 transition ${active ? "day-accent-border bg-white/80 shadow-card" : "border-transparent bg-white/45 hover:border-[rgb(var(--day-accent)/.2)] hover:bg-white/75"}`}>
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: themeAccent(theme) }} />Day {index + 1}</span>
                <span className={`mt-1 block font-display text-base font-semibold ${active ? "day-accent-text" : "text-primary"}`}>{format(day.date, "EEE, MMM d")}</span>
                <span className="mt-1 block max-w-full truncate text-[11px] text-muted">{dayParkName || hotel?.name || "Resort day"}{day.secondaryParkId ? " · Hopper" : ""}</span>
              </Link></li>;
            })}
          </ol>
        </div>

        <Card className="day-theme__hero mt-4 overflow-hidden p-0" key={selectedDay.id}>
          <header className="border-b border-[rgb(var(--day-accent)/.18)] px-5 py-7 sm:px-8 sm:py-9">
            <p className="day-accent-text text-xs font-bold uppercase tracking-[0.2em]">{specialDay || selectedTheme.eyebrow}</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div><h2 className="max-w-3xl text-3xl font-semibold text-primary sm:text-4xl">{selectedTheme.isParkDay ? selectedTheme.displayName : hotel?.name ? `${hotel.name} · Resort day` : "Resort day"}</h2><p className="mt-1 font-display text-lg text-muted">{format(selectedDay.date, "EEEE, MMMM d, yyyy")}</p></div>
              <span className="flex flex-wrap gap-2"><span className="rounded-full border border-[rgb(var(--day-accent)/.25)] bg-white/60 px-3 py-1 text-xs font-bold text-[rgb(var(--day-accent-deep))]">Day {selectedIndex + 1}</span>{selectedDay.secondaryParkId && <span className="rounded-full border border-gold/30 bg-white/60 px-3 py-1 text-xs font-bold text-gold">Park hopper</span>}</span>
            </div>
          </header>
          <div className="p-5 sm:p-8">
            <DayPlanner tripId={trip.id} dayPlanId={selectedDay.id} parkId={selectedDay.parkId} secondaryParkId={selectedDay.secondaryParkId} parks={parks} items={selectedDay.items} emptyTitle={selectedTheme.emptyTitle} emptyDescription={`${selectedTheme.emptyDescription}${specialDay === "Arrival day" ? " Consider check-in, your transfer, and an easy first meal." : specialDay === "Departure day" ? " Consider checkout, luggage, your transfer, and one last relaxed stop." : ""}`} coachingNote={coachingNote} days={trip.dayPlans.map((day, index) => ({ id: day.id, label: `Day ${index + 1} · ${format(day.date, "MMM d")}` }))} />
          </div>
        </Card>
      </section>}
    </div>
  );
}

function dayMoment(index: number, length: number) {
  if (length === 1) return "Arrival & departure day";
  if (index === 0) return "Arrival day";
  if (index === length - 1) return "Departure day";
  return null;
}

function rhythmCoaching(days: Array<{ parkId: string | null; items: unknown[] }>, selectedIndex: number) {
  if (selectedIndex < 2 || days[selectedIndex]?.parkId) return null;
  const previous = days.slice(selectedIndex - 2, selectedIndex);
  if (previous.every((day) => day.parkId && day.items.length >= 5)) return "This quieter day follows two full park days—a slower morning could help everyone reset.";
  return null;
}

function SetupStep({ done, label }: { done: boolean; label: string }) { return <li className={`flex items-center gap-2 rounded-control border px-3 py-3 text-sm font-semibold ${done ? "border-success/20 bg-success/5 text-success" : "border-border bg-surface text-primary"}`}><span className={`grid size-5 place-items-center rounded-full border text-[10px] ${done ? "border-success bg-success text-white" : "border-gold text-gold"}`}>{done ? "✓" : ""}</span>{label}</li>; }
