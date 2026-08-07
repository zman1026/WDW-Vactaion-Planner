import { differenceInCalendarDays, format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

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
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      dayPlans: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!trip) notFound();

  const numberOfNights = differenceInCalendarDays(trip.endDate, trip.startDate);
  const budget =
    trip.budgetCents === null
      ? null
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          trip.budgetCents / 100,
        );

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

          {trip.notes && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-700">Family notes</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{trip.notes}</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Your days</h2>
            <p className="mt-1 text-sm text-slate-600">Each day is ready for parks, dining, and family favorites.</p>
          </div>
          <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">Planning canvas ready</span>
        </div>

        <ol className="grid gap-4 md:grid-cols-2">
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
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No plans yet — this day is yours to shape.
              </div>
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
