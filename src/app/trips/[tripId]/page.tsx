import { differenceInCalendarDays, format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { normalizePartyProfile } from "@/lib/party-profile";

import { DayPlanner } from "./day-planner";
import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { TripSettings } from "./trip-settings";

interface TripPageProps {
  params: Promise<{ tripId: string }>;
}

export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { name: true },
  });

  return { title: trip ? `${trip.name} | WDW Planner` : "Trip Not Found | WDW Planner" };
}

export default async function TripPage({ params }: TripPageProps) {
  const { tripId } = await params;
  const user = await requireCurrentUser();
  const [trip, parks, hotels] = await Promise.all([prisma.trip.findFirst({
    where: { id: tripId, userId: user.id },
    include: {
      dayPlans: {
        orderBy: { date: "asc" },
        include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
      },
    },
  }), prisma.parkEntity.findMany({
    where: { entityType: "PARK" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  }), prisma.parkEntity.findMany({
    where: { entityType: "HOTEL" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })]);

  if (!trip) notFound();

  const numberOfNights = differenceInCalendarDays(trip.endDate, trip.startDate);
  const plannedCostCents = trip.dayPlans.reduce((total, day) => total + day.items.reduce((dayTotal, item) => dayTotal + (item.estimatedCostCents ?? 0), 0), 0);
  const budget =
    trip.budgetCents === null
      ? null
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          trip.budgetCents / 100,
        );
  const selectedHotel = hotels.find((hotel) => hotel.id === trip.hotelId);
  const partyProfile = normalizePartyProfile(trip.partyProfile);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
        <div className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Your vacation plan</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{trip.name}</h1>
          <p className="mt-3 text-lg text-slate-600">
            {format(trip.startDate, "MMMM d, yyyy")} – {format(trip.endDate, "MMMM d, yyyy")}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <Summary label="Days" value={String(trip.dayPlans.length)} />
            <Summary label="Nights" value={String(numberOfNights)} />
            <Summary label="Total budget" value={budget ?? "Not set"} />
          </dl>
          {selectedHotel && <p className="mt-4 rounded-xl bg-purple-50 p-4 text-sm text-purple-900"><span className="font-semibold">Hotel:</span> {selectedHotel.name}</p>}
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-blue-950">Planned itinerary cost</span>
              <span className="font-bold text-blue-950">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(plannedCostCents / 100)}{trip.budgetCents !== null ? ` of ${budget}` : ""}</span>
            </div>
            {trip.budgetCents !== null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"><div className={`h-full rounded-full ${plannedCostCents > trip.budgetCents ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${Math.min(100, trip.budgetCents === 0 ? (plannedCostCents ? 100 : 0) : plannedCostCents / trip.budgetCents * 100)}%` }} /></div>}
            {trip.budgetCents !== null && plannedCostCents > trip.budgetCents && <p className="mt-2 text-xs font-semibold text-red-700">This plan is over budget by {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((plannedCostCents - trip.budgetCents) / 100)}.</p>}
          </div>

          {trip.notes && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-700">Family notes</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{trip.notes}</p>
            </div>
          )}
          <a href={`/share/${trip.id}`} className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline">Open printable share view →</a>
        </div>
      </section>

      <TripSettings trip={{ id: trip.id, name: trip.name, startDate: format(trip.startDate, "yyyy-MM-dd"), endDate: format(trip.endDate, "yyyy-MM-dd"), budget: trip.budgetCents === null ? "" : (trip.budgetCents / 100).toFixed(2), notes: trip.notes ?? "", hotelId: trip.hotelId, partyProfile }} hotels={hotels} />

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Your days</h2>
            <p className="mt-1 text-sm text-slate-600">Each day is ready for parks, dining, and family favorites.</p>
          </div>
          {parks.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="mb-3 text-sm font-semibold text-amber-900">The WDW directory is empty. Sync it now to assign parks, hotels, and itinerary items.</p><SyncEntitiesButton /></div>
          )}
        </div>

        <ol className="space-y-5">
          {trip.dayPlans.map((dayPlan, index) => (
            <li key={dayPlan.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                  {index + 1}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Day {index + 1}</p>
                  <h3 className="font-semibold text-slate-900">{format(dayPlan.date, "EEEE, MMMM d")}</h3>
                </div>
              </div>
              <DayPlanner tripId={trip.id} dayPlanId={dayPlan.id} parkId={dayPlan.parkId} parks={parks} items={dayPlan.items} days={trip.dayPlans.map((day, dayIndex) => ({ id: day.id, label: `Day ${dayIndex + 1} · ${format(day.date, "MMM d")}` }))} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-slate-900">{value}</dd>
    </div>
  );
}
