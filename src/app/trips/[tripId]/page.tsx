import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TripProgressMeter } from "@/components/ui/trip-progress";
import { resolveDayTheme, themeAccent } from "@/lib/day-themes";
import { requireCurrentUser } from "@/lib/current-user";
import { normalizePartyProfile } from "@/lib/party-profile";
import { prisma } from "@/lib/prisma";
import { calculateTripProgress } from "@/lib/trip-progress";
import { DayPlanner } from "./day-planner";
import { PlannerSideRail } from "./planner-side-rail";
import { TripSettings } from "./trip-settings";

interface TripPageProps { params: Promise<{ tripId: string }>; searchParams: Promise<{ day?: string }> }
export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> { const { tripId } = await params; const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { name: true } }); return { title: trip ? `${trip.name} | WDW Planner` : "Trip Not Found | WDW Planner" }; }

export default async function TripPage({ params, searchParams }: TripPageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]); const user = await requireCurrentUser();
  const [trip, parks, hotels] = await Promise.all([
    prisma.trip.findFirst({ where: { id: tripId, userId: user.id }, include: { mustDos: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }, dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } } } }),
    prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.parkEntity.findMany({ where: { entityType: "HOTEL" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!trip) notFound();
  const selectedIndex = Math.max(0, trip.dayPlans.findIndex((day) => day.id === query.day)); const selectedDay = trip.dayPlans[selectedIndex] ?? trip.dayPlans[0];
  const parkNames = new Map(parks.map((park) => [park.id, park.name])); const hotel = hotels.find((item) => item.id === trip.hotelId);
  const allItems = trip.dayPlans.flatMap((day) => day.items); const plannedCostCents = allItems.reduce((total, item) => total + (item.estimatedCostCents ?? 0), 0); const paidExtrasCents = allItems.filter((item) => item.paidExtraType).reduce((total, item) => total + (item.estimatedCostCents ?? 0), 0);
  const nights = differenceInCalendarDays(trip.endDate, trip.startDate); const countdown = differenceInCalendarDays(startOfDay(trip.startDate), startOfDay(new Date())); const partyProfile = normalizePartyProfile(trip.partyProfile);
  const selectedParkName = selectedDay?.parkId ? parkNames.get(selectedDay.parkId) : null; const selectedTheme = resolveDayTheme({ parkName: selectedParkName, hotelName: hotel?.name }); const specialDay = selectedDay ? dayMoment(selectedIndex, trip.dayPlans.length) : null; const coachingNote = rhythmCoaching(trip.dayPlans, selectedIndex);
  const progress = calculateTripProgress({ hotelId: trip.hotelId, budgetCents: trip.budgetCents, hasPartyProfile: Boolean(trip.partyProfile), mustDoCount: trip.mustDos.length, days: trip.dayPlans });
  const days = trip.dayPlans.map((day, index) => ({ id: day.id, label: `Day ${index + 1} · ${format(day.date, "MMM d")}` }));

  return <div className="planner-page space-y-3">
    <Card className="p-3 sm:p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-xs"><Link href="/trips" className="font-semibold text-muted hover:text-primary">← Trips</Link><span className="text-border">/</span><span className="truncate text-muted">{format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")} · {trip.dayPlans.length} days · {nights} nights</span></div><h1 className="mt-1 truncate text-2xl font-semibold text-primary sm:text-3xl">{trip.name}</h1></div><div className="flex flex-wrap items-center gap-2">{countdown > 0 && <span className="rounded-full border border-gold/25 bg-sand/15 px-3 py-1.5 text-xs font-bold text-gold">{countdown} days to go</span>}{countdown === 0 && <span className="rounded-full border border-gold/25 bg-sand/15 px-3 py-1.5 text-xs font-bold text-gold">Begins today</span>}<div className="min-w-52 flex-1 sm:w-64"><BudgetMeter plannedCents={plannedCostCents} budgetCents={trip.budgetCents} paidExtrasCents={paidExtrasCents} compact /></div><Link href={`/share/${trip.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>Share</Link><TripSettings trip={{ id: trip.id, name: trip.name, startDate: format(trip.startDate, "yyyy-MM-dd"), endDate: format(trip.endDate, "yyyy-MM-dd"), budget: trip.budgetCents === null ? "" : (trip.budgetCents / 100).toFixed(2), notes: trip.notes ?? "", hotelId: trip.hotelId, partyProfile }} hotels={hotels} /></div></div></Card>
    {parks.length === 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-warning/25 bg-warning/5 px-3 py-2 text-sm"><span className="font-semibold text-primary">Refresh the WDW directory to assign parks and add offerings.</span><SyncEntitiesButton /></div>}
    <div className="grid gap-3 rounded-control border border-gold/20 bg-sand/10 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,.7fr)_auto] sm:items-center"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Recommended next</p><p className="truncate text-sm font-semibold text-primary">{progress.nextAction.title}</p><p className="truncate text-xs text-muted">{progress.nextAction.description}</p></div><TripProgressMeter progress={progress} compact /><Link href={`/trips/${trip.id}${progress.nextAction.dayId ? `?day=${progress.nextAction.dayId}#day-canvas` : ""}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>Continue</Link></div>

    {selectedDay && <nav className="sticky top-[65px] z-30 -mx-4 overflow-x-auto border-y border-border/80 bg-parchment/95 px-4 py-2 shadow-[0_6px_18px_rgba(35,29,20,.05)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Trip days"><ol className="flex min-w-max gap-1.5">{trip.dayPlans.map((day, index) => { const active = day.id === selectedDay.id; const parkName = day.parkId ? parkNames.get(day.parkId) : null; const theme = resolveDayTheme({ parkName, hotelName: hotel?.name }); return <li key={day.id}><Link href={`/trips/${trip.id}?day=${day.id}#day-canvas`} aria-current={active ? "date" : undefined} className={`block min-h-12 w-32 rounded-control border px-2.5 py-2 transition ${active ? "border-primary/30 bg-surface shadow-card ring-2 ring-gold/15" : "border-transparent hover:border-border hover:bg-surface/70"}`}><span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: themeAccent(theme) }} />Day {index + 1} · {format(day.date, "EEE d")}</span><span className="mt-0.5 block truncate text-xs font-semibold text-primary">{parkName || hotel?.name || "Open day"}{day.secondaryParkId ? " · Hopper" : ""}</span></Link></li>; })}</ol></nav>}

    {selectedDay && <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]"><main className="min-w-0"><PlannerSideRail tripId={trip.id} mustDos={trip.mustDos} days={days} activeDayId={selectedDay.id} coachingNote={coachingNote} /><section id="day-canvas" data-theme={selectedTheme.id} data-pattern={selectedTheme.pattern} className="day-theme day-canvas-enter overflow-hidden rounded-card border border-[rgb(var(--day-accent)/.24)] shadow-card"><header className="day-theme__hero border-b border-[rgb(var(--day-accent)/.18)] border-l-4 border-l-[rgb(var(--day-accent))] px-3 py-3 sm:px-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="day-accent-text text-[9px] font-bold uppercase tracking-[0.16em]">{specialDay || selectedTheme.eyebrow}</p><h2 className="mt-0.5 truncate text-xl font-semibold text-primary sm:text-2xl">Day {selectedIndex + 1} · {selectedTheme.isParkDay ? selectedTheme.displayName : hotel?.name ? `${hotel.name} · Resort day` : "Resort day"}</h2></div><p className="shrink-0 text-xs font-semibold text-muted">{format(selectedDay.date, "EEE, MMM d")}{selectedDay.secondaryParkId ? " · Hopper" : ""}</p></div></header><div className="p-3 sm:p-4"><DayPlanner tripId={trip.id} dayPlanId={selectedDay.id} parkId={selectedDay.parkId} secondaryParkId={selectedDay.secondaryParkId} parks={parks} items={selectedDay.items} emptyTitle={selectedTheme.emptyTitle} emptyDescription={`${selectedTheme.emptyDescription}${specialDay === "Arrival day" ? " Consider check-in, your transfer, and an easy first meal." : specialDay === "Departure day" ? " Consider checkout, luggage, your transfer, and one last relaxed stop." : ""}`} days={days} /></div></section></main><PlannerSideRail tripId={trip.id} mustDos={trip.mustDos} days={days} activeDayId={selectedDay.id} coachingNote={coachingNote} /></div>}
  </div>;
}

function dayMoment(index: number, length: number) { if (length === 1) return "Arrival & departure day"; if (index === 0) return "Arrival day"; if (index === length - 1) return "Departure day"; return null; }
function rhythmCoaching(days: Array<{ parkId: string | null; items: unknown[] }>, selectedIndex: number) { if (selectedIndex < 2 || days[selectedIndex]?.parkId) return null; const previous = days.slice(selectedIndex - 2, selectedIndex); return previous.every((day) => day.parkId && day.items.length >= 5) ? "A quieter day after two full park days could help everyone reset." : null; }
