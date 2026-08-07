"use client";

import { useMemo, useState } from "react";

type Item = { id: string; entityId: string; title: string; startTime: string | null; endTime: string | null };
type LiveEntry = { id: string; name: string; status?: string; operatingHours?: Array<{ type?: string; startTime?: string; endTime?: string }>; showtimes?: Array<{ type?: string; startTime?: string; endTime?: string }> };

function clock(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(11, 16) : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function TimingHelper({ parkId, items }: { parkId: string | null; items: Item[] }) {
  const [live, setLive] = useState<LiveEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conflicts = useMemo(() => items.flatMap((item, index) => {
    if (!item.startTime || !item.endTime) return [];
    const other = items.slice(index + 1).find((candidate) => candidate.startTime && candidate.endTime && item.startTime! < candidate.endTime && candidate.startTime < item.endTime!);
    return other ? [`${item.title} overlaps ${other.title}.`] : [];
  }), [items]);

  async function load() {
    if (!parkId) return;
    setLoading(true); setError(null);
    try { const response = await fetch(`/api/entities/${parkId}/live`); const result = await response.json() as { liveData?: LiveEntry[]; message?: string }; if (!response.ok) throw new Error(result.message); setLive(result.liveData ?? []); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Timing data unavailable."); }
    finally { setLoading(false); }
  }
  const parkLive = live?.find((entry) => entry.id === parkId);
  const plannedLive = live?.filter((entry) => items.some((item) => item.entityId === entry.id) && entry.showtimes?.length);

  return <div className="space-y-2">
    {conflicts.map((message) => <p key={message} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">⚠ {message}</p>)}
    {parkId && <button type="button" onClick={load} disabled={loading} className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50">{loading ? "Checking live timing…" : "Check park hours & showtimes"}</button>}
    {error && <p className="text-xs text-red-700">{error}</p>}
    {live && <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-950">
      {parkLive?.operatingHours?.length ? <p><strong>Park hours:</strong> {parkLive.operatingHours.map((hours) => `${clock(hours.startTime)}–${clock(hours.endTime)}`).join(", ")}</p> : <p>Park hours were not included in the current live response.</p>}
      {plannedLive?.map((entry) => <p key={entry.id} className="mt-1"><strong>{entry.name}:</strong> {entry.showtimes?.map((show) => clock(show.startTime)).filter(Boolean).join(", ")}</p>)}
    </div>}
  </div>;
}
