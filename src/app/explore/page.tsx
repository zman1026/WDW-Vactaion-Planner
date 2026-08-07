import { getDestinations, getWDWChildren } from "@/lib/themeparks";

export const dynamic = "force-dynamic"; // for now, always fetch fresh

export default async function ExplorePage() {
  let destinations: any[] = [];
  let wdwChildren: any[] = [];
  let error: string | null = null;

  try {
    const destRes = await getDestinations();
    destinations = destRes.destinations || [];

    const childrenRes = await getWDWChildren();
    wdwChildren = childrenRes.children || [];
  } catch (e: any) {
    error = e.message || "Failed to load ThemeParks data";
  }

  const parks = wdwChildren.filter((c) => c.entityType === "PARK");
  const hotels = wdwChildren.filter((c) => c.entityType === "HOTEL");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Explore Walt Disney World</h1>
        <p className="text-slate-600 mt-2">
          Live data from ThemeParks.wiki. This is the foundation for the planner.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <strong>Error loading data:</strong> {error}
          <p className="text-sm mt-1">
            The API may be temporarily unavailable or the destination ID needs updating.
          </p>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Destinations available</h2>
        <ul className="grid sm:grid-cols-2 gap-2">
          {destinations.slice(0, 12).map((d) => (
            <li key={d.id} className="rounded border bg-white px-3 py-2 text-sm">
              {d.name} <span className="text-slate-400 text-xs">({d.id.slice(0, 8)}…)</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">WDW Parks (from destination children)</h2>
        {parks.length === 0 ? (
          <p className="text-slate-500">No parks loaded yet (or ID needs verification).</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {parks.map((p) => (
              <li key={p.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500 mt-1">{p.id}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Hotels under WDW destination</h2>
        {hotels.length === 0 ? (
          <p className="text-slate-500">No hotels returned in top-level children (they may be nested deeper).</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {hotels.map((h) => (
              <li key={h.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="font-medium">{h.name}</div>
                <div className="text-xs text-slate-500 mt-1">{h.id}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
