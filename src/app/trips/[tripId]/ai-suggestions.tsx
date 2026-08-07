"use client";

import { useState } from "react";

import type { SuggestedItem } from "@/lib/ai-validation";

export function AiSuggestions({ tripId, dayPlanId, hasPark, disabled, onApply }: { tripId: string; dayPlanId: string; hasPark: boolean; disabled: boolean; onApply: (items: SuggestedItem[]) => void }) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState("");
  const [items, setItems] = useState<SuggestedItem[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setLoading(true); setError(null); setItems([]);
    try {
      const response = await fetch(`/api/trips/${tripId}/suggestions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayPlanId, preferences }) });
      const result = await response.json() as { message?: string; summary?: string; items?: SuggestedItem[] };
      if (!response.ok || !result.items) throw new Error(result.message ?? "Could not create suggestions.");
      setSummary(result.summary ?? ""); setItems(result.items);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create suggestions."); }
    finally { setLoading(false); }
  }

  if (!open) return <button type="button" disabled={!hasPark || disabled} onClick={() => setOpen(true)} className="w-full rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50">✨ Suggest a day with AI</button>;
  return <section className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/60 p-4">
    <div className="flex justify-between gap-2"><h4 className="font-semibold text-purple-950">AI day suggestions</h4><button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">Close</button></div>
    <textarea value={preferences} onChange={(event) => setPreferences(event.target.value)} maxLength={1000} rows={3} placeholder="Two adults and two kids (6 and 9), thrill rides, midday break, one quick-service meal…" className="w-full rounded-lg border bg-white px-3 py-2 text-sm" />
    <button type="button" disabled={loading || preferences.trim().length < 3} onClick={suggest} className="rounded-full bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Building ideas…" : "Generate suggestions"}</button>
    {error && <p className="text-sm text-red-700">{error}</p>}
    {items.length > 0 && <><p className="text-sm text-purple-950">{summary}</p><ol className="space-y-2">{items.map((item) => <li key={item.entityId} className="rounded-lg border bg-white p-3 text-sm"><strong>{item.startTime} · {item.title}</strong><p className="mt-1 text-xs text-slate-600">{item.reason}</p></li>)}</ol><button type="button" disabled={disabled} onClick={() => { onApply(items); setOpen(false); }} className="rounded-full bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add all suggestions</button></>}
    <p className="text-[11px] text-slate-500">AI suggestions can be inaccurate. Verify hours, reservations, and accessibility needs.</p>
  </section>;
}
