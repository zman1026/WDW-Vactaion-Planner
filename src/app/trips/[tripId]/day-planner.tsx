"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  applyStarterTemplate,
  assignPark,
  assignSecondaryPark,
  clearDay,
  copyDay,
  removeDayPlanItem,
  reorderDayPlanItem,
  saveDayPlanItem,
} from "./actions";
import { AiSuggestions } from "./ai-suggestions";
import { MustDoBoard, type MustDoSummary } from "./must-do-board";
import type { ReservationSummary } from "./reservation-center";
import { TimingHelper } from "./timing-helper";

type Park = { id: string; name: string };
type PlanItem = {
  id: string;
  entityId: string;
  entityType: string;
  title: string;
  timingType: string;
  timeOfDay: string | null;
  startTime: string | null;
  endTime: string | null;
  estimatedCostCents: number | null;
  notes: string | null;
  bookingStatus: string;
  confirmationNumber: string | null;
  partySizeOverride: number | null;
  backupNote: string | null;
  paidExtraType: string | null;
};
type SearchEntity = { id: string; name: string; entityType: string };
type PickType = "ATTRACTION" | "RESTAURANT" | "SHOW" | "EXPERIENCE";
type TimelineEntry = { kind: "plan"; item: PlanItem; index: number } | { kind: "reservation"; item: ReservationSummary };

export function DayPlanner({
  tripId,
  dayPlanId,
  dayNumber,
  dateLabel,
  parkId,
  secondaryParkId,
  parks,
  items,
  reservations,
  days,
  mustDos,
  emptyTitle,
  emptyDescription,
  coachingNote,
  initialEditorItemId,
}: {
  tripId: string;
  dayPlanId: string;
  dayNumber: number;
  dateLabel: string;
  parkId: string | null;
  secondaryParkId: string | null;
  parks: Park[];
  items: PlanItem[];
  reservations: ReservationSummary[];
  days: Array<{ id: string; label: string }>;
  mustDos: MustDoSummary[];
  emptyTitle: string;
  emptyDescription: string;
  coachingNote?: string | null;
  initialEditorItemId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<PlanItem | PickType | null>(items.find((item) => item.id === initialEditorItemId) ?? null);
  const [parkOpen, setParkOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mustDosOpen, setMustDosOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState("");
  const primaryParkName = parks.find((park) => park.id === parkId)?.name;
  const secondaryParkName = parks.find((park) => park.id === secondaryParkId)?.name;
  const openMustDos = mustDos.filter((item) => !item.dayPlanItemId).length;
  const totalCount = items.length + reservations.length;
  const bookedCount = items.filter((item) => item.bookingStatus === "BOOKED").length + reservations.filter((item) => item.status === "CONFIRMED").length;
  const timingItems = [
    ...items,
    ...reservations.map((item) => ({ id: `reservation-${item.id}`, entityId: `reservation-${item.id}`, title: item.title, timingType: item.startTime ? "EXACT" : "FLEXIBLE", startTime: item.startTime, endTime: item.endTime })),
  ];

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
    <div className="space-y-3">
      <header className="rounded-card border border-[rgb(var(--day-accent)/.22)] bg-white/60 p-3 shadow-card sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="day-accent-text text-[10px] font-bold uppercase tracking-[0.16em]">Day {dayNumber}</p>
            <h2 className="mt-0.5 truncate text-xl font-semibold text-primary">{dateLabel}</h2>
            <p className="mt-1 text-xs text-muted">{totalCount ? `${totalCount} planned${bookedCount ? ` · ${bookedCount} booked` : ""}` : "A fresh day"}</p>
          </div>
          <Button type="button" onClick={() => setEditor("ATTRACTION")} className="day-primary shrink-0 px-4">+ Add</Button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          <button type="button" onClick={() => setParkOpen(true)} className="day-accent-border flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-control border bg-white/65 px-3 text-left text-sm font-semibold text-primary sm:flex-none">
            <span className="day-accent-bg size-2.5 shrink-0 rounded-full" aria-hidden="true" />
            <span className="truncate">{primaryParkName || "Choose a park"}{secondaryParkName ? ` + ${secondaryParkName}` : ""}</span>
          </button>
          <button type="button" onClick={() => setMustDosOpen(true)} aria-label={`Must-dos${openMustDos ? `, ${openMustDos} open` : ""}`} className="grid size-11 shrink-0 place-items-center rounded-control border border-border bg-white/65 px-0 text-sm font-semibold text-primary hover:border-gold/50 sm:flex sm:w-auto sm:px-3">
            <span className="text-lg sm:hidden" aria-hidden="true">★</span><span className="hidden sm:inline">Must-dos{openMustDos ? ` (${openMustDos})` : ""}</span>
          </button>
          <button type="button" onClick={() => setToolsOpen(true)} aria-label="Day tools" className="grid size-11 shrink-0 place-items-center rounded-control border border-border bg-white/65 px-0 text-sm font-semibold text-primary hover:border-gold/50 sm:flex sm:w-auto sm:px-3">
            <span className="text-lg tracking-widest sm:hidden" aria-hidden="true">•••</span><span className="hidden sm:inline">Day tools</span>
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      {totalCount === 0 ? (
        <section className="rounded-card border border-dashed border-[rgb(var(--day-accent)/.28)] bg-white/45 px-5 py-8 text-center">
          <span className="day-accent-text mx-auto grid size-11 place-items-center rounded-full bg-white/70" aria-hidden="true"><DayPathIcon /></span>
          <h3 className="mt-3 text-lg font-semibold text-primary">{emptyTitle}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">{emptyDescription}</p>
          <Button type="button" className="day-primary mt-4" onClick={() => setEditor("ATTRACTION")}>Add the first item</Button>
        </section>
      ) : (
        <div className="space-y-4" aria-label="Day timeline">
          {timelineBands(items, reservations).map((band) => band.entries.length > 0 && (
            <section key={band.label} aria-labelledby={`band-${band.label.toLowerCase()}`}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="day-accent-bg size-2 rounded-full" aria-hidden="true" />
                <h3 id={`band-${band.label.toLowerCase()}`} className="text-sm font-bold text-primary">{band.label}</h3>
                <span className="text-[10px] text-muted">{band.range}</span>
              </div>
              <ol className="space-y-1.5">
                {band.entries.map((entry) => entry.kind === "reservation" ? (
                  <li key={`reservation-${entry.item.id}`}>
                    <Link href={`/trips/${tripId}?view=reservations&reservation=${entry.item.id}`} className="grid min-h-14 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-control border border-gold/25 bg-sand/15 px-3 py-2 transition hover:border-gold/50">
                      <span className="text-xs font-bold text-gold">{entry.item.startTime ? clock(entry.item.startTime) : "Flexible"}</span>
                      <span className="min-w-0"><strong className="block truncate text-sm text-primary">{entry.item.title}</strong><span className="block truncate text-[11px] text-muted">Older booking · {reservationCategoryLabel(entry.item.category)}</span></span>
                      <span className="text-sm font-semibold text-primary">Edit</span>
                    </Link>
                  </li>
                ) : (
                  <TimelinePlanItem
                    key={entry.item.id}
                    item={entry.item}
                    index={entry.index}
                    itemCount={items.length}
                    disabled={isPending}
                    onEdit={() => setEditor(entry.item)}
                    onMove={(direction) => run(() => reorderDayPlanItem({ itemId: entry.item.id, direction }))}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <Modal open={parkOpen} title="Choose this day’s park" onClose={() => setParkOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-muted">Pick one primary park. You can add a second park later from Day tools.</p>
          <Field label="Park">
            <Select value={parkId ?? ""} disabled={isPending} onChange={(event) => run(() => assignPark({ dayPlanId, parkId: event.target.value || null }), () => setParkOpen(false))}>
              <option value="">No park / rest day</option>
              {parks.map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal open={mustDosOpen} title="Must-dos" onClose={() => setMustDosOpen(false)}>
        <MustDoBoard tripId={tripId} mustDos={mustDos} days={days} activeDayId={dayPlanId} compact />
      </Modal>

      <Modal open={toolsOpen} title="Day tools" onClose={() => setToolsOpen(false)}>
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-primary">Park hopper</h3>
            <p className="mt-1 text-xs text-muted">Optional: add a second park after your primary park.</p>
            <Select className="mt-2" value={secondaryParkId ?? ""} disabled={isPending || !parkId} onChange={(event) => run(() => assignSecondaryPark({ dayPlanId, secondaryParkId: event.target.value || null }))}>
              <option value="">No second park</option>
              {parks.filter((park) => park.id !== parkId).map((park) => <option key={park.id} value={park.id}>{park.name}</option>)}
            </Select>
          </section>

          {parkId && items.length === 0 && (
            <section className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-primary">Starter plan</h3>
              <p className="mt-1 text-xs text-muted">Add a few gentle suggestions for this park.</p>
              <Button type="button" variant="secondary" className="mt-3 w-full" disabled={isPending} onClick={() => run(() => applyStarterTemplate({ dayPlanId }), () => setToolsOpen(false))}>Add starter plan</Button>
            </section>
          )}

          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-primary">Timing check</h3>
            <div className="mt-2"><TimingHelper parkId={parkId} items={timingItems} coachingNote={coachingNote} /></div>
          </section>

          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-primary">Suggested day</h3>
            <div className="mt-2">
              <AiSuggestions
                tripId={tripId}
                dayPlanId={dayPlanId}
                hasPark={Boolean(parkId)}
                disabled={isPending}
                onApply={(suggestions) => run(async () => {
                  for (const item of suggestions) {
                    await saveDayPlanItem({
                      dayPlanId,
                      entityId: item.entityId,
                      entityType: item.entityType,
                      title: item.title,
                      timingType: "EXACT",
                      timeOfDay: "",
                      startTime: item.startTime,
                      endTime: item.endTime,
                      estimatedCost: (item.estimatedCostCents / 100).toFixed(2),
                      notes: item.notes,
                      bookingStatus: item.entityType === "RESTAURANT" ? "WISHLIST" : "NONE",
                      confirmationNumber: "",
                      partySizeOverride: "",
                      backupNote: "",
                      paidExtraType: "",
                    });
                  }
                })}
              />
            </div>
          </section>

          {items.length > 0 && (
            <section className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-primary">Copy or clear</h3>
              <div className="mt-3 space-y-2">
                <Select value={copyTarget} onChange={(event) => setCopyTarget(event.target.value)} disabled={isPending}>
                  <option value="">Copy this day to…</option>
                  {days.filter((day) => day.id !== dayPlanId).map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
                </Select>
                <Button type="button" variant="secondary" className="w-full" disabled={isPending || !copyTarget} onClick={() => run(() => copyDay({ sourceDayPlanId: dayPlanId, targetDayPlanId: copyTarget }), () => setCopyTarget(""))}>Copy items</Button>
                <Button type="button" variant="danger" className="w-full" disabled={isPending} onClick={() => { if (window.confirm("Remove every planned activity from this day? Older bookings will stay in place.")) run(() => clearDay({ dayPlanId }), () => setToolsOpen(false)); }}>Clear this day</Button>
              </div>
            </section>
          )}
        </div>
      </Modal>

      <Modal open={Boolean(editor)} title={typeof editor === "object" && editor ? "Edit item" : "Add to this day"} onClose={() => setEditor(null)}>
        {editor && (
          <ItemEditor
            dayPlanId={dayPlanId}
            parkId={parkId}
            item={typeof editor === "object" ? editor : undefined}
            initialType={typeof editor === "string" ? editor : undefined}
            isPending={isPending}
            onSave={(input) => run(() => saveDayPlanItem(input), () => setEditor(null))}
            onRemove={typeof editor === "object" ? () => { if (window.confirm(`Remove “${editor.title}” from this day?`)) run(() => removeDayPlanItem({ itemId: editor.id }), () => setEditor(null)); } : undefined}
          />
        )}
      </Modal>
    </div>
  );
}

function TimelinePlanItem({ item, index, itemCount, disabled, onEdit, onMove }: { item: PlanItem; index: number; itemCount: number; disabled: boolean; onEdit: () => void; onMove: (direction: "up" | "down") => void }) {
  return (
    <li className="group flex items-stretch gap-1.5">
      <button type="button" onClick={onEdit} className="grid min-h-14 min-w-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-control border border-[rgb(var(--day-accent)/.18)] bg-white/60 px-3 py-2 text-left transition hover:border-[rgb(var(--day-accent)/.45)]">
        <span className={`text-xs font-bold ${item.startTime ? "day-accent-text" : "text-muted"}`}>{timingDescription(item)}</span>
        <span className="min-w-0">
          <strong className="block truncate text-sm text-primary">{item.title}</strong>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted"><span>{entityTypeLabel(item.entityType)}</span>{item.bookingStatus === "BOOKED" && <Badge tone="success">Booked</Badge>}{item.bookingStatus === "WISHLIST" && <span>Still trying</span>}</span>
        </span>
        <span className="text-sm font-semibold text-primary">Edit</span>
      </button>
      <div className="hidden shrink-0 items-center gap-1 lg:flex lg:opacity-0 lg:transition lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <button type="button" aria-label={`Move ${item.title} up`} disabled={disabled || index === 0} onClick={() => onMove("up")} className={buttonStyles({ variant: "ghost", size: "sm", className: "w-11 px-0" })}>↑</button>
        <button type="button" aria-label={`Move ${item.title} down`} disabled={disabled || index === itemCount - 1} onClick={() => onMove("down")} className={buttonStyles({ variant: "ghost", size: "sm", className: "w-11 px-0" })}>↓</button>
      </div>
    </li>
  );
}

function ItemEditor({ dayPlanId, parkId, item, initialType, isPending, onSave, onRemove }: {
  dayPlanId: string;
  parkId: string | null;
  item?: PlanItem;
  initialType?: PickType;
  isPending: boolean;
  onSave: (input: Parameters<typeof saveDayPlanItem>[0]) => void;
  onRemove?: () => void;
}) {
  const [selected, setSelected] = useState<SearchEntity | null>(item ? { id: item.entityId, name: item.title, entityType: item.entityType } : null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState(item?.entityType ?? initialType ?? "ATTRACTION");
  const [results, setResults] = useState<SearchEntity[]>([]);
  const [searching, setSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(!item);

  useEffect(() => {
    if (selected) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/entities?q=${encodeURIComponent(query)}&type=${type}${parkId ? `&parkId=${encodeURIComponent(parkId)}` : ""}`, { signal: controller.signal });
        const data = await response.json() as { entities?: SearchEntity[] };
        setResults(data.entities ?? []);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, query ? 200 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, type, selected, parkId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const startTime = String(form.get("startTime") ?? "");
    const partySize = String(form.get("partySizeOverride") ?? "");
    const timingType = startTime ? "EXACT" : item?.timingType === "TIME_OF_DAY" ? "TIME_OF_DAY" : "FLEXIBLE";
    onSave({
      id: item?.id,
      dayPlanId,
      entityId: selected.id,
      entityType: selected.entityType as PickType,
      title: String(form.get("title") ?? selected.name),
      timingType,
      timeOfDay: timingType === "TIME_OF_DAY" ? (item?.timeOfDay as "MORNING" | "AFTERNOON" | "EVENING") : "",
      startTime,
      endTime: String(form.get("endTime") ?? ""),
      estimatedCost: String(form.get("estimatedCost") ?? ""),
      notes: String(form.get("notes") ?? ""),
      bookingStatus: String(form.get("bookingStatus") ?? item?.bookingStatus ?? "NONE") as "NONE" | "WISHLIST" | "BOOKED",
      confirmationNumber: String(form.get("confirmationNumber") ?? ""),
      partySizeOverride: partySize ? Number(partySize) : "",
      backupNote: String(form.get("backupNote") ?? ""),
      paidExtraType: String(form.get("paidExtraType") ?? "") as "" | "LIGHTNING_LANE" | "SPECIAL_EVENT" | "OTHER",
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Type">
        <Select value={type} disabled={Boolean(item)} onChange={(event) => { setType(event.target.value); setSelected(null); setQuery(""); setIsDropdownOpen(true); }}>
          <option value="ATTRACTION">Attraction</option>
          <option value="RESTAURANT">Dining</option>
          <option value="SHOW">Show</option>
          <option value="EXPERIENCE">Experience or break</option>
        </Select>
      </Field>

      <Field label="Name">
        {selected ? (
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-border bg-parchment/60 px-3 text-sm">
            <span className="min-w-0 truncate"><strong>{selected.name}</strong> <span className="text-muted">· {entityTypeLabel(selected.entityType)}</span></span>
            {!item && <button type="button" onClick={() => { setSelected(null); setQuery(""); setIsDropdownOpen(true); }} className="min-h-11 shrink-0 font-semibold text-primary">Change</button>}
          </div>
        ) : (
          <div className="relative">
            <Input value={query} onChange={(event) => { setQuery(event.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} autoFocus role="combobox" aria-expanded={isDropdownOpen} aria-controls={`entity-options-${dayPlanId}`} aria-autocomplete="list" placeholder={`Search ${entityTypeLabel(type).toLowerCase()}s…`} className="pr-11" />
            <button type="button" aria-label={isDropdownOpen ? "Close choices" : "Show choices"} onClick={() => setIsDropdownOpen((value) => !value)} className="absolute inset-y-0 right-0 min-w-11 text-muted">⌄</button>
          </div>
        )}
      </Field>

      {!selected && isDropdownOpen && (
        <div className="overflow-hidden rounded-control border border-border bg-surface shadow-card">
          {searching ? (
            <p className="p-3 text-xs text-muted">Finding choices…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-muted">No matches. Try another name or type.</p>
          ) : (
            <ul id={`entity-options-${dayPlanId}`} role="listbox" className="max-h-56 overflow-y-auto">
              {results.map((entity) => (
                <li key={entity.id} role="option" aria-selected="false">
                  <button type="button" onClick={() => { setSelected(entity); setIsDropdownOpen(false); }} className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-sand/20 focus:bg-sand/20">
                    <span>{entity.name}</span><span className="text-xs text-muted">{entityTypeLabel(entity.entityType)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <>
          <Field label="Time" optional hint="Leave this blank to keep the item flexible.">
            <Input name="startTime" type="time" defaultValue={item?.startTime ?? ""} />
          </Field>

          <details className="group rounded-control border border-border bg-parchment/45 p-3" open={Boolean(item?.confirmationNumber || item?.paidExtraType || item?.estimatedCostCents || item?.notes || item?.backupNote || item?.partySizeOverride || item?.endTime || item?.bookingStatus === "BOOKED")}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary"><span>More details</span><span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span></summary>
            <div className="mt-3 space-y-3">
              <Field label="Booking status"><Select name="bookingStatus" defaultValue={item?.bookingStatus ?? "NONE"}><option value="NONE">Not a booking</option><option value="WISHLIST">Still trying</option><option value="BOOKED">Booked</option></Select></Field>
              <Field label="Display name" optional><Input name="title" defaultValue={item?.title ?? selected.name} maxLength={150} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="End time" optional><Input name="endTime" type="time" defaultValue={item?.endTime ?? ""} /></Field>
                <Field label="Confirmation number" optional><Input name="confirmationNumber" defaultValue={item?.confirmationNumber ?? ""} maxLength={100} /></Field>
                <Field label="Party size" optional><Input name="partySizeOverride" type="number" min="1" max="50" defaultValue={item?.partySizeOverride ?? ""} /></Field>
                <Field label="Estimated cost ($)" optional><Input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={item?.estimatedCostCents == null ? "" : (item.estimatedCostCents / 100).toFixed(2)} /></Field>
              </div>
              <Field label="Paid extra" optional><Select name="paidExtraType" defaultValue={item?.paidExtraType ?? ""}><option value="">No paid extra</option><option value="LIGHTNING_LANE">Lightning Lane</option><option value="SPECIAL_EVENT">Special event</option><option value="OTHER">Other paid extra</option></Select></Field>
              {selected.entityType === "RESTAURANT" && <Field label="Backup restaurant or plan" optional><Input name="backupNote" defaultValue={item?.backupNote ?? ""} maxLength={500} /></Field>}
              <Field label="Notes" optional><Textarea name="notes" defaultValue={item?.notes ?? ""} maxLength={1000} rows={3} /></Field>
            </div>
          </details>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {onRemove ? <Button type="button" variant="danger" disabled={isPending} onClick={onRemove}>Remove</Button> : <span />}
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
          </div>
        </>
      )}
    </form>
  );
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

function timingDescription(item: PlanItem) {
  if (item.timingType === "EXACT" && item.startTime) return clock(item.startTime);
  if (item.timingType === "TIME_OF_DAY" && item.timeOfDay) return item.timeOfDay.charAt(0) + item.timeOfDay.slice(1).toLowerCase();
  return "Flexible";
}

function entityTypeLabel(value: string) {
  return ({ ATTRACTION: "Attraction", RESTAURANT: "Dining", SHOW: "Show", EXPERIENCE: "Experience" } as Record<string, string>)[value] ?? "Item";
}

function reservationCategoryLabel(value: string) {
  return ({ DINING: "Dining", HOTEL: "Hotel", FLIGHT: "Flight", TRANSPORT: "Transportation", TICKET: "Tickets", EVENT: "Special event", OTHER: "Booking" } as Record<string, string>)[value] ?? "Booking";
}

function clock(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
}

function DayPathIcon() {
  return <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-current stroke-[1.6]" aria-hidden="true"><path d="M5 19c3-1 3-5 6-6s4 2 7 0c2-1 2-4 0-6" /><circle cx="5" cy="19" r="2" /><circle cx="18" cy="6" r="2" /></svg>;
}
