import { format } from "date-fns";
import Link from "next/link";
import { ParkMark } from "@/components/park-mark";
import { Badge, ParkChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { getCurrentUser } from "@/lib/current-user";
import { resolveDayTheme } from "@/lib/day-themes";
import { getDescendantEntityIds } from "@/lib/entity-hierarchy";
import { prisma } from "@/lib/prisma";
import { getEntityLive } from "@/lib/themeparks";
import { AddToDay } from "./add-to-day";

export const dynamic = "force-dynamic";
const TYPES = ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ park?: string; type?: string; q?: string; live?: string }> }) {
  const params = await searchParams;
  const [parks, user, syncInfo] = await Promise.all([
    prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getCurrentUser(),
    prisma.parkEntity.aggregate({ _max: { lastSynced: true } }),
  ]);
  const trips = user ? await prisma.trip.findMany({ where: { userId: user.id }, orderBy: { startDate: "asc" }, select: { id: true, name: true, dayPlans: { orderBy: { date: "asc" }, select: { id: true, date: true, parkId: true } } } }) : [];
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));
  const dayOptions = trips.flatMap((trip) => trip.dayPlans.map((day, index) => ({ id: day.id, tripName: trip.name, dayNumber: index + 1, dateLabel: format(day.date, "MMM d"), parkName: day.parkId ? parkNames.get(day.parkId) ?? null : null })));
  const type = params.type && TYPES.includes(params.type) ? params.type : undefined;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const parkDescendants = params.park ? await getDescendantEntityIds(params.park) : undefined;
  const entities = await prisma.parkEntity.findMany({ where: { entityType: type ?? { in: TYPES }, ...(parkDescendants ? { id: { in: parkDescendants } } : {}), ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) }, orderBy: [{ entityType: "asc" }, { name: "asc" }], take: 100, select: { id: true, name: true, entityType: true, parentId: true, description: true } });
  let liveById = new Map<string, { status?: string; wait?: number | null; showtimes?: unknown[] }>();
  let liveError: string | null = null;
  if (params.live === "1" && params.park) {
    try { const result = await getEntityLive(params.park); liveById = new Map(result.liveData.map((entry) => [entry.id, { status: entry.status, wait: entry.queue?.STANDBY?.waitTime, showtimes: entry.showtimes }])); }
    catch { liveError = "Live status is temporarily unavailable."; }
  }
  return <div className="space-y-8">
    <header className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">The WDW directory</p><h1 className="mt-2 text-4xl font-semibold text-primary sm:text-5xl">Explore the parks</h1><p className="mt-3 leading-relaxed text-muted">Browse by place, check an optional live layer, and send an idea straight to a trip day.</p>{syncInfo._max.lastSynced && <p className="mt-2 text-xs text-muted">Directory refreshed {format(syncInfo._max.lastSynced, "MMM d, yyyy 'at' h:mm a")}</p>}</header>
    {parks.length === 0 && <Card className="space-y-4 border-dashed border-gold/35 bg-sand/10 p-7 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-sand/30 text-primary"><span className="font-display text-xl">W</span></div><div><p className="font-display text-xl font-semibold text-primary">The park guide is ready for its first refresh</p><p className="mx-auto mt-1 max-w-lg text-sm text-muted">Load the directory once to unlock parks, dining, attractions, shows, resort choices, and day planning.</p></div><div><SyncEntitiesButton /></div></Card>}
    {parks.length > 0 && <section aria-labelledby="park-hubs-title"><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Choose a place</p><h2 id="park-hubs-title" className="mt-1 text-2xl font-semibold text-primary">Park guides</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{parks.map((park) => { const theme = resolveDayTheme({ parkName: park.name }); return <Link key={park.id} href={`/explore?park=${park.id}`} data-theme={theme.id} data-pattern={theme.pattern} className="day-theme day-theme__hero group rounded-card border p-5 shadow-card transition hover:-translate-y-1 hover:shadow-lift"><div className="flex items-start justify-between gap-3"><span className="day-accent-text grid size-12 place-items-center rounded-full border border-[rgb(var(--day-accent)/.2)] bg-white/60"><ParkMark theme={theme.id} className="size-8" /></span><span className="day-accent-text text-lg transition group-hover:translate-x-1">→</span></div><p className="day-accent-text mt-5 text-[10px] font-bold uppercase tracking-[0.18em]">{theme.eyebrow}</p><h3 className="mt-2 font-display text-xl font-semibold text-primary">{park.name}</h3><p className="mt-3 text-xs font-semibold text-muted">Browse attractions, dining, and shows</p></Link>; })}</div></section>}
    <Card className="p-5"><form className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto]"><label className="text-xs font-bold uppercase tracking-wide text-muted">Park<Select name="park" defaultValue={params.park ?? ""} className="mt-1.5 font-normal normal-case"><option value="">All parks</option>{parks.map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}</Select></label><label className="text-xs font-bold uppercase tracking-wide text-muted">Category<Select name="type" defaultValue={type ?? ""} className="mt-1.5 font-normal normal-case"><option value="">All categories</option>{TYPES.map((value) => <option key={value} value={value}>{typeLabel(value)}</option>)}</Select></label><label className="text-xs font-bold uppercase tracking-wide text-muted">Search<Input name="q" defaultValue={query} placeholder="Search by name…" className="mt-1.5 font-normal normal-case" /></label><div className="flex items-end gap-3"><Button type="submit">Search</Button>{params.park && <label className="mb-2 flex min-h-11 items-center gap-1.5 text-xs text-muted"><input type="checkbox" name="live" value="1" defaultChecked={params.live === "1"} /> Live</label>}</div></form></Card>
    {liveError && <p className="rounded-control border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{liveError}</p>}
    <div className="flex items-center justify-between"><p className="text-sm text-muted">{entities.length} result{entities.length === 1 ? "" : "s"}</p>{params.park && <ParkChip name={parkNames.get(params.park)} />}</div>
    {entities.length === 0 ? <Card className="p-8 text-center text-sm text-muted">Nothing matches those choices.</Card> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{entities.map((entity) => { const live = liveById.get(entity.id); return <li key={entity.id}><Card className="h-full p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-xl font-semibold text-primary">{entity.name}</h2><Badge>{typeLabel(entity.entityType)}</Badge></div><p className="mt-2 text-xs font-semibold text-muted">{parkNames.get(entity.parentId ?? "") ?? "Walt Disney World"}</p>{entity.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{entity.description}</p>}{live && <div className="mt-4 rounded-control border border-success/20 bg-success/5 p-2.5 text-xs text-success"><strong>{live.status ?? "Live"}</strong>{live.wait != null ? ` · ${live.wait} min standby` : ""}{live.showtimes?.length ? ` · ${live.showtimes.length} showtimes` : ""}</div>}{user && <AddToDay entity={{ id: entity.id, name: entity.name, entityType: entity.entityType }} days={dayOptions} />}</Card></li>; })}</ul>}
  </div>;
}

function typeLabel(value: string) {
  return ({ ATTRACTION: "Attraction", RESTAURANT: "Dining", SHOW: "Show", EXPERIENCE: "Experience" } as Record<string, string>)[value] ?? "Experience";
}
