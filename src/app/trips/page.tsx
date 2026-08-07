import { differenceInCalendarDays, format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Trips | WDW Planner" };
export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function TripsPage() {
  const user = await requireCurrentUser();
  const trips = await prisma.trip.findMany({
    where: { userId: user.id },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { dayPlans: true } } },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Your adventures</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">My trips</h1>
          <p className="mt-2 text-slate-600">Pick up where you left off or start planning something new.</p>
        </div>
        <Link href="/trips/new" className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700">Plan a new trip</Link>
      </header>

      {trips.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <h2 className="text-xl font-bold">No trips yet</h2>
          <p className="mt-2 text-slate-600">Create your first vacation and we’ll prepare every planning day.</p>
          <Link href="/trips/new" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">Create your first trip →</Link>
        </section>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {trips.map((trip) => (
            <li key={trip.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
              <div className="p-6">
                <h2 className="text-xl font-bold">{trip.name}</h2>
                <p className="mt-2 text-slate-600">{format(trip.startDate, "MMM d, yyyy")} – {format(trip.endDate, "MMM d, yyyy")}</p>
                <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <TripStat label="Days" value={String(trip._count.dayPlans)} />
                  <TripStat label="Nights" value={String(differenceInCalendarDays(trip.endDate, trip.startDate))} />
                  <TripStat label="Budget" value={trip.budgetCents === null ? "Not set" : currency.format(trip.budgetCents / 100)} />
                </dl>
                <Link href={`/trips/${trip.id}`} className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Continue planning</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TripStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>;
}
