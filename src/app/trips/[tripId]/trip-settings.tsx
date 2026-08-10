"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { PartyProfile } from "@/lib/trip-management-validation";

import { assignHotel, deleteTrip, updatePartyProfile, updateTrip, type MutationResult } from "./actions";

type Hotel = { id: string; name: string };
type TripValues = { id: string; name: string; startDate: string; endDate: string; budget: string; notes: string; hotelId: string | null; partyProfile: PartyProfile };

const fieldClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function TripSettings({ trip, hotels }: { trip: TripValues; hotels: Hotel[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<MutationResult>) {
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.success) { setMessage(result.message ?? "Saved."); router.refresh(); }
        else setError(result.message);
      } catch { setError("That change could not be saved. Please try again."); }
    });
  }

  function submitTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    run(() => updateTrip({ tripId: trip.id, name: form.get("name"), startDate: form.get("startDate"), endDate: form.get("endDate"), budget: form.get("budget"), notes: form.get("notes") }));
  }

  function submitParty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    run(() => updatePartyProfile({ tripId: trip.id, partySize: form.get("partySize"), ages: form.get("ages"), dietaryNotes: form.get("dietaryNotes"), accessibilityNotes: form.get("accessibilityNotes"), mustDos: form.get("mustDos"), avoidList: form.get("avoidList") }));
  }

  return <section className="rounded-2xl border bg-white shadow-sm">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between p-5 text-left font-semibold"><span>Trip, hotel & party settings</span><span className="text-slate-400">{open ? "−" : "+"}</span></button>
    {open && <div className="space-y-8 border-t p-5 sm:p-6">
      {(message || error) && <p role="status" className={`rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{error ?? message}</p>}
      <form onSubmit={submitTrip} className="space-y-4">
        <h2 className="text-lg font-bold">Trip details</h2>
        <label className="block text-sm font-semibold">Trip name<input name="name" required maxLength={100} defaultValue={trip.name} className={fieldClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Start date<input name="startDate" type="date" required defaultValue={trip.startDate} className={fieldClass} /></label><label className="text-sm font-semibold">End date<input name="endDate" type="date" required defaultValue={trip.endDate} className={fieldClass} /></label></div>
        <p className="text-xs text-slate-500">Shortening a trip removes only empty days. Remove itinerary items and notes, then set excluded days to “Rest day” first.</p>
        <label className="block text-sm font-semibold">Budget ($)<input name="budget" type="number" min="0" step="0.01" defaultValue={trip.budget} className={fieldClass} /></label>
        <label className="block text-sm font-semibold">Trip notes<textarea name="notes" rows={3} maxLength={2000} defaultValue={trip.notes} className={fieldClass} /></label>
        <button disabled={pending} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save trip details</button>
      </form>

      <div className="border-t pt-6"><h2 className="text-lg font-bold">WDW hotel</h2><label className="mt-3 block text-sm font-semibold">Resort hotel<select value={trip.hotelId ?? ""} disabled={pending} onChange={(event) => run(() => assignHotel({ tripId: trip.id, hotelId: event.target.value || null }))} className={fieldClass}><option value="">No hotel selected</option>{hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></label>{hotels.length === 0 && <p className="mt-2 text-xs text-amber-700">No cached hotels yet. Sync the park directory below.</p>}</div>

      <form onSubmit={submitParty} className="space-y-4 border-t pt-6">
        <div><h2 className="text-lg font-bold">Party profile</h2><p className="mt-1 text-sm text-slate-500">These details are included automatically in AI day suggestions.</p></div>
        <label className="block text-sm font-semibold">Party size<input name="partySize" type="number" min="1" max="50" required defaultValue={trip.partyProfile.partySize} className={fieldClass} /></label>
        <label className="block text-sm font-semibold">Ages or age bands<input name="ages" maxLength={300} defaultValue={trip.partyProfile.ages} placeholder="Adults 38 and 40; children 6 and 10" className={fieldClass} /></label>
        <label className="block text-sm font-semibold">Dietary notes<textarea name="dietaryNotes" rows={2} maxLength={1000} defaultValue={trip.partyProfile.dietaryNotes} className={fieldClass} /></label>
        <label className="block text-sm font-semibold">Accessibility notes<textarea name="accessibilityNotes" rows={2} maxLength={1000} defaultValue={trip.partyProfile.accessibilityNotes} className={fieldClass} /></label>
        <label className="block text-sm font-semibold">Must-dos<textarea name="mustDos" rows={2} maxLength={1000} defaultValue={trip.partyProfile.mustDos} placeholder="Guardians, fireworks, character breakfast…" className={fieldClass} /></label>
        <label className="block text-sm font-semibold">Avoid list<textarea name="avoidList" rows={2} maxLength={1000} defaultValue={trip.partyProfile.avoidList} placeholder="Big drops, late nights…" className={fieldClass} /></label>
        <button disabled={pending} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save party profile</button>
      </form>

      <div className="border-t border-red-100 pt-6"><h2 className="font-bold text-red-800">Delete trip</h2><p className="mt-1 text-sm text-slate-600">This permanently removes every planning day and item.</p><button type="button" disabled={pending} onClick={() => { if (window.confirm(`Permanently delete “${trip.name}”? This cannot be undone.`)) startTransition(() => deleteTrip({ tripId: trip.id })); }} className="mt-3 rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Delete this trip</button></div>
    </div>}
  </section>;
}
