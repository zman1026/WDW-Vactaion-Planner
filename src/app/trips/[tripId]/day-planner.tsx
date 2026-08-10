"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { assignPark, clearDay, copyDay, removeDayPlanItem, reorderDayPlanItem, saveDayPlanItem } from "./actions";
import { AiSuggestions } from "./ai-suggestions";
import { TimingHelper } from "./timing-helper";

type Park = { id: string; name: string };
type PlanItem = { id: string; entityId: string; entityType: string; title: string; timingType: string; timeOfDay: string | null; startTime: string | null; endTime: string | null; estimatedCostCents: number | null; notes: string | null };
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
      try { await action(); after?.(); router.refresh(); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "That change could not be saved."); }
    });
  }

  return <div className="space-y-6">
    <Field label="Park for this day" hint="The offering picker will use this park to narrow the list.">
      <Select value={parkId ?? ""} disabled={isPending} onChange={(event) => run(() => assignPark({ dayPlanId, parkId: event.target.value || null }))}>
        <option value="">Rest day / no park</option>{parks.map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}
      </Select>
    </Field>

    {items.length === 0 ? <EmptyState title="This day is yours to shape" description="Add an attraction, dining reservation, show, or experience. Choose an exact time, a part of day, or leave it flexible." /> : <div className="space-y-7">
      {timelineBands(items).map((band) => band.entries.length > 0 && <section key={band.label}>
        <div className="mb-3 flex items-center gap-3"><span className={`size-2.5 rounded-full ${band.dot}`} /><h3 className="font-display text-xl font-semibold text-primary">{band.label}</h3><span className="text-xs text-muted">{band.range}</span></div>
        <ol className="relative ml-1 border-l border-border pl-5 sm:pl-7">{band.entries.map(({ item, index }) => <li key={item.id} className="relative pb-3 last:pb-0">
          <span className={`absolute -left-[1.62rem] top-5 size-3 rounded-full border-2 border-surface ${band.dot} sm:-left-[2.12rem]`} />
          <article className="rounded-control border border-border bg-parchment/45 p-4 transition hover:border-gold/45 hover:bg-surface hover:shadow-card">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-primary">{item.title}</p><Badge>{item.entityType}</Badge></div><p className="mt-1 text-xs font-semibold text-muted">{timingDescription(item)}</p>{item.estimatedCostCents !== null && <p className="mt-2 text-xs text-muted">Estimated ${(item.estimatedCostCents / 100).toFixed(2)}</p>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{item.notes}</p>}</div>
              <div className="flex shrink-0 flex-wrap gap-1"><SmallButton label="Move up" disabled={isPending || index === 0} onClick={() => run(() => reorderDayPlanItem({ itemId: item.id, direction: "up" }))}>↑</SmallButton><SmallButton label="Move down" disabled={isPending || index === items.length - 1} onClick={() => run(() => reorderDayPlanItem({ itemId: item.id, direction: "down" }))}>↓</SmallButton><SmallButton label={`Edit ${item.title}`} disabled={isPending} onClick={() => setEditor(item)}>Edit</SmallButton><SmallButton label={`Remove ${item.title}`} disabled={isPending} onClick={() => { if (window.confirm(`Remove ${item.title} from this day?`)) run(() => removeDayPlanItem({ itemId: item.id })); }}>×</SmallButton></div>
            </div>
          </article>
        </li>)}</ol>
      </section>)}
    </div>}

    {error && <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

    <div className="flex flex-col gap-2 rounded-control border border-border bg-parchment/60 p-3 sm:flex-row sm:items-center">
      <Select value={copyTarget} onChange={(event) => setCopyTarget(event.target.value)} disabled={isPending || items.length === 0} className="min-w-0 flex-1"><option value="">Copy this day to…</option>{days.filter((day) => day.id !== dayPlanId).map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</Select>
      <Button type="button" variant="secondary" size="sm" disabled={isPending || !copyTarget || items.length === 0} onClick={() => run(() => copyDay({ sourceDayPlanId: dayPlanId, targetDayPlanId: copyTarget }), () => setCopyTarget(""))}>Copy items</Button>
      <Button type="button" variant="danger" size="sm" disabled={isPending || items.length === 0} onClick={() => { if (window.confirm("Remove every itinerary item from this day? The park assignment will remain.")) run(() => clearDay({ dayPlanId })); }}>Clear day</Button>
    </div>

    <TimingHelper parkId={parkId} items={items} />
    <Button type="button" size="lg" onClick={() => setEditor("new")} className="w-full">Add to this day</Button>
    <Modal open={Boolean(editor)} title={editor === "new" ? "Add to this day" : "Edit plan item"} onClose={() => setEditor(null)}>{editor && <ItemEditor dayPlanId={dayPlanId} parkId={parkId} item={editor === "new" ? undefined : editor} isPending={isPending} onSave={(input) => run(() => saveDayPlanItem(input), () => setEditor(null))} />}</Modal>
    <AiSuggestions tripId={tripId} dayPlanId={dayPlanId} hasPark={Boolean(parkId)} disabled={isPending} onApply={(suggestions) => run(async () => { for (const item of suggestions) await saveDayPlanItem({ dayPlanId, entityId: item.entityId, entityType: item.entityType, title: item.title, timingType: "EXACT", timeOfDay: "", startTime: item.startTime, endTime: item.endTime, estimatedCost: (item.estimatedCostCents / 100).toFixed(2), notes: item.notes }); })} />
  </div>;
}

function SmallButton({ label, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) { return <button type="button" aria-label={label} title={label} {...props} className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-sand/30 hover:text-primary disabled:opacity-35" />; }

function timingDescription(item: PlanItem) {
  if (item.timingType === "EXACT" && item.startTime) return `Fixed · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`;
  if (item.timingType === "TIME_OF_DAY" && item.timeOfDay) return item.timeOfDay.charAt(0) + item.timeOfDay.slice(1).toLowerCase();
  return "Flexible / anytime";
}

function timelineBands(items: PlanItem[]) {
  const bands = [
    { label: "Morning", range: "Before noon", dot: "bg-park-mk", match: (item: PlanItem) => item.timeOfDay === "MORNING" || (item.timingType === "EXACT" && Boolean(item.startTime && item.startTime < "12:00")) },
    { label: "Afternoon", range: "Noon to 5 PM", dot: "bg-park-epcot", match: (item: PlanItem) => item.timeOfDay === "AFTERNOON" || (item.timingType === "EXACT" && Boolean(item.startTime && item.startTime >= "12:00" && item.startTime < "17:00")) },
    { label: "Evening", range: "After 5 PM", dot: "bg-park-hs", match: (item: PlanItem) => item.timeOfDay === "EVENING" || (item.timingType === "EXACT" && Boolean(item.startTime && item.startTime >= "17:00")) },
    { label: "Flexible", range: "Anytime", dot: "bg-park-rest", match: (item: PlanItem) => item.timingType === "FLEXIBLE" || (item.timingType !== "EXACT" && !item.timeOfDay) },
  ];
  return bands.map((band) => ({ ...band, entries: items.map((item, index) => ({ item, index })).filter(({ item }) => band.match(item)) }));
}

function ItemEditor({ dayPlanId, parkId, item, isPending, onSave }: { dayPlanId: string; parkId: string | null; item?: PlanItem; isPending: boolean; onSave: (input: Parameters<typeof saveDayPlanItem>[0]) => void }) {
  const [selected, setSelected] = useState<SearchEntity | null>(item ? { id: item.entityId, name: item.title, entityType: item.entityType } : null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState(item?.entityType ?? "ATTRACTION");
  const [timingType, setTimingType] = useState<"EXACT" | "TIME_OF_DAY" | "FLEXIBLE">(item?.timingType === "EXACT" || item?.timingType === "TIME_OF_DAY" ? item.timingType : "FLEXIBLE");
  const [results, setResults] = useState<SearchEntity[]>([]);
  const [searching, setSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(!item);

  useEffect(() => {
    if (selected) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try { const response = await fetch(`/api/entities?q=${encodeURIComponent(query)}&type=${type}${parkId ? `&parkId=${encodeURIComponent(parkId)}` : ""}`, { signal: controller.signal }); const data = await response.json() as { entities?: SearchEntity[] }; setResults(data.entities ?? []); }
      catch (caught) { if (!(caught instanceof DOMException && caught.name === "AbortError")) setResults([]); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, query ? 200 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, type, selected, parkId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    onSave({ id: item?.id, dayPlanId, entityId: selected.id, entityType: selected.entityType as "ATTRACTION" | "RESTAURANT" | "SHOW" | "EXPERIENCE", title: String(form.get("title") ?? selected.name), timingType, timeOfDay: String(form.get("timeOfDay") ?? "") as "" | "MORNING" | "AFTERNOON" | "EVENING", startTime: String(form.get("startTime") ?? ""), endTime: String(form.get("endTime") ?? ""), estimatedCost: String(form.get("estimatedCost") ?? ""), notes: String(form.get("notes") ?? "") });
  }

  return <form onSubmit={submit} className="space-y-4">
    {!selected ? <>
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]"><Select aria-label="Offering category" value={type} onChange={(event) => { setType(event.target.value); setQuery(""); setIsDropdownOpen(true); }}><option value="ATTRACTION">Attractions</option><option value="RESTAURANT">Restaurants</option><option value="SHOW">Shows</option><option value="EXPERIENCE">Experiences</option></Select><div className="relative"><Input value={query} onChange={(event) => { setQuery(event.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} autoFocus role="combobox" aria-expanded={isDropdownOpen} aria-controls={`entity-options-${dayPlanId}`} aria-autocomplete="list" placeholder="Type to filter, or open the list…" className="pr-10" /><button type="button" aria-label={isDropdownOpen ? "Close offerings" : "Show all offerings"} onClick={() => setIsDropdownOpen((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-muted">⌄</button></div></div>
      {isDropdownOpen && <div className="overflow-hidden rounded-control border border-border bg-surface shadow-card">{searching ? <p className="p-3 text-xs text-muted">Loading offerings…</p> : results.length === 0 ? <p className="p-3 text-xs text-muted">No matching offerings found. Try another category or sync the WDW directory.</p> : <><p className="border-b border-border bg-parchment px-3 py-2 text-xs text-muted">{results.length} {query ? "matching" : "available"} offering{results.length === 1 ? "" : "s"}{parkId ? " for this park" : ""}</p><ul id={`entity-options-${dayPlanId}`} role="listbox" className="max-h-60 overflow-y-auto">{results.map((entity) => <li key={entity.id} role="option" aria-selected="false"><button type="button" onClick={() => { setSelected(entity); setIsDropdownOpen(false); }} className="flex w-full justify-between gap-3 border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-sand/20 focus:bg-sand/20"><span>{entity.name}</span><span className="text-xs text-muted">{entity.entityType}</span></button></li>)}</ul></>}</div>}
    </> : <>
      <div className="flex items-center justify-between rounded-control border border-border bg-parchment/60 px-3 py-2 text-sm"><span><strong>{selected.name}</strong> <span className="text-muted">· {selected.entityType}</span></span><button type="button" onClick={() => { setSelected(null); setQuery(""); setIsDropdownOpen(true); }} className="font-semibold text-primary hover:underline">Change</button></div>
      <Field label="Display title"><Input name="title" defaultValue={item?.title ?? selected.name} maxLength={150} required /></Field>
      <fieldset><legend className="text-sm font-semibold text-ink">When should this happen?</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{([ ["EXACT", "Fixed time", "Reservation, showtime, or hard start"], ["TIME_OF_DAY", "Part of day", "Morning, afternoon, or evening"], ["FLEXIBLE", "Anytime", "No timing preference"] ] as const).map(([value, label, help]) => <label key={value} className={`cursor-pointer rounded-control border p-3 transition ${timingType === value ? "border-gold bg-sand/20 ring-2 ring-gold/15" : "border-border bg-surface hover:border-gold/50"}`}><input type="radio" name="timingType" value={value} checked={timingType === value} onChange={() => setTimingType(value)} className="sr-only" /><span className="block text-sm font-semibold text-primary">{label}</span><span className="mt-1 block text-xs font-normal text-muted">{help}</span></label>)}</div></fieldset>
      {timingType === "EXACT" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Fixed start time"><Input name="startTime" type="time" required defaultValue={item?.startTime ?? ""} /></Field><Field label="End time" optional><Input name="endTime" type="time" defaultValue={item?.endTime ?? ""} /></Field></div>}
      {timingType === "TIME_OF_DAY" && <Field label="Preferred part of day"><Select name="timeOfDay" required defaultValue={item?.timeOfDay ?? "MORNING"}><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option></Select></Field>}
      <Field label="Estimated cost ($)" optional><Input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={item?.estimatedCostCents == null ? "" : (item.estimatedCostCents / 100).toFixed(2)} /></Field>
      <Field label="Notes" optional><Textarea name="notes" defaultValue={item?.notes ?? ""} maxLength={1000} rows={3} /></Field>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save item"}</Button>
    </>}
  </form>;
}
