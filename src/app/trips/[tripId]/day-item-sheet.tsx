"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { DayThemeId } from "@/lib/day-themes";
import { saveDayPlanItem } from "./actions";
import { entityTypeLabel, type PickType, type PlanItem } from "./day-planner-types";

type SearchEntity = { id: string; name: string; entityType: string };
type WhenChoice = "FLEXIBLE" | "MORNING" | "AFTERNOON" | "EVENING" | "EXACT";

const ITEM_TYPES: Array<{ value: PickType; label: string }> = [
  { value: "ATTRACTION", label: "Ride" },
  { value: "RESTAURANT", label: "Meal" },
  { value: "SHOW", label: "Show" },
  { value: "EXPERIENCE", label: "Other" },
];

const WHEN_CHOICES: Array<{ value: WhenChoice; label: string }> = [
  { value: "FLEXIBLE", label: "Flexible" },
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "EXACT", label: "Exact time" },
];

export function DayItemSheet({
  editor,
  dayPlanId,
  themeId,
  parkId,
  isPending,
  onClose,
  onSave,
  onRemove,
}: {
  editor: PlanItem | PickType | null;
  dayPlanId: string;
  themeId: DayThemeId;
  parkId: string | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (input: Parameters<typeof saveDayPlanItem>[0]) => void;
  onRemove: (item: PlanItem) => void;
}) {
  const item = typeof editor === "object" && editor ? editor : undefined;
  const initialType = typeof editor === "string" ? editor : undefined;
  return (
    <Modal open={Boolean(editor)} title={item ? "Edit item" : "Add to this day"} onClose={onClose} theme={themeId}>
      {editor && (
        <ItemEditor
          key={item?.id ?? initialType ?? "new"}
          dayPlanId={dayPlanId}
          parkId={parkId}
          item={item}
          initialType={initialType}
          isPending={isPending}
          onSave={onSave}
          onRemove={item ? () => onRemove(item) : undefined}
        />
      )}
    </Modal>
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
  const [type, setType] = useState<PickType>((item?.entityType as PickType) ?? initialType ?? "ATTRACTION");
  const [when, setWhen] = useState<WhenChoice>(initialWhen(item));
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
        if (!response.ok) throw new Error("Search is unavailable.");
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

  function changeType(nextType: PickType) {
    setType(nextType);
    setSelected(null);
    setQuery("");
    setIsDropdownOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const startTime = when === "EXACT" ? String(form.get("startTime") ?? "") : "";
    const partySize = String(form.get("partySizeOverride") ?? "");
    const timingType = when === "EXACT" ? "EXACT" : when === "FLEXIBLE" ? "FLEXIBLE" : "TIME_OF_DAY";
    onSave({
      id: item?.id,
      dayPlanId,
      entityId: selected.id,
      entityType: selected.entityType as PickType,
      title: String(form.get("title") ?? selected.name),
      timingType,
      timeOfDay: when === "MORNING" || when === "AFTERNOON" || when === "EVENING" ? when : "",
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
      <fieldset>
        <legend className="text-sm font-semibold text-ink">What is it?</legend>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {ITEM_TYPES.map((option) => (
            <label key={option.value} className={`grid min-h-11 cursor-pointer place-items-center rounded-control border px-1 text-xs font-semibold transition ${type === option.value ? "border-gold bg-sand/25 text-primary ring-2 ring-gold/15" : "border-border bg-surface text-muted hover:border-gold/50"} ${item ? "cursor-default opacity-75" : ""}`}>
              <input type="radio" name="entityType" value={option.value} checked={type === option.value} disabled={Boolean(item)} onChange={() => changeType(option.value)} className="sr-only" />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Name">
        {selected ? (
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-border bg-parchment/60 px-3 text-sm">
            <span className="min-w-0 truncate"><strong>{selected.name}</strong> <span className="text-muted">· {entityTypeLabel(selected.entityType)}</span></span>
            {!item && <button type="button" onClick={() => { setSelected(null); setQuery(""); setIsDropdownOpen(true); }} className="min-h-11 shrink-0 font-semibold text-primary">Change</button>}
          </div>
        ) : (
          <div className="relative">
            <Input value={query} onChange={(event) => { setQuery(event.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} autoFocus role="combobox" aria-expanded={isDropdownOpen} aria-controls={`entity-options-${dayPlanId}`} aria-autocomplete="list" placeholder={`Search ${searchPlaceholder(type)}…`} className="pr-11" />
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
            <ul id={`entity-options-${dayPlanId}`} role="listbox" className="max-h-52 overflow-y-auto">
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
          <fieldset>
            <legend className="text-sm font-semibold text-ink">When?</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {WHEN_CHOICES.map((option) => (
                <label key={option.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-2 text-center text-xs font-semibold transition ${when === option.value ? "day-accent-border bg-white text-primary ring-2 ring-[rgb(var(--day-accent)/.15)]" : "border-border bg-surface text-muted hover:border-gold/50"} ${option.value === "EXACT" ? "col-span-2 sm:col-span-1" : ""}`}>
                  <input type="radio" name="when" value={option.value} checked={when === option.value} onChange={() => setWhen(option.value)} className="sr-only" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {when === "EXACT" && <Field label="Start time"><Input name="startTime" type="time" required defaultValue={item?.startTime ?? ""} /></Field>}

          <details className="group rounded-control border border-border bg-parchment/45 p-3">
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

function initialWhen(item?: PlanItem): WhenChoice {
  if (item?.timingType === "EXACT") return "EXACT";
  if (item?.timingType === "TIME_OF_DAY" && (item.timeOfDay === "MORNING" || item.timeOfDay === "AFTERNOON" || item.timeOfDay === "EVENING")) return item.timeOfDay;
  return "FLEXIBLE";
}

function searchPlaceholder(type: PickType) {
  if (type === "ATTRACTION") return "rides and attractions";
  if (type === "RESTAURANT") return "restaurants";
  if (type === "SHOW") return "shows";
  return "experiences and breaks";
}
