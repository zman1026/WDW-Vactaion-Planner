import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { buttonStyles } from "@/components/ui/button";
import { resolveDayTheme, themeAccent } from "@/lib/day-themes";
import { requireCurrentUser } from "@/lib/current-user";
import { normalizePartyProfile } from "@/lib/party-profile";
import { prisma } from "@/lib/prisma";
import { calculateTripProgress } from "@/lib/trip-progress";
import { DayPlanner } from "./day-planner";
import { ReservationCenter } from "./reservation-center";
import { TripOverview } from "./trip-overview";
import { TripParty } from "./trip-party";
import { TripSettings } from "./trip-settings";

interface TripPageProps {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ day?: string; view?: string; edit?: string; new?: string; reservation?: string }>;
}

export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { name: true } });
  return { title: trip ? `${trip.name} | WDW Planner` : "Trip Not Found | WDW Planner" };
}

export default async function TripPage({ params, searchParams }: TripPageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const user = await requireCurrentUser();
  const [trip, parks, hotels, directoryStatus] = await Promise.all([
    prisma.trip.findFirst({
      where: { id: tripId, userId: user.id },
      include: {
        companions: { orderBy: { createdAt: "asc" } },
        reservations: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
        mustDos: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] },
        dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } },
      },
    }),
    prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.parkEntity.findMany({ where: { entityType: "HOTEL" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.parkEntity.aggregate({ where: { entityType: "HOTEL" }, _max: { lastSynced: true } }),
  ]);
  if (!trip) notFound();

  const today = startOfDay(new Date());
  const activeToday = today >= startOfDay(trip.startDate) && today <= startOfDay(trip.endDate);
  const actualTodayDay = trip.dayPlans.find((day) => format(day.date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"));
  const requestedDayId = query.day ?? (query.view === "today" ? actualTodayDay?.id : undefined);
  const selectedIndex = Math.max(0, trip.dayPlans.findIndex((day) => day.id === requestedDayId));
  const selectedDay = trip.dayPlans[selectedIndex] ?? trip.dayPlans[0];

  if (query.view === "today") {
    redirect(`/trips/${trip.id}?view=day${selectedDay ? `&day=${selectedDay.id}` : ""}#day-canvas`);
  }
  if (query.view === "reservations" && query.new === "1") {
    const dayId = query.day && trip.dayPlans.some((day) => day.id === query.day) ? query.day : selectedDay?.id;
    redirect(`/trips/${trip.id}?view=day${dayId ? `&day=${dayId}` : ""}#day-canvas`);
  }

  const view: "overview" | "day" | "reservations" = query.view === "reservations" ? "reservations" : query.view === "day" || query.day ? "day" : "overview";
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));
  const hotel = hotels.find((item) => item.id === trip.hotelId);
  const hotelName = trip.customHotelName || hotel?.name || null;
  const nights = differenceInCalendarDays(trip.endDate, trip.startDate);
  const countdown = differenceInCalendarDays(startOfDay(trip.startDate), today);
  const partyProfile = normalizePartyProfile(trip.partyProfile);
  const selectedParkName = selectedDay?.parkId ? parkNames.get(selectedDay.parkId) : null;
  const selectedTheme = resolveDayTheme({ parkName: selectedParkName, hotelName });
  const specialDay = selectedDay ? dayMoment(selectedIndex, trip.dayPlans.length) : null;
  const coachingNote = rhythmCoaching(trip.dayPlans, selectedIndex);
  const days = trip.dayPlans.map((day, index) => ({ id: day.id, label: `Day ${index + 1} · ${format(day.date, "MMM d")}`, date: format(day.date, "yyyy-MM-dd") }));
  const dayIdByDate = new Map(days.map((day) => [day.date, day.id]));
  const reservationSummaries = trip.reservations.map((item) => {
    const date = format(item.date, "yyyy-MM-dd");
    return {
      id: item.id,
      dayPlanId: item.dayPlanId ?? dayIdByDate.get(date) ?? null,
      category: item.category,
      title: item.title,
      date,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status,
      confirmationNumber: item.confirmationNumber,
      location: item.location,
      notes: item.notes,
      costCents: item.costCents,
      partySize: item.partySize,
    };
  });
  const itineraryBookings = trip.dayPlans.flatMap((day) => day.items
    .filter((item) => item.bookingStatus === "BOOKED")
    .map((item) => ({
      id: item.id,
      dayPlanId: day.id,
      title: item.title,
      entityType: item.entityType,
      date: format(day.date, "yyyy-MM-dd"),
      startTime: item.startTime,
      status: item.bookingStatus,
      confirmationNumber: item.confirmationNumber,
      estimatedCostCents: item.estimatedCostCents,
      partySize: item.partySizeOverride,
      notes: item.notes,
    })));
  const visibleReservationSummaries = reservationSummaries.filter((reservation) => {
    const day = trip.dayPlans.find((item) => item.id === reservation.dayPlanId);
    return !day?.items.some((item) => sameItineraryEntry(reservation.title, reservation.startTime, item.title, item.startTime));
  });
  const progress = calculateTripProgress({
    hotelId: trip.hotelId ?? trip.customHotelName,
    budgetCents: trip.budgetCents,
    hasPartyProfile: Boolean(trip.partyProfile),
    mustDoCount: trip.mustDos.length,
    days: trip.dayPlans,
    reservations: reservationSummaries.map((item) => ({ status: item.status, dayPlanId: item.dayPlanId })),
  });
  const continueDay = activeToday && actualTodayDay
    ? actualTodayDay
    : trip.dayPlans.find((day) => day.id === progress.nextAction.dayId) ?? selectedDay;
  const continueHref = `/trips/${trip.id}?view=day${continueDay ? `&day=${continueDay.id}` : ""}#day-canvas`;

  return (
    <div className="planner-page space-y-4">
      <header className="planner-masthead relative rounded-card border border-primary/10 bg-primary p-3 text-white shadow-card">
        <div className="magic-dust absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <Link href="/trips" aria-label="All trips" title="All trips" className="grid size-11 shrink-0 place-items-center rounded-control text-xl font-semibold text-sand hover:bg-white/10">←</Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{trip.name}</h1>
            <p className="truncate text-[11px] text-white/65">
              {format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")} · {nights} nights
              {hotelName ? ` · ${hotelName}` : ""}
            </p>
          </div>
          {view === "overview" ? (
            <Link href={continueHref} className={buttonStyles({ variant: "secondary", size: "sm", className: "shrink-0 border-white/20 bg-white text-primary hover:bg-sand" })}>{activeToday ? "Today" : "Continue"}</Link>
          ) : (
            <Link href={`/trips/${trip.id}`} aria-label="Trip overview" title="Trip overview" className="grid size-11 shrink-0 place-items-center rounded-control border border-white/15 bg-white/10 text-white hover:bg-white/20"><OverviewIcon /></Link>
          )}
          <Link href={`/trips/${trip.id}?view=reservations`} aria-label="Bookings" title="Bookings" aria-current={view === "reservations" ? "page" : undefined} className={`grid size-11 shrink-0 place-items-center rounded-control border ${view === "reservations" ? "border-sand bg-sand text-primary" : "border-white/15 bg-white/10 text-white hover:bg-white/20"}`}><TicketIcon /></Link>
          <details className="group relative shrink-0">
            <summary aria-label="Trip options" title="Trip options" className="grid size-11 cursor-pointer list-none place-items-center rounded-control border border-white/15 bg-white/10 text-2xl leading-none text-white hover:bg-white/20">⋮</summary>
            <div className="absolute right-0 top-12 z-50 w-64 rounded-card border border-border bg-surface p-2 text-ink shadow-lift">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Trip options</p>
              <TripParty tripId={trip.id} companions={trip.companions} triggerLabel="Travel party" triggerClassName="mt-1 w-full justify-start border-0 bg-transparent text-primary shadow-none hover:bg-parchment" />
              <TripSettings
                trip={{
                  id: trip.id,
                  name: trip.name,
                  startDate: format(trip.startDate, "yyyy-MM-dd"),
                  endDate: format(trip.endDate, "yyyy-MM-dd"),
                  budget: trip.budgetCents === null ? "" : (trip.budgetCents / 100).toFixed(2),
                  notes: trip.notes ?? "",
                  hotelId: trip.hotelId,
                  customHotelName: trip.customHotelName,
                  partyProfile,
                }}
                hotels={hotels}
                directoryStatus={{ hotelCount: hotels.length, lastSynced: directoryStatus._max.lastSynced?.toISOString() ?? null }}
                triggerLabel="Trip settings"
                triggerClassName="mt-1 w-full justify-start border-0 bg-transparent text-primary shadow-none hover:bg-parchment"
              />
              <Link href={`/share/${trip.id}`} className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-1 w-full justify-start" })}>Share trip</Link>
            </div>
          </details>
        </div>
        <div className="relative mt-2 flex items-center gap-2 px-1 text-[11px] text-white/65 sm:hidden">
          <span>{trip.companions.length + 1} traveler{trip.companions.length ? "s" : ""}</span>
          {countdown > 0 && <><span>•</span><strong className="text-sand">{countdown} days to go</strong></>}
          {countdown === 0 && <strong className="text-sand">Begins today</strong>}
        </div>
      </header>

      {parks.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-warning/25 bg-warning/5 px-3 py-2 text-sm">
          <span className="font-semibold text-primary">Refresh the WDW directory to choose parks and activities.</span>
          <SyncEntitiesButton />
        </div>
      )}

      {view === "overview" ? (
        <TripOverview
          tripId={trip.id}
          tripNotes={trip.notes}
          hotelName={hotelName}
          reservationCount={visibleReservationSummaries.filter((item) => item.status === "CONFIRMED").length + itineraryBookings.length}
          openReservationCount={visibleReservationSummaries.filter((item) => item.status !== "CONFIRMED").length}
          progress={progress}
          mustDos={trip.mustDos}
          days={trip.dayPlans.map((day) => ({
            id: day.id,
            date: day.date,
            parkName: day.parkId ? parkNames.get(day.parkId) ?? null : null,
            secondaryParkName: day.secondaryParkId ? parkNames.get(day.secondaryParkId) ?? null : null,
            notes: day.notes,
            reservationCount: visibleReservationSummaries.filter((item) => item.dayPlanId === day.id).length,
            items: day.items.map((item) => ({ entityType: item.entityType, title: item.title, timingType: item.timingType, startTime: item.startTime, bookingStatus: item.bookingStatus })),
          }))}
        />
      ) : view === "reservations" ? (
        <ReservationCenter
          key={query.reservation ?? "bookings"}
          tripId={trip.id}
          days={days}
          reservations={reservationSummaries}
          itineraryBookings={itineraryBookings}
          initialReservationId={query.reservation}
        />
      ) : (
        <>
          {selectedDay && (
            <nav className="day-filmstrip sticky top-[65px] z-30 -mx-4 overflow-x-auto border-y border-border/80 bg-parchment/95 px-4 py-2 shadow-[0_6px_18px_rgba(35,29,20,.05)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Trip days">
              <ol className="flex min-w-max snap-x snap-mandatory gap-1.5">
                {trip.dayPlans.map((day, index) => {
                  const active = day.id === selectedDay.id;
                  const parkName = day.parkId ? parkNames.get(day.parkId) : null;
                  const theme = resolveDayTheme({ parkName, hotelName });
                  return (
                    <li key={day.id} className="snap-start">
                      <Link href={`/trips/${trip.id}?view=day&day=${day.id}#day-canvas`} aria-current={active ? "date" : undefined} className={`flex min-h-11 min-w-[5rem] items-center gap-2 rounded-control border px-2.5 py-1.5 transition ${active ? "border-primary/30 bg-surface shadow-card ring-2 ring-gold/15" : "border-transparent hover:border-border hover:bg-surface/70"}`}>
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: themeAccent(theme) }} aria-hidden="true" />
                        <span><strong className="block text-[11px] text-primary">Day {index + 1}</strong><span className="block text-[10px] text-muted">{format(day.date, "EEE d")}</span></span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {selectedDay && (
            <main id="day-canvas" data-theme={selectedTheme.id} data-pattern={selectedTheme.pattern} className="day-theme day-canvas-enter min-w-0 rounded-[1.25rem] border border-[rgb(var(--day-accent)/.24)] p-2 shadow-card sm:p-3">
              <DayPlanner
                tripId={trip.id}
                dayPlanId={selectedDay.id}
                dayNumber={selectedIndex + 1}
                dateLabel={format(selectedDay.date, "EEE, MMM d")}
                themeId={selectedTheme.id}
                parkId={selectedDay.parkId}
                secondaryParkId={selectedDay.secondaryParkId}
                parks={parks}
                items={selectedDay.items}
                reservations={visibleReservationSummaries.filter((item) => item.dayPlanId === selectedDay.id)}
                days={days}
                mustDos={trip.mustDos}
                coachingNote={coachingNote}
                initialEditorItemId={query.edit}
                emptyTitle={selectedTheme.emptyTitle}
                emptyDescription={`${selectedTheme.emptyDescription}${specialDay === "Arrival day" ? " Start with check-in, travel, or an easy meal." : specialDay === "Departure day" ? " Keep checkout, travel, and one last relaxed stop in mind." : ""}`}
              />
            </main>
          )}
        </>
      )}
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
  return previous.every((day) => day.parkId && day.items.length >= 5) ? "A quieter day after two full park days could help everyone reset." : null;
}

function OverviewIcon() {
  return <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><rect x="3" y="4" width="7" height="6" rx="1" /><rect x="14" y="4" width="7" height="6" rx="1" /><rect x="3" y="14" width="7" height="6" rx="1" /><rect x="14" y="14" width="7" height="6" rx="1" /></svg>;
}

function TicketIcon() {
  return <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V7Zm6 0v12" /></svg>;
}

function sameItineraryEntry(firstTitle: string, firstTime: string | null, secondTitle: string, secondTime: string | null) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return normalize(firstTitle) === normalize(secondTitle) && (firstTime ?? "") === (secondTime ?? "");
}
