"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { applyStarterTemplate, assignPark, assignSecondaryPark, clearDay, copyDay, removeDayPlanItem, reorderDayPlanItem, saveDayPlanItem } from "./actions";
import { AiSuggestions } from "./ai-suggestions";
import type { ReservationSummary } from "./reservation-center";
import { TimingHelper } from "./timing-helper";

type Park = { id: string; name: string };
type PlanItem = { id: string; entityId: string; entityType: string; title: string; timingType: string; timeOfDay: string | null; startTime: string | null; endTime: string | null; estimatedCostCents: number | null; notes: string | null; bookingStatus: string; confirmationNumber: string | null; partySizeOverride: number | null; backupNote: string | null; paidExtraType: string | null };
type SearchEntity = { id: string; name: string; entityType: string };
type PickType = "ATTRACTION" | "RESTAURANT" | "SHOW" | "EXPERIENCE";
type EditorState = PlanItem | PickType | "CHOOSE" | null;
type TimelineEntry = { kind: "plan"; item: PlanItem; index: number } | { kind: "reservation"; item: ReservationSummary };

export function DayPlanner({ tripId, dayPlanId, parkId, secondaryParkId, parks, items, reservations, days, emptyTitle, emptyDescription, coachingNote, initialEditorItemId }: { tripId: string; dayPlanId: string; parkId: string | null; secondaryParkId: string | null; parks: Park[]; items: PlanItem[]; reservations: ReservationSummary[]; days: Array<{ id: string; label: string }>; emptyTitle: string; emptyDescription: string; coachingNote?: string | null; initialEditorItemId?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<EditorState>(items.find((item) => item.id === initialEditorItemId) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState("");
  const primaryParkName = parks.find((park) => park.id === parkId)?.name;

  function run(action: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try { await action(); after?.(); router.refresh(); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "That change could not be saved."); }
    });
  }

  const totalCount = items.length + reservations.length;
  const bookedCount = items.filter((item) => item.bookingStatus === "BOOKED").length + reservations.filter((item) => item.status === "CONFIRMED").length;
  const timingItems = [...items, ...reservations.map((item) => ({ id: `reservation-${item.id}`, entityId: `reservation-${item.id}`, title: item.title, timingType: item.startTime ? "EXACT" : "FLEXIBLE", startTime: item.startTime, endTime: item.endTime }))];

  return <div className="space-y-4">
    <section className="day-accent-border rounded-card border bg-white/55 p-3 shadow-sm sm:p-4" aria-label="Day planning controls">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">This day</p><p className="mt-0.5 truncate font-semibold text-primary">{primaryParkName || "Resort day / no park"}{secondaryParkId ? " · Park hopper" : ""}</p></div><Button type="button" size="sm" onClick={() => setEditor("CHOOSE")} className="day-primary shadow-sm">+ Add to this day</Button></div>
      <details className="mt-3 border-t border-[rgb(var(--day-accent)/.15)] pt-3" open={!parkId}><summary className="cursor-pointer text-xs font-bold text-[rgb(var(--day-accent-deep))]">{parkId ? "Change park or add a hopper park" : "Choose a park for this day"}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Primary park" hint="Sets the day theme and filters the offering picker."><Select value={parkId ?? ""} disabled={isPending} onChange={(event) => run(() => assignPark({ dayPlanId, parkId: event.target.value || null }))}><option value="">Rest day / no park</option>{parks.map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}</Select></Field><Field label="Also visiting" optional hint="Adds hopper context while keeping the primary park theme."><Select value={secondaryParkId ?? ""} disabled={isPending || !parkId} onChange={(event) => run(() => assignSecondaryPark({ dayPlanId, secondaryParkId: event.target.value || null }))}><option value="">No second park</option>{parks.filter((park) => park.id !== parkId).map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}</Select></Field></div></details>
    </section>

    {totalCount > 0 && <p className="rounded-control border border-[rgb(var(--day-accent)/.15)] bg-white/35 px-3 py-2 text-xs font-semibold text-muted" aria-label="Day plan summary">{totalCount} thing{totalCount === 1 ? "" : "s"} on this day{bookedCount ? ` · ${bookedCount} confirmed` : ""}</p>}

    {totalCount === 0 ? <div className="space-y-3"><EmptyState compact title={emptyTitle} description={emptyDescription} className="day-accent-border bg-white/55" icon={<DayPathIcon />} />{parkId && <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => applyStarterTemplate({ dayPlanId }))} className="w-full border-[rgb(var(--day-accent)/.25)] bg-white/55">Add a gentle starter plan</Button>}</div> : <div className="space-y-4">
      {timelineBands(items, reservations).map((band) => band.entries.length > 0 && <section key={band.label}>
        <div className="mb-2 flex items-center gap-2"><span className="day-accent-bg size-2 rounded-full" /><h3 className="font-display text-base font-semibold text-primary">{band.label}</h3><span className="text-[10px] text-muted">{band.range}</span></div>
        <ol className="relative ml-1 border-l border-[rgb(var(--day-accent)/.24)] pl-5 sm:pl-7">{band.entries.map((entry) => {
          if (entry.kind === "reservation") {
            const item = entry.item;
            return <li key={`reservation-${item.id}`} className="relative pb-3 last:pb-0">
              <span className="absolute -left-[1.62rem] top-5 grid size-3 place-items-center rounded-full border-2 border-surface bg-gold sm:-left-[2.12rem]" />
              <article className="group rounded-control border border-gold/25 bg-sand/15 p-3 transition hover:shadow-card">
                <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-start">
                  <p className="day-accent-text pt-0.5 text-xs font-bold">{item.startTime ? clock(item.startTime) : "Time not set"}</p>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><p className="font-semibold text-primary">{item.title}</p><Badge className="border-gold/25 bg-white/60 text-gold">{reservationCategoryLabel(item.category)}</Badge><Badge tone={item.status === "CONFIRMED" ? "success" : "warning"}>{item.status === "CONFIRMED" ? "Confirmed" : item.status === "PENDING" ? "Needs action" : "Wish list"}</Badge></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{item.location && <span>{item.location}</span>}{item.confirmationNumber && <span className="font-semibold text-primary">Confirmation {item.confirmationNumber}</span>}{item.partySize && <span>Party of {item.partySize}</span>}{item.costCents !== null && <span>Est. ${(item.costCents / 100).toFixed(2)}</span>}</div>{item.notes && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted">{item.notes}</p>}</div>
                  <Link href={`/trips/${tripId}?view=reservations&reservation=${item.id}`} className={buttonStyles({ variant: "ghost", size: "sm", className: "shrink-0" })}>Edit</Link>
                </div>
              </article>
            </li>;
          }
          const { item, index } = entry;
          const presentation = itemPresentation(item);
          return <li key={`plan-${item.id}`} className="relative pb-3 last:pb-0">
          <span className="day-accent-bg absolute -left-[1.62rem] top-5 size-3 rounded-full border-2 border-surface sm:-left-[2.12rem]" />
          <article className={`group day-item rounded-control border p-3 transition hover:shadow-card ${presentation.className}`}>
            <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-start">
              <p className={`pt-0.5 text-xs font-bold ${presentation.emphasizeTime ? "day-accent-text" : "text-muted"}`}>{timingDescription(item)}</p><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><p className="font-semibold text-primary">{item.title}</p><Badge className="border-[rgb(var(--day-accent)/.2)] bg-white/55 text-[rgb(var(--day-accent-deep))]">{presentation.label}</Badge>{item.bookingStatus === "BOOKED" && <Badge className="border-success/25 bg-success/5 text-success">Booked</Badge>}{item.entityType === "RESTAURANT" && item.bookingStatus !== "BOOKED" && <Badge className="border-warning/25 bg-warning/5 text-warning">Needs reservation</Badge>}{item.paidExtraType && <Badge className="border-gold/30 bg-gold/10 text-gold">{paidExtraLabel(item.paidExtraType)}</Badge>}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{item.confirmationNumber && <span className="font-semibold text-primary">Confirmation {item.confirmationNumber}{item.partySizeOverride ? ` · Party of ${item.partySizeOverride}` : ""}</span>}{item.estimatedCostCents !== null && <span>Est. ${(item.estimatedCostCents / 100).toFixed(2)}</span>}</div>{item.notes && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted">{item.notes}</p>}{item.backupNote && <p className="mt-1 text-xs text-muted"><strong>Backup:</strong> {item.backupNote}</p>}</div>
              <div className="flex shrink-0 flex-wrap gap-1 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><SmallButton label="Move up" className="hidden sm:inline-flex" disabled={isPending || index === 0} onClick={() => run(() => reorderDayPlanItem({ itemId: item.id, direction: "up" }))}>↑</SmallButton><SmallButton label="Move down" className="hidden sm:inline-flex" disabled={isPending || index === items.length - 1} onClick={() => run(() => reorderDayPlanItem({ itemId: item.id, direction: "down" }))}>↓</SmallButton><SmallButton label={`Edit ${item.title}`} disabled={isPending} onClick={() => setEditor(item)}>Edit</SmallButton><SmallButton label={`Remove ${item.title}`} disabled={isPending} onClick={() => { if (window.confirm(`Remove ${item.title} from this day?`)) run(() => removeDayPlanItem({ itemId: item.id })); }}>Remove</SmallButton></div>
            </div>
          </article>
        </li>;})}</ol>
      </section>)}
      {items.length === 0 && parkId && <Button type="button" variant="secondary" disabled={isPending} onClick={() => run(() => applyStarterTemplate({ dayPlanId }))} className="w-full border-[rgb(var(--day-accent)/.25)] bg-white/55">Add a gentle starter plan</Button>}
    </div>}

    {error && <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

    {items.length > 0 && <details className="rounded-control border border-border bg-white/35 p-3"><summary className="cursor-pointer text-xs font-semibold text-primary">Copy or clear planned activities</summary><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={copyTarget} onChange={(event) => setCopyTarget(event.target.value)} disabled={isPending || items.length === 0} className="min-w-0 flex-1"><option value="">Copy this day to…</option>{days.filter((day) => day.id !== dayPlanId).map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</Select>
      <Button type="button" variant="secondary" size="sm" disabled={isPending || !copyTarget || items.length === 0} onClick={() => run(() => copyDay({ sourceDayPlanId: dayPlanId, targetDayPlanId: copyTarget }), () => setCopyTarget(""))}>Copy items</Button>
      <Button type="button" variant="danger" size="sm" disabled={isPending || items.length === 0} onClick={() => { if (window.confirm("Remove every planned activity from this day? Reservations will stay in place.")) run(() => clearDay({ dayPlanId })); }}>Clear activities</Button>
    </div></details>}

    <details className="rounded-control border border-border bg-white/35 p-3"><summary className="cursor-pointer text-xs font-semibold text-primary">Planning help, optional</summary><div className="mt-4 grid gap-5 sm:grid-cols-2"><section><h3 className="text-sm font-semibold text-primary">Check the timing</h3><div className="mt-2"><TimingHelper parkId={parkId} items={timingItems} coachingNote={coachingNote} /></div></section><section className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><h3 className="text-sm font-semibold text-primary">Build a suggested day</h3><div className="mt-2"><AiSuggestions tripId={tripId} dayPlanId={dayPlanId} hasPark={Boolean(parkId)} disabled={isPending} onApply={(suggestions) => run(async () => { for (const item of suggestions) await saveDayPlanItem({ dayPlanId, entityId: item.entityId, entityType: item.entityType, title: item.title, timingType: "EXACT", timeOfDay: "", startTime: item.startTime, endTime: item.endTime, estimatedCost: (item.estimatedCostCents / 100).toFixed(2), notes: item.notes, bookingStatus: item.entityType === "RESTAURANT" ? "WISHLIST" : "NONE", confirmationNumber: "", partySizeOverride: "", backupNote: "", paidExtraType: "" }); })} /></div></section></div></details>
    <Modal open={Boolean(editor)} title={editor === "CHOOSE" ? "Add to this day" : typeof editor === "string" ? "Plan an activity" : "Edit plan item"} onClose={() => setEditor(null)}>{editor === "CHOOSE" ? <AddChoice tripId={tripId} dayPlanId={dayPlanId} onPlan={() => setEditor("ATTRACTION")} /> : editor && <ItemEditor dayPlanId={dayPlanId} parkId={parkId} item={typeof editor === "string" ? undefined : editor} initialType={typeof editor === "string" ? editor : undefined} isPending={isPending} onSave={(input) => run(() => saveDayPlanItem(input), () => setEditor(null))} />}</Modal>
  </div>;
}

function SmallButton({ label, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) { return <button type="button" aria-label={label} title={label} {...props} className={`rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-sand/30 hover:text-primary disabled:opacity-35 ${className ?? ""}`} />; }

function AddChoice({ tripId, dayPlanId, onPlan }: { tripId: string; dayPlanId: string; onPlan: () => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <button type="button" onClick={onPlan} className="rounded-card border border-border bg-surface p-5 text-left transition hover:border-gold hover:bg-sand/10 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/15">
      <span className="grid size-10 place-items-center rounded-full bg-parchment text-xl text-gold">☆</span>
      <span className="mt-3 block font-display text-xl font-semibold text-primary">Plan an activity</span>
      <span className="mt-1 block text-sm leading-relaxed text-muted">Add a ride, restaurant idea, show, break, or experience.</span>
    </button>
    <Link href={`/trips/${tripId}?view=reservations&new=1&day=${dayPlanId}`} className="rounded-card border border-border bg-surface p-5 text-left transition hover:border-gold hover:bg-sand/10 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/15">
      <span className="grid size-10 place-items-center rounded-full bg-parchment text-xl text-gold">◇</span>
      <span className="mt-3 block font-display text-xl font-semibold text-primary">Add a reservation</span>
      <span className="mt-1 block text-sm leading-relaxed text-muted">Save dining, travel, tickets, or another confirmed booking.</span>
    </Link>
  </div>;
}

function timingDescription(item: PlanItem) {
  if (item.timingType === "EXACT" && item.startTime) return `${clock(item.startTime)}${item.endTime ? `–${clock(item.endTime)}` : ""}`;
  if (item.timingType === "TIME_OF_DAY" && item.timeOfDay) return item.timeOfDay.charAt(0) + item.timeOfDay.slice(1).toLowerCase();
  return "Flexible / anytime";
}

function itemPresentation(item: PlanItem) {
  if (item.entityType === "RESTAURANT") return { label: "Dining", className: "day-item--dining", emphasizeTime: true };
  if (item.entityType === "SHOW") return { label: "Big moment", className: "day-item--moment", emphasizeTime: true };
  if (item.entityType === "EXPERIENCE" && /break|rest|travel|transfer|pool|nap/i.test(`${item.title} ${item.notes ?? ""}`)) return { label: "Pause", className: "day-item--soft", emphasizeTime: false };
  if (item.entityType === "ATTRACTION") return { label: "Attraction", className: "", emphasizeTime: false };
  return { label: "Experience", className: "", emphasizeTime: false };
}

function paidExtraLabel(value: string) { return value === "LIGHTNING_LANE" ? "Lightning Lane" : value === "SPECIAL_EVENT" ? "Special event" : "Paid extra"; }

function DayPathIcon() {
  return <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-current stroke-[1.6]" aria-hidden="true"><path d="M5 19c3-1 3-5 6-6s4 2 7 0c2-1 2-4 0-6" /><circle cx="5" cy="19" r="2" /><circle cx="18" cy="6" r="2" /></svg>;
}

function timelineBands(items: PlanItem[], reservations: ReservationSummary[]) {
  const entries: TimelineEntry[] = [
    ...items.map((item, index) => ({ kind: "plan" as const, item, index })),
    ...reservations.map((item) => ({ kind: "reservation" as const, item })),
  ];
  const bands = [
    { label: "Morning", range: "Before noon" },
    { label: "Afternoon", range: "Noon to 5 PM" },
    { label: "Evening", range: "After 5 PM" },
    { label: "Flexible", range: "Anytime" },
  ];
  return bands.map((band) => ({ ...band, entries: entries.filter((entry) => entryBand(entry) === band.label).sort((a, b) => entrySortKey(a) - entrySortKey(b)) }));
}

function entryBand(entry: TimelineEntry) {
  if (entry.kind === "plan" && entry.item.timingType !== "EXACT") {
    if (entry.item.timeOfDay === "MORNING") return "Morning";
    if (entry.item.timeOfDay === "AFTERNOON") return "Afternoon";
    if (entry.item.timeOfDay === "EVENING") return "Evening";
    return "Flexible";
  }
  const startTime = entry.item.startTime;
  if (!startTime) return "Flexible";
  if (startTime < "12:00") return "Morning";
  if (startTime < "17:00") return "Afternoon";
  return "Evening";
}

function entrySortKey(entry: TimelineEntry) {
  const startTime = entry.item.startTime;
  if (startTime) {
    const [hour, minute] = startTime.split(":").map(Number);
    return hour * 60 + minute;
  }
  if (entry.kind === "plan") {
    if (entry.item.timeOfDay === "MORNING") return 8 * 60 + entry.index;
    if (entry.item.timeOfDay === "AFTERNOON") return 13 * 60 + entry.index;
    if (entry.item.timeOfDay === "EVENING") return 18 * 60 + entry.index;
    return 24 * 60 + entry.index;
  }
  return 25 * 60;
}

function reservationCategoryLabel(value: string) {
  return ({ DINING: "Dining", HOTEL: "Hotel", FLIGHT: "Flight", TRANSPORT: "Transportation", TICKET: "Tickets", EVENT: "Special event", OTHER: "Reservation" } as Record<string, string>)[value] ?? "Reservation";
}

function clock(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
}

function ItemEditor({ dayPlanId, parkId, item, initialType, isPending, onSave }: { dayPlanId: string; parkId: string | null; item?: PlanItem; initialType?: PickType; isPending: boolean; onSave: (input: Parameters<typeof saveDayPlanItem>[0]) => void }) {
  const [selected, setSelected] = useState<SearchEntity | null>(item ? { id: item.entityId, name: item.title, entityType: item.entityType } : null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState(item?.entityType ?? initialType ?? "ATTRACTION");
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
    const partySize = String(form.get("partySizeOverride") ?? "");
    onSave({ id: item?.id, dayPlanId, entityId: selected.id, entityType: selected.entityType as "ATTRACTION" | "RESTAURANT" | "SHOW" | "EXPERIENCE", title: String(form.get("title") ?? selected.name), timingType, timeOfDay: String(form.get("timeOfDay") ?? "") as "" | "MORNING" | "AFTERNOON" | "EVENING", startTime: String(form.get("startTime") ?? ""), endTime: String(form.get("endTime") ?? ""), estimatedCost: String(form.get("estimatedCost") ?? ""), notes: String(form.get("notes") ?? ""), bookingStatus: String(form.get("bookingStatus") ?? "NONE") as "NONE" | "WISHLIST" | "BOOKED", confirmationNumber: String(form.get("confirmationNumber") ?? ""), partySizeOverride: partySize ? Number(partySize) : "", backupNote: String(form.get("backupNote") ?? ""), paidExtraType: String(form.get("paidExtraType") ?? "") as "" | "LIGHTNING_LANE" | "SPECIAL_EVENT" | "OTHER" });
  }

  return <form onSubmit={submit} className="space-y-4">
    {!selected ? <>
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]"><Select aria-label="Offering category" value={type} onChange={(event) => { setType(event.target.value); setQuery(""); setIsDropdownOpen(true); }}><option value="ATTRACTION">Attractions</option><option value="RESTAURANT">Restaurants</option><option value="SHOW">Shows</option><option value="EXPERIENCE">Experiences</option></Select><div className="relative"><Input value={query} onChange={(event) => { setQuery(event.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} autoFocus role="combobox" aria-expanded={isDropdownOpen} aria-controls={`entity-options-${dayPlanId}`} aria-autocomplete="list" placeholder="Type to filter, or open the list…" className="pr-10" /><button type="button" aria-label={isDropdownOpen ? "Close offerings" : "Show all offerings"} onClick={() => setIsDropdownOpen((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-muted">⌄</button></div></div>
      {isDropdownOpen && <div className="overflow-hidden rounded-control border border-border bg-surface shadow-card">{searching ? <p className="p-3 text-xs text-muted">Loading offerings…</p> : results.length === 0 ? <p className="p-3 text-xs text-muted">No matching offerings found. Try another category or sync the WDW directory.</p> : <><p className="border-b border-border bg-parchment px-3 py-2 text-xs text-muted">{results.length} {query ? "matching" : "available"} offering{results.length === 1 ? "" : "s"}{parkId ? " for this park" : ""}</p><ul id={`entity-options-${dayPlanId}`} role="listbox" className="max-h-60 overflow-y-auto">{results.map((entity) => <li key={entity.id} role="option" aria-selected="false"><button type="button" onClick={() => { setSelected(entity); setIsDropdownOpen(false); }} className="flex w-full justify-between gap-3 border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-sand/20 focus:bg-sand/20"><span>{entity.name}</span><span className="text-xs text-muted">{entity.entityType}</span></button></li>)}</ul></>}</div>}
    </> : <>
      <div className="flex items-center justify-between rounded-control border border-border bg-parchment/60 px-3 py-2 text-sm"><span><strong>{selected.name}</strong> <span className="text-muted">· {selected.entityType}</span></span><button type="button" onClick={() => { setSelected(null); setQuery(""); setIsDropdownOpen(true); }} className="font-semibold text-primary hover:underline">Change</button></div>
      <fieldset><legend className="text-sm font-semibold text-ink">When should this happen?</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{([ ["EXACT", "Fixed time", "Reservation, showtime, or hard start"], ["TIME_OF_DAY", "Part of day", "Morning, afternoon, or evening"], ["FLEXIBLE", "Anytime", "No timing preference"] ] as const).map(([value, label, help]) => <label key={value} className={`cursor-pointer rounded-control border p-3 transition ${timingType === value ? "border-gold bg-sand/20 ring-2 ring-gold/15" : "border-border bg-surface hover:border-gold/50"}`}><input type="radio" name="timingType" value={value} checked={timingType === value} onChange={() => setTimingType(value)} className="sr-only" /><span className="block text-sm font-semibold text-primary">{label}</span><span className="mt-1 block text-xs font-normal text-muted">{help}</span></label>)}</div></fieldset>
      {timingType === "EXACT" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Fixed start time"><Input name="startTime" type="time" required defaultValue={item?.startTime ?? ""} /></Field><Field label="End time" optional><Input name="endTime" type="time" defaultValue={item?.endTime ?? ""} /></Field></div>}
      {timingType === "TIME_OF_DAY" && <Field label="Preferred part of day"><Select name="timeOfDay" required defaultValue={item?.timeOfDay ?? "MORNING"}><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option></Select></Field>}
      {selected.entityType === "RESTAURANT" && <Field label="Is it booked?"><Select name="bookingStatus" defaultValue={item?.bookingStatus ?? "WISHLIST"}><option value="WISHLIST">Not booked yet</option><option value="BOOKED">Yes, it is booked</option><option value="NONE">No reservation needed</option></Select></Field>}
      <details className="group rounded-control border border-border bg-parchment/45 p-3" open={Boolean(item?.confirmationNumber || item?.paidExtraType || item?.estimatedCostCents || item?.notes)}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary"><span>Add details, optional</span><span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span></summary><div className="mt-4 space-y-3"><Field label="Change the name" optional><Input name="title" defaultValue={item?.title ?? selected.name} maxLength={150} /></Field><Field label="Paid extra" optional><Select name="paidExtraType" defaultValue={item?.paidExtraType ?? ""}><option value="">No paid extra</option><option value="LIGHTNING_LANE">Lightning Lane</option><option value="SPECIAL_EVENT">Special event</option><option value="OTHER">Other paid extra</option></Select></Field>{selected.entityType === "RESTAURANT" && <div className="rounded-control border border-border bg-surface p-3"><p className="mb-3 text-sm font-semibold text-primary">Dining details</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Confirmation number" optional><Input name="confirmationNumber" defaultValue={item?.confirmationNumber ?? ""} maxLength={100} /></Field><Field label="Party size" optional><Input name="partySizeOverride" type="number" min="1" max="50" defaultValue={item?.partySizeOverride ?? ""} /></Field></div><Field label="Backup restaurant or plan" optional><Input name="backupNote" defaultValue={item?.backupNote ?? ""} maxLength={500} /></Field></div>}<Field label="Estimated cost ($)" optional><Input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={item?.estimatedCostCents == null ? "" : (item.estimatedCostCents / 100).toFixed(2)} /></Field><Field label="Notes" optional><Textarea name="notes" defaultValue={item?.notes ?? ""} maxLength={1000} rows={3} /></Field></div></details>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save item"}</Button>
    </>}
  </form>;
}
