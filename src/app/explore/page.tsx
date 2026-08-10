import { Badge, ParkChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { SyncEntitiesButton } from "@/components/sync-entities-button";
import { getDescendantEntityIds } from "@/lib/entity-hierarchy";
import { prisma } from "@/lib/prisma";
import { getEntityLive } from "@/lib/themeparks";

export const dynamic = "force-dynamic";
const TYPES = ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ park?: string; type?: string; q?: string; live?: string }> }) {
  const params = await searchParams;
  const parks = await prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const type = params.type && TYPES.includes(params.type) ? params.type : undefined;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const parkDescendants = params.park ? await getDescendantEntityIds(params.park) : undefined;
  const entities = await prisma.parkEntity.findMany({ where: { entityType: type ?? { in: TYPES }, ...(parkDescendants ? { id: { in: parkDescendants } } : {}), ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) }, orderBy: [{ entityType: "asc" }, { name: "asc" }], take: 100, select: { id: true, name: true, entityType: true, parentId: true, description: true } });
  let liveById = new Map<string, { status?: string; wait?: number | null; showtimes?: unknown[] }>(); let liveError: string | null = null;
  if (params.live === "1" && params.park) { try { const result = await getEntityLive(params.park); liveById = new Map(result.liveData.map((entry) => [entry.id, { status: entry.status, wait: entry.queue?.STANDBY?.waitTime, showtimes: entry.showtimes }])); } catch { liveError = "Live status is temporarily unavailable."; } }
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));

  return <div className="space-y-8"><header className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">The WDW directory</p><h1 className="mt-2 text-4xl font-semibold text-primary sm:text-5xl">Explore the parks</h1><p className="mt-3 leading-relaxed text-muted">Get familiar with attractions, restaurants, shows, and experiences before adding them to a day.</p></header>
    {parks.length === 0 && <Card className="space-y-3 border-warning/30 bg-warning/5 p-5"><div><p className="font-semibold text-primary">Park data has not been synced yet.</p><p className="mt-1 text-sm text-muted">Load the WDW directory to start browsing.</p></div><SyncEntitiesButton /></Card>}
    <Card className="p-5"><form className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto]"><label className="text-xs font-bold uppercase tracking-wide text-muted">Park<Select name="park" defaultValue={params.park ?? ""} className="mt-1.5 font-normal normal-case"><option value="">All parks</option>{parks.map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}</Select></label><label className="text-xs font-bold uppercase tracking-wide text-muted">Category<Select name="type" defaultValue={type ?? ""} className="mt-1.5 font-normal normal-case"><option value="">All categories</option>{TYPES.map((value) => <option key={value}>{value}</option>)}</Select></label><label className="text-xs font-bold uppercase tracking-wide text-muted">Search<Input name="q" defaultValue={query} placeholder="Space Mountain…" className="mt-1.5 font-normal normal-case" /></label><div className="flex items-end gap-3"><Button type="submit">Search</Button>{params.park && <label className="mb-2 flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" name="live" value="1" defaultChecked={params.live === "1"} /> Live</label>}</div></form></Card>
    {liveError && <p className="rounded-control border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{liveError}</p>}
    <div className="flex items-center justify-between"><p className="text-sm text-muted">{entities.length} result{entities.length === 1 ? "" : "s"}</p>{params.park && <ParkChip name={parkNames.get(params.park)} />}</div>
    {entities.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No offerings match these filters.</Card> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{entities.map((entity) => { const live = liveById.get(entity.id); return <li key={entity.id}><Card className="h-full p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-xl font-semibold text-primary">{entity.name}</h2><Badge>{entity.entityType}</Badge></div><p className="mt-2 text-xs font-semibold text-muted">{parkNames.get(entity.parentId ?? "") ?? "Walt Disney World"}</p>{entity.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{entity.description}</p>}{live && <div className="mt-4 rounded-control border border-success/20 bg-success/5 p-2.5 text-xs text-success"><strong>{live.status ?? "Live"}</strong>{live.wait != null ? ` · ${live.wait} min standby` : ""}{live.showtimes?.length ? ` · ${live.showtimes.length} showtimes` : ""}</div>}</Card></li>; })}</ul>}
  </div>;
}
