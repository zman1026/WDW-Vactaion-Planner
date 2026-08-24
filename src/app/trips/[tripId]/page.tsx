import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParkMark } from "@/components/park-mark";
import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { buttonStyles } from "@/components/ui/button";
import { resolveDayTheme, themeAccent } from "@/lib/day-themes";
import { requireCurrentUser } from "@/lib/current-user";
import { normalizePartyProfile } from "@/lib/party-profile";
import { prisma } from "@/lib/prisma";
import { calculateTripProgress } from "@/lib/trip-progress";
import { DayPlanner } from "./day-planner";
import { PlannerSideRail } from "./planner-side-rail";
import { ReservationCenter } from "./reservation-center";
import { TodayView } from "./today-view";
import { TripOverview } from "./trip-overview";
import { TripParty } from "./trip-party";
import { TripSettings } from "./trip-settings";

interface TripPageProps { params: Promise<{ tripId: string }>; searchParams: Promise<{ day?: string; view?: string }> }

export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { name: true } });
  return { title: trip ? `${trip.name} | WDW Planner` : "Trip Not Found | WDW Planner" };
}

export default async function TripPage({ params, searchParams }: TripPageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const user = await requireCurrentUser();
  const [trip, parks, hotels, directoryStatus] = await Promise.all([
    prisma.trip.findFirst({ where: { id: tripId, userId: user.id }, include: { companions: { orderBy: { createdAt: "asc" } }, reservations: { orderBy: [{ date: "asc" }, { startTime: "asc" }] }, mustDos: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }, dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } } } }),
    prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.parkEntity.findMany({ where: { entityType: "HOTEL" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.parkEntity.aggregate({ where: { entityType: "HOTEL" }, _max: { lastSynced: true } }),
  ]);
  if (!trip) notFound();

  const selectedIndex = Math.max(0, trip.dayPlans.findIndex((day) => day.id === query.day));
  const selectedDay = trip.dayPlans[selectedIndex] ?? trip.dayPlans[0];
  const today = startOfDay(new Date());
  const activeToday = today >= startOfDay(trip.startDate) && today <= startOfDay(trip.endDate);
  const requestedView = query.view === "day" || query.view === "reservations" || query.view === "today" || query.view === "overview" ? query.view : null;
  const view = query.day ? "day" : requestedView ?? (activeToday ? "today" : "overview");
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));
  const hotel = hotels.find((item) => item.id === trip.hotelId);
  const hotelName = trip.customHotelName || hotel?.name || null;
  const allItems = trip.dayPlans.flatMap((day) => day.items);
  const plannedCostCents = allItems.reduce((total, item) => total + (item.estimatedCostCents ?? 0), 0) + trip.reservations.reduce((total, item) => total + (item.costCents ?? 0), 0);
  const nights = differenceInCalendarDays(trip.endDate, trip.startDate);
  const countdown = differenceInCalendarDays(startOfDay(trip.startDate), startOfDay(new Date()));
  const partyProfile = normalizePartyProfile(trip.partyProfile);
  const selectedParkName = selectedDay?.parkId ? parkNames.get(selectedDay.parkId) : null;
  const selectedTheme = resolveDayTheme({ parkName: selectedParkName, hotelName });
  const specialDay = selectedDay ? dayMoment(selectedIndex, trip.dayPlans.length) : null;
  const coachingNote = rhythmCoaching(trip.dayPlans, selectedIndex);
  const progress = calculateTripProgress({ hotelId: trip.hotelId ?? trip.customHotelName, budgetCents: trip.budgetCents, hasPartyProfile: Boolean(trip.partyProfile), mustDoCount: trip.mustDos.length, days: trip.dayPlans });
  const days = trip.dayPlans.map((day, index) => ({ id: day.id, label: `Day ${index + 1} · ${format(day.date, "MMM d")}`, date: format(day.date, "yyyy-MM-dd") }));
  const todayDay = trip.dayPlans.find((day) => format(day.date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) ?? selectedDay;
  const reservationSummaries = trip.reservations.map((item) => ({ id: item.id, dayPlanId: item.dayPlanId, category: item.category, title: item.title, date: format(item.date, "yyyy-MM-dd"), startTime: item.startTime, endTime: item.endTime, status: item.status, confirmationNumber: item.confirmationNumber, location: item.location, notes: item.notes, costCents: item.costCents, partySize: item.partySize }));
  const itineraryBookings = trip.dayPlans.flatMap((day) => day.items.filter((item) => item.bookingStatus === "BOOKED" || item.bookingStatus === "WISHLIST").map((item) => ({ id: item.id, dayPlanId: day.id, title: item.title, entityType: item.entityType, date: format(day.date, "yyyy-MM-dd"), startTime: item.startTime, status: item.bookingStatus, confirmationNumber: item.confirmationNumber })));
  const continueHref = activeToday && todayDay ? `/trips/${trip.id}?view=today&day=${todayDay.id}` : `/trips/${trip.id}?view=day${progress.nextAction.dayId ? `&day=${progress.nextAction.dayId}` : ""}#day-canvas`;

  return <div className="planner-page space-y-4">
    <header className="planner-masthead relative rounded-[1.5rem] border border-primary/10 bg-primary p-4 text-white shadow-lift sm:p-5">
      <div className="magic-dust absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-xs"><Link href="/trips" className="font-semibold text-sand hover:text-white">← All trips</Link><span className="text-white/25">/</span><span className="truncate text-white/60">{format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")} · {nights} nights</span></div><h1 className="mt-1 truncate text-2xl font-semibold text-white sm:text-3xl">{trip.name}</h1><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/65">{hotelName && <span>{hotelName}</span>}{hotelName && <span className="text-white/25">•</span>}<span>{trip.companions.length + 1} traveler{trip.companions.length ? "s" : ""}</span>{countdown > 0 && <><span className="text-white/25">•</span><strong className="text-sand">{countdown} days to go</strong></>}{countdown === 0 && <strong className="text-sand">Begins today</strong>}</div></div>
        <div className="flex flex-wrap items-center gap-2"><Link href={continueHref} className={buttonStyles({ variant: "secondary", size: "sm", className: "border-white/20 bg-white text-primary hover:bg-sand" })}>{activeToday ? "Open today" : "Continue planning"}</Link><details className="group relative"><summary className={buttonStyles({ variant: "secondary", size: "sm", className: "cursor-pointer list-none border-white/15 bg-white/10 text-white hover:bg-white/20" })}>Trip options <span className="text-xs transition group-open:rotate-180" aria-hidden="true">⌄</span></summary><div className="absolute right-0 top-12 z-50 w-60 rounded-card border border-border bg-surface p-2 text-ink shadow-lift"><p className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Trip options</p><TripParty tripId={trip.id} companions={trip.companions} triggerLabel="Travel party" triggerClassName="mt-1 w-full justify-start border-0 bg-transparent text-primary shadow-none hover:bg-parchment" /><TripSettings trip={{ id: trip.id, name: trip.name, startDate: format(trip.startDate, "yyyy-MM-dd"), endDate: format(trip.endDate, "yyyy-MM-dd"), budget: trip.budgetCents === null ? "" : (trip.budgetCents / 100).toFixed(2), notes: trip.notes ?? "", hotelId: trip.hotelId, customHotelName: trip.customHotelName, partyProfile }} hotels={hotels} directoryStatus={{ hotelCount: hotels.length, lastSynced: directoryStatus._max.lastSynced?.toISOString() ?? null }} triggerLabel="Trip settings" triggerClassName="mt-1 w-full justify-start border-0 bg-transparent text-primary shadow-none hover:bg-parchment" /><Link href={`/share/${trip.id}`} className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-1 w-full justify-start" })}>Shared itinerary</Link></div></details></div>
      </div>
    </header>

    {parks.length === 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-warning/25 bg-warning/5 px-3 py-2 text-sm"><span className="font-semibold text-primary">Refresh the WDW directory to assign parks and add offerings.</span><SyncEntitiesButton /></div>}

    <nav className="flex items-center gap-1 rounded-control border border-border bg-surface p-1 shadow-card" aria-label="Planner views">
      <Link href={`/trips/${trip.id}`} aria-current={view === "overview" ? "page" : undefined} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition sm:flex-none ${view === "overview" ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-parchment hover:text-primary"}`}><OverviewIcon />Trip home</Link>
      <Link href={`/trips/${trip.id}?view=day${selectedDay ? `&day=${selectedDay.id}` : ""}#day-canvas`} aria-current={view === "day" ? "page" : undefined} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition sm:flex-none ${view === "day" ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-parchment hover:text-primary"}`}><CalendarIcon />Plan days</Link>
      <Link href={`/trips/${trip.id}?view=reservations`} aria-current={view === "reservations" ? "page" : undefined} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition sm:flex-none ${view === "reservations" ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-parchment hover:text-primary"}`}><TicketIcon /><span className="hidden sm:inline">Reservations</span><span className="sm:hidden">Bookings</span></Link>
      {activeToday && <Link href={`/trips/${trip.id}?view=today${todayDay ? `&day=${todayDay.id}` : ""}`} aria-current={view === "today" ? "page" : undefined} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition sm:flex-none ${view === "today" ? "bg-primary text-white shadow-sm" : "text-gold hover:bg-sand/20"}`}><SparkleIcon />Today</Link>}
    </nav>

    {view === "overview" ? <TripOverview tripId={trip.id} hotelName={hotelName} partySize={partyProfile.partySize} companionCount={trip.companions.length} reservationCount={trip.reservations.length + itineraryBookings.filter((item) => item.status === "BOOKED").length} openReservationCount={trip.reservations.filter((item) => item.status !== "CONFIRMED").length + itineraryBookings.filter((item) => item.status === "WISHLIST").length} progress={progress} mustDos={trip.mustDos} plannedCostCents={plannedCostCents} budgetCents={trip.budgetCents} days={trip.dayPlans.map((day) => ({ id: day.id, date: day.date, parkName: day.parkId ? parkNames.get(day.parkId) ?? null : null, secondaryParkName: day.secondaryParkId ? parkNames.get(day.secondaryParkId) ?? null : null, notes: day.notes, reservationCount: trip.reservations.filter((item) => item.dayPlanId === day.id).length, items: day.items.map((item) => ({ entityType: item.entityType, title: item.title, timingType: item.timingType, startTime: item.startTime, bookingStatus: item.bookingStatus })) }))} /> : view === "reservations" ? <ReservationCenter tripId={trip.id} tripStartDate={format(trip.startDate, "yyyy-MM-dd")} days={days} reservations={reservationSummaries} itineraryBookings={itineraryBookings} /> : view === "today" && todayDay ? <TodayView tripId={trip.id} activeToday={activeToday} hotelName={hotelName} companionCount={trip.companions.length} reservations={reservationSummaries} day={{ id: todayDay.id, date: format(todayDay.date, "yyyy-MM-dd"), parkName: todayDay.parkId ? parkNames.get(todayDay.parkId) ?? null : null, secondaryParkName: todayDay.secondaryParkId ? parkNames.get(todayDay.secondaryParkId) ?? null : null, notes: todayDay.notes, items: todayDay.items.map((item) => ({ id: item.id, title: item.title, entityType: item.entityType, timingType: item.timingType, timeOfDay: item.timeOfDay, startTime: item.startTime, endTime: item.endTime, bookingStatus: item.bookingStatus, confirmationNumber: item.confirmationNumber, notes: item.notes })) }} /> : <>
      {selectedDay && <nav className="day-filmstrip sticky top-[65px] z-30 -mx-4 overflow-x-auto border-y border-border/80 bg-parchment/95 px-4 py-2 shadow-[0_6px_18px_rgba(35,29,20,.05)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Trip days"><ol className="flex min-w-max gap-1.5">{trip.dayPlans.map((day, index) => { const active = day.id === selectedDay.id; const parkName = day.parkId ? parkNames.get(day.parkId) : null; const theme = resolveDayTheme({ parkName, hotelName }); return <li key={day.id}><Link href={`/trips/${trip.id}?view=day&day=${day.id}#day-canvas`} aria-current={active ? "date" : undefined} className={`block min-h-14 w-36 rounded-control border px-3 py-2 transition ${active ? "border-primary/30 bg-surface shadow-card ring-2 ring-gold/15" : "border-transparent hover:border-border hover:bg-surface/70"}`}><span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: themeAccent(theme) }} />Day {index + 1} · {format(day.date, "EEE d")}</span><span className="mt-1 block truncate text-xs font-semibold text-primary">{parkName || hotelName || "Open day"}{day.secondaryParkId ? " · Hopper" : ""}</span></Link></li>; })}</ol></nav>}

      {selectedDay && <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_310px]"><main className="min-w-0"><PlannerSideRail tripId={trip.id} mustDos={trip.mustDos} days={days} activeDayId={selectedDay.id} coachingNote={coachingNote} /><section id="day-canvas" data-theme={selectedTheme.id} data-pattern={selectedTheme.pattern} className="day-theme day-canvas-enter overflow-hidden rounded-[1.5rem] border border-[rgb(var(--day-accent)/.24)] shadow-card"><header className="day-theme__hero border-b border-[rgb(var(--day-accent)/.18)] border-l-4 border-l-[rgb(var(--day-accent))] p-4 sm:p-5"><div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="day-accent-text grid size-14 shrink-0 place-items-center rounded-full border border-[rgb(var(--day-accent)/.2)] bg-white/60 shadow-sm"><ParkMark theme={selectedTheme.id} className="size-9" /></span><div className="min-w-0"><p className="day-accent-text text-[9px] font-bold uppercase tracking-[0.18em]">{specialDay || selectedTheme.eyebrow}</p><h2 className="mt-0.5 truncate text-xl font-semibold text-primary sm:text-3xl">{selectedTheme.isParkDay ? selectedTheme.displayName : hotelName ? "A day at the resort" : "A day to slow down"}</h2><p className="mt-1 text-xs font-semibold text-muted">Day {selectedIndex + 1} · {format(selectedDay.date, "EEEE, MMMM d")}{selectedDay.secondaryParkId ? ` · Hopper to ${parkNames.get(selectedDay.secondaryParkId) ?? "a second park"}` : ""}</p></div></div><span className="day-accent-text hidden font-display text-4xl font-semibold opacity-20 sm:block">{String(selectedIndex + 1).padStart(2, "0")}</span></div></header><div className="p-3 sm:p-5"><DayPlanner tripId={trip.id} dayPlanId={selectedDay.id} parkId={selectedDay.parkId} secondaryParkId={selectedDay.secondaryParkId} parks={parks} items={selectedDay.items} emptyTitle={selectedTheme.emptyTitle} emptyDescription={`${selectedTheme.emptyDescription}${specialDay === "Arrival day" ? " Consider check-in, your transfer, and an easy first meal." : specialDay === "Departure day" ? " Consider checkout, luggage, your transfer, and one last relaxed stop." : ""}`} days={days} /></div></section></main><PlannerSideRail tripId={trip.id} mustDos={trip.mustDos} days={days} activeDayId={selectedDay.id} coachingNote={coachingNote} /></div>}
    </>}
  </div>;
}

function dayMoment(index: number, length: number) { if (length === 1) return "Arrival & departure day"; if (index === 0) return "Arrival day"; if (index === length - 1) return "Departure day"; return null; }
function rhythmCoaching(days: Array<{ parkId: string | null; items: unknown[] }>, selectedIndex: number) { if (selectedIndex < 2 || days[selectedIndex]?.parkId) return null; const previous = days.slice(selectedIndex - 2, selectedIndex); return previous.every((day) => day.parkId && day.items.length >= 5) ? "A quieter day after two full park days could help everyone reset." : null; }
function OverviewIcon() { return <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><rect x="3" y="4" width="7" height="6" rx="1" /><rect x="14" y="4" width="7" height="6" rx="1" /><rect x="3" y="14" width="7" height="6" rx="1" /><rect x="14" y="14" width="7" height="6" rx="1" /></svg>; }
function CalendarIcon() { return <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><path d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></svg>; }
function TicketIcon() { return <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V7Zm6 0v12" /></svg>; }
function SparkleIcon() { return <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm7 12 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></svg>; }
