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

type ItineraryBooking = { id: string; dayPlanId: string; title: string; entityType: string; date: string; startTime: string | null; status: string; confirmationNumber: string | null };
type DayOption = { id: string; label: string; date: string };

const fieldClass = "mt-1.5 w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15";
const categories = ["DINING", "HOTEL", "FLIGHT", "TRANSPORT", "TICKET", "EVENT", "OTHER"] as const;

export function ReservationCenter({ tripId, tripStartDate, days, reservations, itineraryBookings }: { tripId: string; tripStartDate: string; days: DayOption[]; reservations: ReservationSummary[]; itineraryBookings: ItineraryBooking[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<ReservationSummary | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const confirmed = reservations.filter((item) => item.status === "CONFIRMED").length + itineraryBookings.filter((item) => item.status === "BOOKED").length;
  const needsAction = reservations.filter((item) => item.status !== "CONFIRMED").length + itineraryBookings.filter((item) => item.status === "WISHLIST").length;
  const confirmations = reservations.filter((item) => item.confirmationNumber).length + itineraryBookings.filter((item) => item.confirmationNumber).length;
  const spend = reservations.reduce((total, item) => total + (item.costCents ?? 0), 0);

  function run(action: () => Promise<MutationResult>, close = false) {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) return setNotice({ tone: "error", text: result.message });
        setNotice({ tone: "success", text: result.message ?? "Saved." });
        if (close) setEditor(null);
        router.refresh();
      } catch { setNotice({ tone: "error", text: "That change could not be saved. Please try again." }); }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => saveReservation({
      tripId,
      id: editor && editor !== "new" ? editor.id : undefined,
      dayPlanId: form.get("dayPlanId"), category: form.get("category"), title: form.get("title"), reservationDate: form.get("reservationDate"),
      startTime: form.get("startTime"), endTime: form.get("endTime"), status: form.get("status"), confirmationNumber: form.get("confirmationNumber"),
      location: form.get("location"), notes: form.get("notes"), estimatedCost: form.get("estimatedCost"), partySize: form.get("partySize"),
    }), true);
  }

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-[1.75rem] border border-gold/25 bg-primary p-5 text-white shadow-lift sm:p-7"><div className="magic-dust absolute inset-0 opacity-30" aria-hidden="true" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sand">Your booking hub</p><h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Every confirmation, right where you need it.</h2><p className="mt-3 text-sm leading-relaxed text-white/70">Keep dining, hotels, tickets, travel, and special events together. Anything tied to a trip day also appears in Today mode.</p></div><Button type="button" variant="secondary" size="lg" className="border-white/20 bg-white text-primary hover:bg-sand" onClick={() => setEditor("new")}>+ Add reservation</Button></div></section>

    {notice && <p role="status" className={`rounded-control border p-3 text-sm font-semibold ${notice.tone === "error" ? "border-danger/20 bg-danger/5 text-danger" : "border-success/20 bg-success/5 text-success"}`}>{notice.text}</p>}

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Reservation summary"><MiniStat label="Confirmed" value={String(confirmed)} help="Ready to go" /><MiniStat label="Needs action" value={String(needsAction)} help={needsAction ? "Still to settle" : "Nothing waiting"} /><MiniStat label="Confirmation nos." value={String(confirmations)} help="Stored securely here" /><MiniStat label="Reservation spend" value={money(spend)} help="Included in planning" /></section>

    <section aria-labelledby="saved-reservations-title"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Saved directly</p><h2 id="saved-reservations-title" className="mt-1 text-2xl font-semibold text-primary">Trip reservations</h2></div><Badge>{reservations.length}</Badge></div>{reservations.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{reservations.map((item) => <ReservationCard key={item.id} item={item} onEdit={() => setEditor(item)} />)}</div> : <Card className="mt-4 border-dashed p-6 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-sand/25 font-display text-xl text-gold">◇</span><h3 className="mt-3 font-display text-xl font-semibold text-primary">No confirmations gathered yet</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">Add your hotel, dining, tickets, transportation, or special event details so the day plan can do more of the remembering.</p><Button type="button" size="sm" className="mt-4" onClick={() => setEditor("new")}>Add the first reservation</Button></Card>}</section>

    {itineraryBookings.length > 0 && <section aria-labelledby="itinerary-bookings-title"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Already in your days</p><h2 id="itinerary-bookings-title" className="mt-1 text-2xl font-semibold text-primary">Itinerary bookings</h2><p className="mt-1 text-xs text-muted">Dining wishes and booked items from the day planner are collected here automatically.</p></div><div className="mt-4 overflow-hidden rounded-card border border-border bg-surface shadow-card">{itineraryBookings.map((item, index) => <Link key={item.id} href={`/trips/${tripId}?view=day&day=${item.dayPlanId}#day-canvas`} className={`flex items-center gap-3 p-4 transition hover:bg-sand/10 ${index ? "border-t border-border" : ""}`}><span className="grid size-10 shrink-0 place-items-center rounded-full bg-parchment text-lg text-gold">{item.entityType === "RESTAURANT" ? "◇" : "★"}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-primary">{item.title}</span><span className="mt-0.5 block text-xs text-muted">{format(parseISO(item.date), "EEE, MMM d")}{item.startTime ? ` · ${clock(item.startTime)}` : ""}</span></span><Badge tone={item.status === "BOOKED" ? "success" : "warning"}>{item.status === "BOOKED" ? "Booked" : "Wish list"}</Badge></Link>)}</div></section>}

    <Modal open={editor !== null} title={editor === "new" ? "Add a reservation" : "Edit reservation"} onClose={() => setEditor(null)}>{editor && <form key={editor === "new" ? "new" : editor.id} onSubmit={submit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Type<select name="category" defaultValue={editor === "new" ? "DINING" : editor.category} className={fieldClass}>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label><label className="text-sm font-semibold">Status<select name="status" defaultValue={editor === "new" ? "CONFIRMED" : editor.status} className={fieldClass}><option value="CONFIRMED">Confirmed</option><option value="PENDING">Needs action</option><option value="WISHLIST">Wish list</option></select></label></div><label className="block text-sm font-semibold">Reservation name<input name="title" required maxLength={140} defaultValue={editor === "new" ? "" : editor.title} placeholder="Dinner at California Grill" className={fieldClass} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Trip day<select name="dayPlanId" defaultValue={editor === "new" ? "" : editor.dayPlanId ?? ""} className={fieldClass}><option value="">Choose by date</option>{days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select></label><label className="text-sm font-semibold">Date<input name="reservationDate" type="date" required min={days[0]?.date} max={days.at(-1)?.date} defaultValue={editor === "new" ? tripStartDate : editor.date} className={fieldClass} /></label></div><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Start time<input name="startTime" type="time" defaultValue={editor === "new" ? "" : editor.startTime ?? ""} className={fieldClass} /></label><label className="text-sm font-semibold">End time<input name="endTime" type="time" defaultValue={editor === "new" ? "" : editor.endTime ?? ""} className={fieldClass} /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Confirmation number<input name="confirmationNumber" maxLength={120} defaultValue={editor === "new" ? "" : editor.confirmationNumber ?? ""} className={fieldClass} /></label><label className="text-sm font-semibold">Location<input name="location" maxLength={200} defaultValue={editor === "new" ? "" : editor.location ?? ""} className={fieldClass} /></label><label className="text-sm font-semibold">Estimated cost ($)<input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={editor === "new" || editor.costCents === null ? "" : (editor.costCents / 100).toFixed(2)} className={fieldClass} /></label><label className="text-sm font-semibold">Party size<input name="partySize" type="number" min="1" max="50" defaultValue={editor === "new" ? "" : editor.partySize ?? ""} className={fieldClass} /></label></div><label className="block text-sm font-semibold">Notes<textarea name="notes" rows={3} maxLength={1000} defaultValue={editor === "new" ? "" : editor.notes ?? ""} className={fieldClass} /></label>{notice?.tone === "error" && <p role="alert" className="text-sm text-danger">{notice.text}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><Button disabled={pending}>{pending ? "Saving…" : editor === "new" ? "Add reservation" : "Save changes"}</Button>{editor !== "new" && <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => { if (window.confirm(`Remove “${editor.title}”?`)) run(() => removeReservation({ reservationId: editor.id }), true); }}>Remove</Button>}</div></form>}</Modal>
  </div>;
}

function ReservationCard({ item, onEdit }: { item: ReservationSummary; onEdit: () => void }) { return <Card className="group p-4"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand/20 font-display text-xl text-gold">{categoryIcon(item.category)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold">{categoryLabel(item.category)} · {format(parseISO(item.date), "EEE, MMM d")}</p><h3 className="mt-1 font-display text-xl font-semibold text-primary">{item.title}</h3></div><Badge tone={item.status === "CONFIRMED" ? "success" : "warning"}>{item.status === "CONFIRMED" ? "Confirmed" : item.status === "PENDING" ? "Needs action" : "Wish list"}</Badge></div><p className="mt-2 text-xs text-muted">{item.startTime ? clock(item.startTime) : "Time not set"}{item.location ? ` · ${item.location}` : ""}{item.partySize ? ` · Party of ${item.partySize}` : ""}</p>{item.confirmationNumber && <p className="mt-3 inline-flex rounded-full bg-parchment px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">Confirmation {item.confirmationNumber}</p>}</div><button type="button" onClick={onEdit} className={buttonStyles({ variant: "ghost", size: "sm", className: "shrink-0" })}>Edit</button></div></Card>; }
function MiniStat({ label, value, help }: { label: string; value: string; help: string }) { return <Card className="p-4"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p><p className="mt-1 font-display text-2xl font-semibold text-primary sm:text-3xl">{value}</p><p className="mt-1 truncate text-[11px] text-muted">{help}</p></Card>; }
function categoryLabel(value: string) { return ({ DINING: "Dining", HOTEL: "Hotel", FLIGHT: "Flight", TRANSPORT: "Transportation", TICKET: "Tickets", EVENT: "Special event", OTHER: "Other" } as Record<string, string>)[value] ?? "Reservation"; }
function categoryIcon(value: string) { return ({ DINING: "◇", HOTEL: "⌂", FLIGHT: "↗", TRANSPORT: "→", TICKET: "✦", EVENT: "★", OTHER: "•" } as Record<string, string>)[value] ?? "•"; }
function clock(value: string) { const [hour, minute] = value.split(":").map(Number); return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2020, 0, 1, hour, minute))); }
function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100); }
