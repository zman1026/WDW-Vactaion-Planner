"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";

import { assignPark, clearDay, copyDay, removeDayPlanItem, reorderDayPlanItem, saveDayPlanItem } from "./actions";
import { AiSuggestions } from "./ai-suggestions";
import { TimingHelper } from "./timing-helper";

type Park = { id: string; name: string };
type PlanItem = {
  id: string;
  entityId: string;
  entityType: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  estimatedCostCents: number | null;
  notes: string | null;
};

type SearchEntity = { id: string; name: string; entityType: string };

export function DayPlanner({ tripId, dayPlanId, parkId, parks, items, days }: { tripId: string; dayPlanId: string; parkId: string | null; parks: Park[]; items: PlanItem[]; days: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<PlanItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState("");

  function run(action: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        after?.();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That change could not be saved.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <label className="block text-sm font-semibold text-slate-700">
        Park for this day
        <select
          value={parkId ?? ""}
          disabled={isPending}
          onChange={(event) => run(() => assignPark({ dayPlanId, parkId: event.target.value || null }))}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Rest day / no park</option>
          {parks.map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}
        </select>
      </label>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">No plans yet — this day is yours to shape.</div>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-xl border bg-slate-50 p-3">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs font-medium text-purple-700">{item.entityType}{item.startTime ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}` : ""}</p>
                  {item.estimatedCostCents !== null && <p className="mt-1 text-xs text-slate-600">Estimated ${(item.estimatedCostCents / 100).toFixed(2)}</p>}
                  {item.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap justify-start gap-1 sm:justify-end">
                  <SmallButton label="Move up" disabled={isPending || index === 0} onClick={() => run(() => reorderDayPlanItem({ itemId: item.id, direction: "up" }))}>↑</SmallButton>
                  <SmallButton label="Move down" disabled={isPending || index === items.length - 1} onClick={() => run(() => reorderDayPlanItem({ itemId: item.id, direction: "down" }))}>↓</SmallButton>
                  <SmallButton label={`Edit ${item.title}`} disabled={isPending} onClick={() => setEditor(item)}>Edit</SmallButton>
                  <SmallButton label={`Remove ${item.title}`} disabled={isPending} onClick={() => { if (window.confirm(`Remove ${item.title} from this day?`)) run(() => removeDayPlanItem({ itemId: item.id })); }}>×</SmallButton>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-2 rounded-xl border bg-slate-50 p-3 sm:flex-row sm:items-center">
        <select value={copyTarget} onChange={(event) => setCopyTarget(event.target.value)} disabled={isPending || items.length === 0} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Copy this day to…</option>{days.filter((day) => day.id !== dayPlanId).map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select>
        <button type="button" disabled={isPending || !copyTarget || items.length === 0} onClick={() => run(() => copyDay({ sourceDayPlanId: dayPlanId, targetDayPlanId: copyTarget }), () => setCopyTarget(""))} className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-40">Copy items</button>
        <button type="button" disabled={isPending || items.length === 0} onClick={() => { if (window.confirm("Remove every itinerary item from this day? The park assignment will remain.")) run(() => clearDay({ dayPlanId })); }} className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40">Clear day</button>
      </div>

      <TimingHelper parkId={parkId} items={items} />

      {editor ? (
        <ItemEditor
          dayPlanId={dayPlanId}
          item={editor === "new" ? undefined : editor}
          isPending={isPending}
          onCancel={() => setEditor(null)}
          onSave={(input) => run(() => saveDayPlanItem(input), () => setEditor(null))}
        />
      ) : (
        <button type="button" onClick={() => setEditor("new")} className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">+ Add attraction, dining, or show</button>
      )}
      <AiSuggestions tripId={tripId} dayPlanId={dayPlanId} hasPark={Boolean(parkId)} disabled={isPending} onApply={(suggestions) => run(async () => { for (const item of suggestions) await saveDayPlanItem({ dayPlanId, entityId: item.entityId, entityType: item.entityType, title: item.title, startTime: item.startTime, endTime: item.endTime, estimatedCost: (item.estimatedCostCents / 100).toFixed(2), notes: item.notes }); })} />
    </div>
  );
}

function SmallButton({ label, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" aria-label={label} title={label} {...props} className="rounded-md border bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40" />;
}

function ItemEditor({ dayPlanId, item, isPending, onCancel, onSave }: { dayPlanId: string; item?: PlanItem; isPending: boolean; onCancel: () => void; onSave: (input: Parameters<typeof saveDayPlanItem>[0]) => void }) {
  const [selected, setSelected] = useState<SearchEntity | null>(item ? { id: item.entityId, name: item.title, entityType: item.entityType } : null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState(item?.entityType ?? "ATTRACTION");
  const [results, setResults] = useState<SearchEntity[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (selected || query.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/entities?q=${encodeURIComponent(query)}&type=${type}`, { signal: controller.signal });
        const data = await response.json() as { entities?: SearchEntity[] };
        setResults(data.entities ?? []);
      } finally { setSearching(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, type, selected]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    onSave({
      id: item?.id,
      dayPlanId,
      entityId: selected.id,
      entityType: selected.entityType as "ATTRACTION" | "RESTAURANT" | "SHOW" | "EXPERIENCE",
      title: String(form.get("title") ?? selected.name),
      startTime: String(form.get("startTime") ?? ""),
      endTime: String(form.get("endTime") ?? ""),
      estimatedCost: String(form.get("estimatedCost") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold">{item ? "Edit plan item" : "Add to this day"}</h4><button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-900">Cancel</button></div>
      {!selected ? <>
        <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
          <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
            <option value="ATTRACTION">Attractions</option><option value="RESTAURANT">Restaurants</option><option value="SHOW">Shows</option><option value="EXPERIENCE">Experiences</option>
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Search cached park data…" className="rounded-lg border bg-white px-3 py-2 text-sm" />
        </div>
        {searching && <p className="text-xs text-slate-500">Searching…</p>}
        {query.length >= 2 && !searching && results.length === 0 && <p className="text-xs text-slate-500">No matches. Park data may still need to be synced.</p>}
        {results.length > 0 && <ul className="max-h-44 overflow-y-auto rounded-lg border bg-white">{results.map((entity) => <li key={entity.id}><button type="button" onClick={() => setSelected(entity)} className="flex w-full justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"><span>{entity.name}</span><span className="text-xs text-slate-400">{entity.entityType}</span></button></li>)}</ul>}
      </> : <>
        <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"><span><strong>{selected.name}</strong> <span className="text-slate-500">· {selected.entityType}</span></span><button type="button" onClick={() => setSelected(null)} className="text-blue-700 hover:underline">Change</button></div>
        <label className="block text-xs font-semibold text-slate-600">Display title<input name="title" defaultValue={item?.title ?? selected.name} maxLength={150} required className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal text-slate-900" /></label>
        <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Start time<input name="startTime" type="time" defaultValue={item?.startTime ?? ""} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">End time<input name="endTime" type="time" defaultValue={item?.endTime ?? ""} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal" /></label></div>
        <label className="block text-xs font-semibold text-slate-600">Estimated cost ($)<input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={item?.estimatedCostCents == null ? "" : (item.estimatedCostCents / 100).toFixed(2)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal" /></label>
        <label className="block text-xs font-semibold text-slate-600">Notes<textarea name="notes" defaultValue={item?.notes ?? ""} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal" /></label>
        <button type="submit" disabled={isPending} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isPending ? "Saving…" : "Save item"}</button>
      </>}
    </form>
  );
}
