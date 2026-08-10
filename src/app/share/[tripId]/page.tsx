import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { normalizePartyProfile, partyProfileSummary } from "@/lib/party-profile";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared trip | WDW Planner", robots: { index: false, follow: false } };

export default async function SharedTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } } } });
  if (!trip) notFound();
  const parks = await prisma.parkEntity.findMany({ where: { id: { in: [...trip.dayPlans.flatMap((day) => day.parkId ? [day.parkId] : []), ...(trip.hotelId ? [trip.hotelId] : [])] } }, select: { id: true, name: true } });
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));
  const partySummary = partyProfileSummary(normalizePartyProfile(trip.partyProfile));

  return <article className="mx-auto max-w-4xl space-y-8 print:max-w-none print:text-black">
    <header className="border-b pb-6"><p className="text-sm font-semibold uppercase tracking-widest text-purple-700">WDW Planner itinerary</p><h1 className="mt-2 text-4xl font-bold">{trip.name}</h1><p className="mt-2 text-slate-600">{format(trip.startDate, "MMMM d, yyyy")} – {format(trip.endDate, "MMMM d, yyyy")}</p></header>
    {trip.hotelId && <p className="font-semibold text-purple-700">Hotel: {parkNames.get(trip.hotelId) ?? "WDW resort hotel"}</p>}
    {trip.notes && <p className="whitespace-pre-wrap rounded-xl bg-slate-100 p-4 text-sm">{trip.notes}</p>}
    {trip.partyProfile != null && <section className="break-inside-avoid rounded-xl border bg-white p-4"><h2 className="font-bold">Travel party</h2><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{partySummary}</p></section>}
    <ol className="space-y-6">{trip.dayPlans.map((day, index) => <li key={day.id} className="break-inside-avoid rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">Day {index + 1}: {format(day.date, "EEEE, MMMM d")}</h2><p className="mt-1 font-semibold text-purple-700">{day.parkId ? parkNames.get(day.parkId) ?? "Park day" : "Rest day"}</p>
      {day.items.length === 0 ? <p className="mt-4 text-sm text-slate-500">No scheduled items.</p> : <ol className="mt-4 space-y-3">{day.items.map((item) => <li key={item.id} className="flex gap-4 border-t pt-3"><span className="w-28 shrink-0 text-sm font-semibold">{shareTiming(item)}</span><div><p className="font-semibold">{item.title}</p><p className="text-xs text-slate-500">{item.entityType}{item.timingType === "EXACT" && item.endTime ? ` · until ${item.endTime}` : ""}</p>{item.notes && <p className="mt-1 text-sm text-slate-600">{item.notes}</p>}</div></li>)}</ol>}
    </li>)}</ol>
    <footer className="border-t pt-4 text-xs text-slate-500">Shared from WDW Planner. Verify park hours and reservations in the official My Disney Experience app.</footer>
  </article>;
}

function shareTiming(item: { timingType: string; timeOfDay: string | null; startTime: string | null }) {
  if (item.timingType === "EXACT") return item.startTime ?? "Fixed time";
  if (item.timingType === "TIME_OF_DAY" && item.timeOfDay) return item.timeOfDay.charAt(0) + item.timeOfDay.slice(1).toLowerCase();
  return "Anytime";
}
