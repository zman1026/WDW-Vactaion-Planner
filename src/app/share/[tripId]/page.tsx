import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveDayTheme } from "@/lib/day-themes";
import { prisma } from "@/lib/prisma";
import { normalizePartyProfile, partyProfileSummary } from "@/lib/party-profile";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared trip | WDW Planner", robots: { index: false, follow: false } };

export default async function SharedTripPage({ params, searchParams }: { params: Promise<{ tripId: string }>; searchParams: Promise<{ costs?: string }> }) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { companions: { orderBy: { createdAt: "asc" } }, reservations: { orderBy: [{ date: "asc" }, { startTime: "asc" }] }, dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } } } });
  if (!trip) notFound();

  const entityIds = [...trip.dayPlans.flatMap((day) => [day.parkId, day.secondaryParkId].filter((id): id is string => Boolean(id))), ...(trip.hotelId ? [trip.hotelId] : [])];
  const entities = await prisma.parkEntity.findMany({ where: { id: { in: entityIds } }, select: { id: true, name: true } });
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));
  const hotelName = trip.customHotelName || (trip.hotelId ? names.get(trip.hotelId) : null);
  const partySummary = partyProfileSummary(normalizePartyProfile(trip.partyProfile));
  const showCosts = query.costs !== "hide";

  return <article className="mx-auto max-w-5xl space-y-8 print:max-w-none print:text-black">
    <header className="relative overflow-hidden rounded-card border border-gold/30 bg-primary px-6 py-10 text-white shadow-lift print:border-primary print:bg-white print:text-black print:shadow-none sm:px-10 sm:py-12">
      <div className="absolute -right-16 -top-24 size-72 rounded-full border border-sand/15" /><div className="absolute -right-4 -top-12 size-44 rounded-full border border-sand/15" />
      <div className="relative flex flex-wrap items-start justify-between gap-6"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.24em] text-sand print:text-gold">A family trip program · View only</p><h1 className="mt-3 text-4xl font-semibold sm:text-6xl">{trip.name}</h1><p className="mt-4 font-display text-xl text-sand print:text-primary">{format(trip.startDate, "MMMM d, yyyy")} – {format(trip.endDate, "MMMM d, yyyy")}</p>{hotelName && <p className="mt-3 text-sm text-white/80 print:text-muted">Home base · {hotelName}</p>}</div><PrintButton /></div>
    </header>

    {(trip.notes || trip.partyProfile != null) && <section className="grid gap-4 sm:grid-cols-2">
      {trip.notes && <div className="rounded-control border-l-4 border-l-gold bg-sand/15 p-5"><p className="text-xs font-bold uppercase tracking-wider text-gold">A note for the family</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{trip.notes}</p></div>}
      {trip.partyProfile != null && <div className="rounded-control border border-border bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-gold">Travel party</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{partySummary}</p></div>}
    </section>}

    {trip.companions.length > 0 && <section className="rounded-control border border-border bg-surface px-4 py-3 text-sm shadow-card"><strong className="text-primary">Travel party:</strong> You, {trip.companions.map((person) => person.name).join(", ")}</section>}

    <div className="no-print flex justify-end"><Link href={`/share/${trip.id}${showCosts ? "?costs=hide" : ""}`} className="text-xs font-semibold text-primary underline decoration-gold/50 underline-offset-4">{showCosts ? "Hide costs for family sharing" : "Show estimated costs"}</Link></div>
    <ol className="space-y-7">{trip.dayPlans.map((day, index) => {
      const parkName = day.parkId ? names.get(day.parkId) : null;
      const secondParkName = day.secondaryParkId ? names.get(day.secondaryParkId) : null;
      const theme = resolveDayTheme({ parkName, hotelName });
      const moment = dayMoment(index, trip.dayPlans.length);
      const dayReservations = trip.reservations.filter((item) => item.dayPlanId === day.id || format(item.date, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd"));
      const entries = [
        ...day.items.map((item, itemIndex) => ({ kind: "plan" as const, item, order: sharedPlanOrder(item, itemIndex) })),
        ...dayReservations.map((item) => ({ kind: "reservation" as const, item, order: sharedReservationOrder(item.startTime) })),
      ].sort((a, b) => a.order - b.order);
      return <li key={day.id} data-theme={theme.id} data-pattern={theme.pattern} className="day-theme share-day overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <header className="day-theme__hero px-5 py-6 sm:px-7">
          <p className="day-accent-text text-[10px] font-bold uppercase tracking-[0.2em]">{moment || theme.eyebrow}</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold text-primary sm:text-3xl">{theme.isParkDay ? theme.displayName : hotelName ? `${hotelName} · Resort day` : "Resort day"}</h2><p className="mt-1 text-sm text-muted">Day {index + 1} · {format(day.date, "EEEE, MMMM d")}{secondParkName ? ` · Hopper to ${secondParkName}` : ""}</p></div><span className="rounded-full border border-[rgb(var(--day-accent)/.24)] bg-white/60 px-3 py-1 text-xs font-bold text-[rgb(var(--day-accent-deep))]">{entries.length} thing{entries.length === 1 ? "" : "s"} planned</span></div>
        </header>
        {entries.length === 0 ? <p className="px-5 py-6 text-sm italic text-muted sm:px-7">{theme.emptyDescription}</p> : <ol className="px-5 py-3 sm:px-7">{entries.map((entry) => {
          if (entry.kind === "reservation") {
            const item = entry.item;
            return <li key={`reservation-${item.id}`} className="grid break-inside-avoid gap-1 border-t border-[rgb(var(--day-accent)/.16)] py-4 first:border-t-0 sm:grid-cols-[8rem_1fr] sm:gap-5">
              <span className="day-accent-text text-sm font-bold">{item.startTime ? displayTime(item.startTime) : "Time to be set"}</span>
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-primary">{item.title}</p><span className="rounded-full border border-gold/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">{reservationLabel(item.category)}</span><span className={`text-[10px] font-bold uppercase tracking-wider ${item.status === "CONFIRMED" ? "text-success" : "text-warning"}`}>{item.status === "CONFIRMED" ? "Confirmed" : item.status === "PENDING" ? "Needs action" : "Wish list"}</span></div>{item.location && <p className="mt-1 text-xs text-muted">{item.location}</p>}{item.confirmationNumber && <p className="mt-1 text-xs font-semibold text-primary">Confirmation {item.confirmationNumber}{item.partySize ? ` · Party of ${item.partySize}` : ""}</p>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{item.notes}</p>}{showCosts && item.costCents !== null && <p className="mt-1 text-xs text-muted">Estimated ${(item.costCents / 100).toFixed(2)}</p>}</div>
            </li>;
          }
          const item = entry.item;
          return <li key={`plan-${item.id}`} className="grid break-inside-avoid gap-1 border-t border-[rgb(var(--day-accent)/.16)] py-4 first:border-t-0 sm:grid-cols-[8rem_1fr] sm:gap-5">
            <span className="day-accent-text text-sm font-bold">{shareTiming(item)}</span>
            <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-primary">{item.title}</p><span className="rounded-full border border-[rgb(var(--day-accent)/.2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--day-accent-deep))]">{itemLabel(item.entityType)}</span>{item.bookingStatus === "BOOKED" && <span className="text-[10px] font-bold uppercase tracking-wider text-success">Booked</span>}{item.paidExtraType && <span className="text-[10px] font-bold uppercase tracking-wider text-gold">{item.paidExtraType.replaceAll("_", " ")}</span>}</div>{item.timingType === "EXACT" && item.endTime && <p className="mt-1 text-xs text-muted">Planned until {displayTime(item.endTime)}</p>}{item.confirmationNumber && <p className="mt-1 text-xs font-semibold text-primary">Confirmation {item.confirmationNumber}{item.partySizeOverride ? ` · Party of ${item.partySizeOverride}` : ""}</p>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{item.notes}</p>}{showCosts && item.estimatedCostCents !== null && <p className="mt-1 text-xs text-muted">Estimated ${(item.estimatedCostCents / 100).toFixed(2)}</p>}</div>
          </li>;
        })}</ol>}
      </li>;
    })}</ol>
    <footer className="border-t border-border pt-5 text-xs leading-relaxed text-muted">Made with WDW Planner. This unlisted itinerary is shared only with people who have its link. Verify park hours, reservations, and availability in the official My Disney Experience app.</footer>
  </article>;
}

function shareTiming(item: { timingType: string; timeOfDay: string | null; startTime: string | null }) {
  if (item.timingType === "EXACT") return item.startTime ? displayTime(item.startTime) : "Fixed time";
  if (item.timingType === "TIME_OF_DAY" && item.timeOfDay) return item.timeOfDay.charAt(0) + item.timeOfDay.slice(1).toLowerCase();
  return "Anytime";
}

function sharedPlanOrder(item: { timingType: string; timeOfDay: string | null; startTime: string | null }, index: number) {
  if (item.startTime) return timeValue(item.startTime);
  if (item.timeOfDay === "MORNING") return 8 * 60 + index;
  if (item.timeOfDay === "AFTERNOON") return 13 * 60 + index;
  if (item.timeOfDay === "EVENING") return 18 * 60 + index;
  return 24 * 60 + index;
}

function sharedReservationOrder(startTime: string | null) {
  return startTime ? timeValue(startTime) : 25 * 60;
}

function timeValue(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function displayTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
}

function reservationLabel(type: string) {
  return ({ DINING: "Dining", HOTEL: "Hotel", FLIGHT: "Flight", TRANSPORT: "Transportation", TICKET: "Tickets", EVENT: "Special event", OTHER: "Reservation" } as Record<string, string>)[type] ?? "Reservation";
}

function itemLabel(type: string) {
  if (type === "RESTAURANT") return "Dining";
  if (type === "SHOW") return "Moment";
  if (type === "ATTRACTION") return "Attraction";
  return "Experience";
}

function dayMoment(index: number, length: number) {
  if (length === 1) return "Arrival & departure day";
  if (index === 0) return "Arrival day";
  if (index === length - 1) return "Departure day";
  return null;
}
