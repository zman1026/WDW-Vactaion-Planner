"use client";

import { FormEvent, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
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
type BookingRow = {
  id: string;
  source: "reservation" | "plan";
  dayPlanId: string;
  category: string;
  title: string;
  date: string;
  dayLabel: string;
  startTime: string | null;
  status: string;
  confirmationNumber: string | null;
  location: string | null;
  costCents: number | null;
  partySize: number | null;
  reservation?: ReservationSummary;
};

const categories = ["DINING", "HOTEL", "FLIGHT", "TRANSPORT", "TICKET", "EVENT", "OTHER"] as const;

export function ReservationCenter({
  tripId,
  days,
  reservations,
  itineraryBookings,
  initialReservationId,
}: {
  tripId: string;
  days: DayOption[];
  reservations: ReservationSummary[];
  itineraryBookings: ItineraryBooking[];
  initialReservationId?: string;
}) {
  const router = useRouter();
  const deepLinkedReservation = initialReservationId ? reservations.find((item) => item.id === initialReservationId) ?? null : null;
  const [editor, setEditor] = useState<ReservationSummary | null>(deepLinkedReservation);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const mapReservation = (item: ReservationSummary): BookingRow => {
    const dayPlanId = item.dayPlanId ?? dayIdForDate(days, item.date);
    return {
      id: item.id,
      source: "reservation" as const,
      dayPlanId,
      category: item.category,
      title: item.title,
      date: item.date,
      dayLabel: days.find((day) => day.id === dayPlanId)?.label ?? format(parseISO(item.date), "EEE, MMM d"),
      startTime: item.startTime,
      status: item.status,
      confirmationNumber: item.confirmationNumber,
      location: item.location,
      costCents: item.costCents,
      partySize: item.partySize,
      reservation: item,
    };
  };
  const reservationRows = reservations.map(mapReservation);
  const duplicateReservationIds = new Set(reservationRows.filter((reservation) => itineraryBookings.some((item) => sameItineraryEntry(reservation, item))).map((item) => item.id));
  const bookings: BookingRow[] = [
    ...reservationRows.filter((item) => item.status === "CONFIRMED" && !duplicateReservationIds.has(item.id)),
    ...itineraryBookings.map((item) => ({
      id: item.id,
      source: "plan" as const,
      dayPlanId: item.dayPlanId,
      category: item.entityType,
      title: item.title,
      date: item.date,
      dayLabel: days.find((day) => day.id === item.dayPlanId)?.label ?? format(parseISO(item.date), "EEE, MMM d"),
      startTime: item.startTime,
      status: item.status,
      confirmationNumber: item.confirmationNumber,
      location: null,
      costCents: item.estimatedCostCents,
      partySize: item.partySize,
    })),
  ].sort((a, b) => `${a.date}-${a.startTime ?? "99:99"}-${a.title}`.localeCompare(`${b.date}-${b.startTime ?? "99:99"}-${b.title}`));
  const olderOpenItems = reservationRows
    .sort((a, b) => `${a.date}-${a.startTime ?? "99:99"}-${a.title}`.localeCompare(`${b.date}-${b.startTime ?? "99:99"}-${b.title}`));

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
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    const dayPlanId = String(form.get("dayPlanId") ?? "");
    const selectedDay = days.find((day) => day.id === dayPlanId);
    run(() => saveReservation({
      tripId,
      id: editor.id,
      dayPlanId,
      category: form.get("category"),
      title: form.get("title"),
      reservationDate: selectedDay?.date ?? editor.date,
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

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-border bg-surface p-4 shadow-card sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Bookings</p>
        <h2 className="mt-1 text-2xl font-semibold text-primary">Bookings from your days</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Booked meals and activities appear here automatically. Add or change them in the day where they happen.
        </p>
      </section>

      {notice && (
        <p role="status" className={`rounded-control border p-3 text-sm font-semibold ${notice.tone === "error" ? "border-danger/20 bg-danger/5 text-danger" : "border-success/20 bg-success/5 text-success"}`}>
          {notice.text}
        </p>
      )}

      {bookings.length > 0 ? (
        <ol className="space-y-2" aria-label="Booked trip items">
          {bookings.map((item) => (
            <li key={`${item.source}-${item.id}`}>
              <BookingCard tripId={tripId} item={item} />
            </li>
          ))}
        </ol>
      ) : (
        <Card className="border-dashed p-6 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-sand/25 text-xl text-gold" aria-hidden="true">◇</span>
          <h3 className="mt-3 text-xl font-semibold text-primary">No bookings yet</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">Open a day, add a meal or activity, then mark it Booked.</p>
          {days[0] && <Link href={dayHref(tripId, days[0].id)} className={buttonStyles({ className: "mt-4" })}>Open the first day</Link>}
        </Card>
      )}

      {olderOpenItems.length > 0 && (
        <details className="group rounded-card border border-border bg-surface shadow-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-primary">
            <span>Older reservation records ({olderOpenItems.length})</span>
            <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
          </summary>
          <ol className="space-y-2 border-t border-border p-3">
            {olderOpenItems.map((item) => <li key={item.id}><BookingCard tripId={tripId} item={item} onEdit={() => setEditor(item.reservation!)} /></li>)}
          </ol>
        </details>
      )}

      <Modal open={editor !== null} title="Edit older booking" onClose={() => setEditor(null)}>
        {editor && (
          <form key={editor.id} onSubmit={submit} className="space-y-4">
            <p className="rounded-control bg-parchment p-3 text-xs leading-relaxed text-muted">
              This booking was created in the older reservation form. You can still update it here; new bookings are added inside a day.
            </p>
            <Field label="Booking name"><Input name="title" required maxLength={140} defaultValue={editor.title} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Trip day"><Select name="dayPlanId" required defaultValue={editor.dayPlanId ?? dayIdForDate(days, editor.date)}>{days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</Select></Field>
              <Field label="Type"><Select name="category" defaultValue={editor.category}>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</Select></Field>
              <Field label="Time" optional><Input name="startTime" type="time" defaultValue={editor.startTime ?? ""} /></Field>
              <Field label="Status"><Select name="status" defaultValue={editor.status}><option value="CONFIRMED">Booked</option><option value="PENDING">Needs action</option><option value="WISHLIST">Wish list</option></Select></Field>
            </div>
            <details className="group rounded-control border border-border bg-parchment/45 p-3" open={Boolean(editor.confirmationNumber || editor.location || editor.notes || editor.costCents || editor.partySize || editor.endTime)}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary"><span>More details</span><span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span></summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Confirmation number" optional><Input name="confirmationNumber" maxLength={120} defaultValue={editor.confirmationNumber ?? ""} /></Field>
                <Field label="Location" optional><Input name="location" maxLength={200} defaultValue={editor.location ?? ""} /></Field>
                <Field label="End time" optional><Input name="endTime" type="time" defaultValue={editor.endTime ?? ""} /></Field>
                <Field label="Party size" optional><Input name="partySize" type="number" min="1" max="50" defaultValue={editor.partySize ?? ""} /></Field>
                <Field label="Estimated cost ($)" optional><Input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={editor.costCents === null ? "" : (editor.costCents / 100).toFixed(2)} /></Field>
                <Field label="Notes" optional><Textarea name="notes" rows={3} maxLength={1000} defaultValue={editor.notes ?? ""} /></Field>
              </div>
            </details>
            {notice?.tone === "error" && <p role="alert" className="text-sm text-danger">{notice.text}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="danger" disabled={pending} onClick={() => { if (window.confirm(`Remove “${editor.title}”?`)) run(() => removeReservation({ reservationId: editor.id }), true); }}>Remove</Button>
              <Button disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function BookingCard({ tripId, item, onEdit }: { tripId: string; item: BookingRow; onEdit?: () => void }) {
  const href = dayHref(tripId, item.dayPlanId, item.source === "plan" ? item.id : undefined);
  const content = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand/20 text-xl text-gold" aria-hidden="true">{categoryIcon(item.category)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm text-primary">{item.title}</strong>
          <Badge tone={isConfirmed(item.status) ? "success" : "warning"}>{statusLabel(item.status)}</Badge>
        </span>
        <span className="mt-1 block text-xs text-muted">{item.dayLabel} · {item.startTime ? clock(item.startTime) : "Flexible"} · {categoryLabel(item.category)}</span>
        {item.confirmationNumber && <span className="mt-1 block truncate text-[11px] font-semibold text-primary">Confirmation {item.confirmationNumber}</span>}
      </span>
      <span className="shrink-0 text-sm font-semibold text-primary">{item.source === "plan" ? "Edit" : "Open"}</span>
    </>
  );

  if (onEdit) {
    return <button type="button" onClick={onEdit} className="flex min-h-16 w-full items-center gap-3 rounded-card border border-border bg-surface p-3 text-left shadow-card transition hover:border-gold/40">{content}</button>;
  }
  return <Link href={href} className="flex min-h-16 w-full items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-card transition hover:border-gold/40">{content}</Link>;
}

function dayIdForDate(days: DayOption[], date: string) {
  return days.find((day) => day.date === date)?.id ?? "";
}

function dayHref(tripId: string, dayPlanId: string, edit?: string) {
  return `/trips/${tripId}?view=day&day=${dayPlanId}${edit ? `&edit=${edit}` : ""}#day-canvas`;
}

function isConfirmed(status: string) {
  return status === "CONFIRMED" || status === "BOOKED";
}

function statusLabel(status: string) {
  if (isConfirmed(status)) return "Booked";
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

function sameItineraryEntry(reservation: BookingRow, item: ItineraryBooking) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return reservation.dayPlanId === item.dayPlanId
    && normalize(reservation.title) === normalize(item.title)
    && (reservation.startTime ?? "") === (item.startTime ?? "");
}
