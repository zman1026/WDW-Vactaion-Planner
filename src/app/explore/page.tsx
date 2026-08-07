import { getEntityLive } from "@/lib/themeparks";
import { prisma } from "@/lib/prisma";
import { getDescendantEntityIds } from "@/lib/entity-hierarchy";

export const dynamic = "force-dynamic";

const TYPES = ["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ park?: string; type?: string; q?: string; live?: string }> }) {
  const params = await searchParams;
  const parks = await prisma.parkEntity.findMany({ where: { entityType: "PARK" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const type = params.type && TYPES.includes(params.type) ? params.type : undefined;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const parkDescendants = params.park ? await getDescendantEntityIds(params.park) : undefined;
  const entities = await prisma.parkEntity.findMany({
    where: { entityType: type ?? { in: TYPES }, ...(parkDescendants ? { id: { in: parkDescendants } } : {}), ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) },
    orderBy: [{ entityType: "asc" }, { name: "asc" }], take: 100,
    select: { id: true, name: true, entityType: true, parentId: true, description: true },
  });

  let liveById = new Map<string, { status?: string; wait?: number | null; showtimes?: unknown[] }>();
  let liveError: string | null = null;
  if (params.live === "1" && params.park) {
    try {
      const result = await getEntityLive(params.park);
      liveById = new Map(result.liveData.map((entry) => [entry.id, { status: entry.status, wait: entry.queue?.STANDBY?.waitTime, showtimes: entry.showtimes }]));
    } catch { liveError = "Live status is temporarily unavailable."; }
  }
  const parkNames = new Map(parks.map((park) => [park.id, park.name]));

  return <div className="space-y-8">
    <header><h1 className="text-3xl font-bold">Explore Walt Disney World</h1><p className="mt-2 text-slate-600">Browse cached attractions, restaurants, shows, and experiences. Add a park filter to view optional live status.</p></header>
    {parks.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><p className="font-semibold">Park data has not been synced yet.</p><p className="mt-1 text-sm">Search from a trip planning day to trigger the initial sync, or send a POST request to <code>/api/entities/sync</code>.</p></div>}
    <form className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1.5fr_auto]">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Park<select name="park" defaultValue={params.park ?? ""} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm font-normal normal-case text-slate-900"><option value="">All parks</option>{parks.map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}</select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type<select name="type" defaultValue={type ?? ""} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm font-normal normal-case text-slate-900"><option value="">All types</option>{TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search<input name="q" defaultValue={query} placeholder="Space Mountain…" className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm font-normal normal-case text-slate-900" /></label>
      <div className="flex items-end gap-2"><button className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white">Filter</button>{params.park && <label className="mb-2 flex items-center gap-1 text-xs"><input type="checkbox" name="live" value="1" defaultChecked={params.live === "1"} /> Live</label>}</div>
    </form>
    {liveError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{liveError}</p>}
    <p className="text-sm text-slate-500">Showing {entities.length} result{entities.length === 1 ? "" : "s"}</p>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entities.map((entity) => { const live = liveById.get(entity.id); return <li key={entity.id} className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{entity.name}</h2><span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">{entity.entityType}</span></div><p className="mt-2 text-xs text-slate-500">{parkNames.get(entity.parentId ?? "") ?? "Walt Disney World"}</p>{entity.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{entity.description}</p>}{live && <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900"><strong>{live.status ?? "Live"}</strong>{live.wait != null ? ` · ${live.wait} min standby` : ""}{live.showtimes?.length ? ` · ${live.showtimes.length} showtimes` : ""}</div>}</li>; })}</ul>
  </div>;
}
