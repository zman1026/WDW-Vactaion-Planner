"use client";

import { FormEvent, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { removeReservation, saveReservation, type MutationResult } from "./actions";

export type ReservationSummary = {
  id: string;
  dayPlanId: string | null;
  category: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  confirmationNumber: string | null;
  location: string | null;
  notes: string | null;
  costCents: number | null;
  partySize: number | null;
};

export type ItineraryBooking = {
  id: string;
  dayPlanId: string;
  title: string;
  entityType: string;
  date: string;
  startTime: string | null;
  status: string;
  confirmationNumber: string | null;
  estimatedCostCents: number | null;
  partySize: number | null;
  notes: string | null;
};

type DayOption = { id: string; label: string; date: string };
type EditorState = ReservationSummary | "new" | null;
type BookingRow = {
  id: string;
  source: "reservation" | "plan";
  dayPlanId: string;
  category: string;
  title: string;
  date: string;
  startTime: string | null;
  status: string;
  confirmationNumber: string | null;
  location: string | null;
  notes: string | null;
  costCents: number | null;
  partySize: number | null;
  reservation?: ReservationSummary;
};

const fieldClass = "mt-1.5 w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15";
const categories = ["DINING", "HOTEL", "FLIGHT", "TRANSPORT", "TICKET", "EVENT", "OTHER"] as const;

export function ReservationCenter({
  tripId,
  tripStartDate,
  days,
  reservations,
  itineraryBookings,
  initialDayId,
  initialReservationId,
  startNew = false,
}: {
  tripId: string;
  tripStartDate: string;
  days: DayOption[];
  reservations: ReservationSummary[];
  itineraryBookings: ItineraryBooking[];
  initialDayId?: string;
  initialReservationId?: string;
  startNew?: boolean;
}) {
  const router = useRouter();
  const deepLinkedReservation = initialReservationId ? reservations.find((item) => item.id === initialReservationId) ?? null : null;
  const [editor, setEditor] = useState<EditorState>(deepLinkedReservation ?? (startNew ? "new" : null));
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const bookings: BookingRow[] = [
    ...reservations.map((item) => ({
      id: item.id,
      source: "reservation" as const,
      dayPlanId: item.dayPlanId ?? dayIdForDate(days, item.date),
      category: item.category,
      title: item.title,
      date: item.date,
      startTime: item.startTime,
      status: item.status,
      confirmationNumber: item.confirmationNumber,
      location: item.location,
      notes: item.notes,
      costCents: item.costCents,
      partySize: item.partySize,
      reservation: item,
    })),
    ...itineraryBookings.map((item) => ({
      id: item.id,
      source: "plan" as const,
      dayPlanId: item.dayPlanId,
      category: item.entityType,
      title: item.title,
      date: item.date,
      startTime: item.startTime,
      status: item.status,
      confirmationNumber: item.confirmationNumber,
      location: null,
      notes: item.notes,
      costCents: item.estimatedCostCents,
      partySize: item.partySize,
    })),
  ].sort((a, b) => `${a.date}-${a.startTime ?? "99:99"}-${a.title}`.localeCompare(`${b.date}-${b.startTime ?? "99:99"}-${b.title}`));

  const confirmed = bookings.filter((item) => isConfirmed(item.status)).length;
  const needsAction = bookings.length - confirmed;

  function run(action: () => Promise<MutationResult>, close = false) {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) return setNotice({ tone: "error", text: result.message });
        setNotice({ tone: "success", text: result.message ?? "Saved." });
        if (close) setEditor(null);
        router.refresh();
      } catch {
        setNotice({ tone: "error", text: "That change could not be saved. Please try again." });
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dayPlanId = String(form.get("dayPlanId") ?? "");
    const selectedDay = days.find((day) => day.id === dayPlanId);
    run(() => saveReservation({
      tripId,
      id: editor && editor !== "new" ? editor.id : undefined,
      dayPlanId,
      category: form.get("category"),
      title: form.get("title"),
      reservationDate: selectedDay?.date ?? tripStartDate,
      startTime: form.get("startTime"),
      endTime: form.get("endTime"),
      status: form.get("status"),
      confirmationNumber: form.get("confirmationNumber"),
      location: form.get("location"),
      notes: form.get("notes"),
      estimatedCost: form.get("estimatedCost"),
      partySize: form.get("partySize"),
    }), true);
  }

  const defaultDayId = editor === "new"
    ? (days.some((day) => day.id === initialDayId) ? initialDayId! : days[0]?.id ?? "")
    : editor
      ? editor.dayPlanId ?? dayIdForDate(days, editor.date)
      : days[0]?.id ?? "";

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-[1.75rem] border border-gold/25 bg-primary p-5 text-white shadow-lift sm:p-7">
      <div className="magic-dust absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sand">Reservations</p>
          <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Add it once. See it everywhere.</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">Dining, travel, tickets, and special events automatically appear on the right day of your plan.</p>
        </div>
        <Button type="button" variant="secondary" size="lg" className="border-white/20 bg-white text-primary hover:bg-sand" onClick={() => setEditor("new")}>+ Add reservation</Button>
      </div>
    </section>

    {notice && <p role="status" className={`rounded-control border p-3 text-sm font-semibold ${notice.tone === "error" ? "border-danger/20 bg-danger/5 text-danger" : "border-success/20 bg-success/5 text-success"}`}>{notice.text}</p>}

    <section aria-labelledby="bookings-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">One simple list</p>
          <h2 id="bookings-title" className="mt-1 text-2xl font-semibold text-primary">Your bookings</h2>
        </div>
        {bookings.length > 0 && <p className="text-xs font-semibold text-muted">{confirmed} confirmed{needsAction ? ` · ${needsAction} need attention` : " · All set"}</p>}
      </div>

      {bookings.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{bookings.map((item) => <BookingCard key={`${item.source}-${item.id}`} tripId={tripId} item={item} onEdit={item.reservation ? () => setEditor(item.reservation!) : undefined} />)}</div> : <Card className="mt-4 border-dashed p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-sand/25 font-display text-xl text-gold">◇</span>
        <h3 className="mt-3 font-display text-xl font-semibold text-primary">No reservations yet</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">Add the first booking and it will automatically join the correct trip day.</p>
        <Button type="button" size="sm" className="mt-4" onClick={() => setEditor("new")}>Add the first reservation</Button>
      </Card>}
    </section>

    <Modal open={editor !== null} title={editor === "new" ? "Add a reservation" : "Edit reservation"} onClose={() => setEditor(null)}>
      {editor && <form key={editor === "new" ? `new-${defaultDayId}` : editor.id} onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">Reservation name
          <input name="title" required maxLength={140} defaultValue={editor === "new" ? "" : editor.title} placeholder="Dinner at California Grill" className={fieldClass} />
        </label>

        <label className="block text-sm font-semibold">Which trip day?
          <select name="dayPlanId" required defaultValue={defaultDayId} className={fieldClass}>{days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select>
          <span className="mt-1.5 block text-xs font-normal text-muted">We’ll place this reservation on that day automatically.</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">Type
            <select name="category" defaultValue={editor === "new" ? "DINING" : editor.category} className={fieldClass}>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select>
          </label>
          <label className="text-sm font-semibold">Time
            <input name="startTime" type="time" defaultValue={editor === "new" ? "" : editor.startTime ?? ""} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold">Status
            <select name="status" defaultValue={editor === "new" ? "CONFIRMED" : editor.status} className={fieldClass}><option value="CONFIRMED">Confirmed</option><option value="PENDING">Needs action</option><option value="WISHLIST">Wish list</option></select>
          </label>
        </div>

        <details className="group rounded-control border border-border bg-parchment/45 p-3" open={editor !== "new" && Boolean(editor.confirmationNumber || editor.location || editor.notes || editor.costCents || editor.partySize || editor.endTime)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary"><span>Add confirmation and details, optional</span><span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span></summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Confirmation number<input name="confirmationNumber" maxLength={120} defaultValue={editor === "new" ? "" : editor.confirmationNumber ?? ""} className={fieldClass} /></label>
            <label className="text-sm font-semibold">Location<input name="location" maxLength={200} defaultValue={editor === "new" ? "" : editor.location ?? ""} className={fieldClass} /></label>
            <label className="text-sm font-semibold">End time<input name="endTime" type="time" defaultValue={editor === "new" ? "" : editor.endTime ?? ""} className={fieldClass} /></label>
            <label className="text-sm font-semibold">Party size<input name="partySize" type="number" min="1" max="50" defaultValue={editor === "new" ? "" : editor.partySize ?? ""} className={fieldClass} /></label>
            <label className="text-sm font-semibold">Estimated cost ($)<input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={editor === "new" || editor.costCents === null ? "" : (editor.costCents / 100).toFixed(2)} className={fieldClass} /></label>
            <label className="text-sm font-semibold sm:col-span-2">Notes<textarea name="notes" rows={3} maxLength={1000} defaultValue={editor === "new" ? "" : editor.notes ?? ""} className={fieldClass} /></label>
          </div>
        </details>

        {notice?.tone === "error" && <p role="alert" className="text-sm text-danger">{notice.text}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button disabled={pending}>{pending ? "Saving…" : editor === "new" ? "Add to my trip" : "Save everywhere"}</Button>
          {editor !== "new" && <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => { if (window.confirm(`Remove “${editor.title}”?`)) run(() => removeReservation({ reservationId: editor.id }), true); }}>Remove</Button>}
        </div>
      </form>}
    </Modal>
  </div>;
}

function BookingCard({ tripId, item, onEdit }: { tripId: string; item: BookingRow; onEdit?: () => void }) {
  const editHref = `/trips/${tripId}?view=day&day=${item.dayPlanId}&edit=${item.id}#day-canvas`;
  return <Card className="group p-4">
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand/20 font-display text-xl text-gold">{categoryIcon(item.category)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold">{categoryLabel(item.category)} · {format(parseISO(item.date), "EEE, MMM d")}</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-primary">{item.title}</h3>
          </div>
          <Badge tone={isConfirmed(item.status) ? "success" : "warning"}>{statusLabel(item.status)}</Badge>
        </div>
        <p className="mt-2 text-xs text-muted">{item.startTime ? clock(item.startTime) : "Time not set"}{item.location ? ` · ${item.location}` : ""}{item.partySize ? ` · Party of ${item.partySize}` : ""}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.confirmationNumber && <span className="inline-flex rounded-full bg-parchment px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">Confirmation {item.confirmationNumber}</span>}
          {item.costCents !== null && <span className="text-xs text-muted">Est. ${(item.costCents / 100).toFixed(2)}</span>}
        </div>
      </div>
      {onEdit ? <button type="button" onClick={onEdit} className={buttonStyles({ variant: "ghost", size: "sm", className: "shrink-0" })}>Edit</button> : <Link href={editHref} className={buttonStyles({ variant: "ghost", size: "sm", className: "shrink-0" })}>Edit</Link>}
    </div>
  </Card>;
}

function dayIdForDate(days: DayOption[], date: string) {
  return days.find((day) => day.date === date)?.id ?? "";
}

function isConfirmed(status: string) {
  return status === "CONFIRMED" || status === "BOOKED";
}

function statusLabel(status: string) {
  if (isConfirmed(status)) return "Confirmed";
  if (status === "PENDING") return "Needs action";
  return "Wish list";
}

function categoryLabel(value: string) {
  return ({ DINING: "Dining", RESTAURANT: "Dining", HOTEL: "Hotel", FLIGHT: "Flight", TRANSPORT: "Transportation", TICKET: "Tickets", EVENT: "Special event", SHOW: "Show", ATTRACTION: "Attraction", EXPERIENCE: "Experience", OTHER: "Other" } as Record<string, string>)[value] ?? "Booking";
}

function categoryIcon(value: string) {
  if (value === "DINING" || value === "RESTAURANT") return "◇";
  if (value === "FLIGHT" || value === "TRANSPORT") return "↗";
  if (value === "HOTEL") return "⌂";
  return "★";
}

function clock(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
}
