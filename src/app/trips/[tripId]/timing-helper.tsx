"use client";

import { useMemo, useState } from "react";

type Item = { id: string; entityId: string; title: string; timingType: string; startTime: string | null; endTime: string | null };
type LiveEntry = { id: string; name: string; status?: string; operatingHours?: Array<{ type?: string; startTime?: string; endTime?: string }>; showtimes?: Array<{ type?: string; startTime?: string; endTime?: string }> };

function clock(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(11, 16) : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function TimingHelper({ parkId, items, coachingNote }: { parkId: string | null; items: Item[]; coachingNote?: string | null }) {
  const [live, setLive] = useState<LiveEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conflicts = useMemo(() => items.flatMap((item, index) => {
    if (item.timingType !== "EXACT" || !item.startTime || !item.endTime) return [];
    const other = items.slice(index + 1).find((candidate) => candidate.timingType === "EXACT" && candidate.startTime && candidate.endTime && item.startTime! < candidate.endTime && candidate.startTime < item.endTime!);
    return other ? [`${item.title} overlaps ${other.title}.`] : [];
  }), [items]);
  const hasEvening = items.some((item) => (item.startTime && item.startTime >= "17:00"));
  const hardMorningCount = items.filter((item) => item.timingType === "EXACT" && item.startTime && item.startTime < "12:00").length;

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
    {conflicts.map((message) => <p key={message} className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs font-semibold text-warning">Timing note: {message}</p>)}
    {parkId && items.length >= 2 && !hasEvening && <p className="rounded-lg border border-[rgb(var(--day-accent)/.18)] bg-white/40 px-3 py-2 text-xs text-muted">A gentle thought: this park day has no evening plan yet. Keeping it open is fine, or add one anchor for later.</p>}
    {hardMorningCount >= 3 && <p className="rounded-lg border border-[rgb(var(--day-accent)/.18)] bg-white/40 px-3 py-2 text-xs text-muted">Three fixed morning plans may leave little travel time. Consider making one flexible.</p>}
    {coachingNote && <p className="rounded-lg border border-[rgb(var(--day-accent)/.18)] bg-white/40 px-3 py-2 text-xs text-muted">{coachingNote}</p>}
    {parkId && <button type="button" onClick={load} disabled={loading} className="day-accent-text text-xs font-semibold hover:underline disabled:opacity-50">{loading ? "Checking live timing…" : "Check park hours & showtimes"}</button>}
    {error && <p className="text-xs text-danger">{error}</p>}
    {live && <div className="day-accent-border rounded-lg border bg-white/55 p-3 text-xs text-primary">
      {parkLive?.operatingHours?.length ? <p><strong>Park hours:</strong> {parkLive.operatingHours.map((hours) => `${clock(hours.startTime)}–${clock(hours.endTime)}`).join(", ")}</p> : <p>Park hours were not included in the current live response.</p>}
      {plannedLive?.map((entry) => <p key={entry.id} className="mt-1"><strong>{entry.name}:</strong> {entry.showtimes?.map((show) => clock(show.startTime)).filter(Boolean).join(", ")}</p>)}
    </div>}
  </div>;
}
