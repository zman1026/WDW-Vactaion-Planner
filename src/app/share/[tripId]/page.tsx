import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ParkChip } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { normalizePartyProfile, partyProfileSummary } from "@/lib/party-profile";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared trip | WDW Planner", robots: { index: false, follow: false } };

export default async function SharedTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { dayPlans: { orderBy: { date: "asc" }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } } } });
  if (!trip) notFound();
  const entities = await prisma.parkEntity.findMany({ where: { id: { in: [...trip.dayPlans.flatMap((day) => day.parkId ? [day.parkId] : []), ...(trip.hotelId ? [trip.hotelId] : [])] } }, select: { id: true, name: true } });
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));
  const partySummary = partyProfileSummary(normalizePartyProfile(trip.partyProfile));

  return <article className="mx-auto max-w-4xl space-y-8 print:max-w-none print:text-black"><header className="border-b border-gold/40 pb-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">WDW Planner itinerary</p><h1 className="mt-2 text-4xl font-semibold text-primary">{trip.name}</h1><p className="mt-2 text-muted">{format(trip.startDate, "MMMM d, yyyy")} – {format(trip.endDate, "MMMM d, yyyy")}</p></div><PrintButton /></div></header>{trip.hotelId && <ParkChip name={names.get(trip.hotelId) ?? "WDW resort hotel"} />}{trip.notes && <p className="whitespace-pre-wrap rounded-control border-l-4 border-l-gold bg-sand/15 p-4 text-sm">{trip.notes}</p>}{trip.partyProfile != null && <section className="break-inside-avoid rounded-control border border-border bg-surface p-4"><h2 className="font-display text-xl font-semibold text-primary">Travel party</h2><p className="mt-2 whitespace-pre-line text-sm text-muted">{partySummary}</p></section>}<ol className="space-y-6">{trip.dayPlans.map((day, index) => <li key={day.id} className="break-inside-avoid rounded-card border border-border bg-surface p-5 shadow-card print:shadow-none"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-2xl font-semibold text-primary">Day {index + 1}: {format(day.date, "EEEE, MMMM d")}</h2><ParkChip name={day.parkId ? names.get(day.parkId) : null} /></div>{day.items.length === 0 ? <p className="mt-4 text-sm text-muted">No scheduled items.</p> : <ol className="mt-5 space-y-3">{day.items.map((item) => <li key={item.id} className="flex gap-4 border-t border-border pt-3"><span className="w-28 shrink-0 text-sm font-semibold text-gold">{shareTiming(item)}</span><div><p className="font-semibold text-primary">{item.title}</p><p className="text-xs text-muted">{item.entityType}{item.timingType === "EXACT" && item.endTime ? ` · until ${item.endTime}` : ""}</p>{item.notes && <p className="mt-1 text-sm text-muted">{item.notes}</p>}</div></li>)}</ol>}</li>)}</ol><footer className="border-t border-border pt-4 text-xs text-muted">Shared from WDW Planner. Verify park hours and reservations in the official My Disney Experience app.</footer></article>;
}
function shareTiming(item: { timingType: string; timeOfDay: string | null; startTime: string | null }) { if (item.timingType === "EXACT") return item.startTime ?? "Fixed time"; if (item.timingType === "TIME_OF_DAY" && item.timeOfDay) return item.timeOfDay.charAt(0) + item.timeOfDay.slice(1).toLowerCase(); return "Anytime"; }
