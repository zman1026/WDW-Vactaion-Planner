"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { ParkMark } from "@/components/park-mark";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/field";
import { buildGuidedWeek, PARK_GUIDES, REST_PREFERENCE_LABELS, TRIP_STYLE_LABELS, type RestPreference, type TripStyle } from "@/lib/guided-trip";
import { guidedTripSchema } from "@/lib/trip-validation";
import { WDW_HOTELS } from "@/lib/wdw-hotels";

type GuidedValues = {
  name: string;
  startDate: string;
  endDate: string;
  hotelId: string;
  adults: number;
  teens: number;
  kids: number;
  toddlers: number;
  style: TripStyle;
  restPreference: RestPreference;
};

type CreateTripResponse = { tripId?: string; message?: string; fieldErrors?: Record<string, string[]> };
const fieldClass = `${controlStyles} mt-2 py-3`;

export function GuidedTripForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<GuidedValues>({ name: "", startDate: "", endDate: "", hotelId: "", adults: 2, teens: 0, kids: 0, toddlers: 0, style: "FIRST_VISIT", restPreference: "MIDDLE" });
  const dayCount = useMemo(() => countDays(values.startDate, values.endDate), [values.startDate, values.endDate]);
  const draft = useMemo(() => buildGuidedWeek(dayCount ?? 0, values.style, values.restPreference), [dayCount, values.style, values.restPreference]);

  function update<K extends keyof GuidedValues>(key: K, value: GuidedValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function continueFromBasics(event: FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) return setError("Give your trip a name.");
    if (!dayCount) return setError("Choose valid arrival and departure dates.");
    setError(null);
    setStep(2);
  }

  function continueToReview(event: FormEvent) {
    event.preventDefault();
    if (values.adults + values.teens + values.kids + values.toddlers < 1) return setError("Add at least one traveler.");
    setError(null);
    setStep(3);
  }

  async function createTrip() {
    setError(null);
    const payload = { path: "guide" as const, ...values, budget: "", notes: "" };
    const parsed = guidedTripSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the trip details.");
    setPending(true);
    try {
      const response = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json() as CreateTripResponse;
      if (!response.ok || !result.tripId) return setError(result.message ?? "We couldn't create the trip.");
      router.push(`/trips/${result.tripId}`);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Help me plan · Step {step} of 3</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-primary">{step === 1 ? "Start with the trip" : step === 2 ? "Tell us about your family" : "Your first draft"}</h2>
        </div>
        <Link href="/trips/new?path=veteran" className="min-h-11 content-center text-sm font-semibold text-primary underline decoration-border underline-offset-4">Plan it myself</Link>
      </div>
      <div className="mb-7 flex gap-2" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((number) => <span key={number} className={`h-1.5 flex-1 rounded-full ${number <= step ? "bg-gold" : "bg-border"}`} />)}
      </div>
      {error && <p role="alert" className="mb-5 rounded-control border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</p>}

      {step === 1 && (
        <form onSubmit={continueFromBasics} className="space-y-5">
          <label className="block text-sm font-semibold text-primary">Trip name<input className={fieldClass} value={values.name} onChange={(event) => update("name", event.target.value)} placeholder="The Johnson Family Adventure" maxLength={100} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-primary">Arrival<input type="date" className={fieldClass} value={values.startDate} onChange={(event) => update("startDate", event.target.value)} /></label>
            <label className="block text-sm font-semibold text-primary">Departure<input type="date" min={values.startDate || undefined} className={fieldClass} value={values.endDate} onChange={(event) => update("endDate", event.target.value)} /></label>
          </div>
          <label className="block text-sm font-semibold text-primary">Hotel <span className="font-normal text-muted">(optional)</span><select className={fieldClass} value={values.hotelId} onChange={(event) => update("hotelId", event.target.value)}><option value="">Choose later</option>{WDW_HOTELS.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></label>
          <div className="flex justify-end"><button className={buttonStyles({ size: "lg" })}>Next: your family</button></div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={continueToReview} className="space-y-7">
          <fieldset><legend className="text-sm font-semibold text-primary">Who is coming?</legend><p className="mt-1 text-xs text-muted">Simple age groups help us choose a comfortable starting plan.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{([['adults', 'Adults'], ['teens', 'Teens 13–17'], ['kids', 'Kids 4–12'], ['toddlers', 'Toddlers 0–3']] as const).map(([key, label]) => <label key={key} className="rounded-control border border-border bg-parchment/45 p-3 text-xs font-semibold text-primary">{label}<input type="number" min="0" max="30" inputMode="numeric" className={`${fieldClass} text-center`} value={values[key]} onChange={(event) => update(key, Math.max(0, Number(event.target.value)))} /></label>)}</div></fieldset>
          <ChoiceGroup title="What sounds most like your trip?" value={values.style} options={TRIP_STYLE_LABELS} onChange={(value) => update("style", value as TripStyle)} />
          <ChoiceGroup title="Where should we make room to rest?" value={values.restPreference} options={REST_PREFERENCE_LABELS} onChange={(value) => update("restPreference", value as RestPreference)} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><button type="button" className={buttonStyles({ variant: "ghost", size: "lg" })} onClick={() => setStep(1)}>Back</button><button className={buttonStyles({ size: "lg" })}>Review my week</button></div>
        </form>
      )}

      {step === 3 && (
        <div>
          <div className="rounded-control border border-gold/25 bg-sand/10 p-4 text-sm leading-relaxed text-primary"><strong>This is only a starting point.</strong> Every park and stop can be changed after we create the trip.</div>
          <ol className="mt-4 space-y-2">
            {draft.map((day) => day.park ? <li key={day.dayNumber} data-theme={day.park} className="day-theme day-theme__hero flex gap-3 rounded-control border p-3"><span className="day-accent-text grid size-10 shrink-0 place-items-center rounded-full border border-[rgb(var(--day-accent)/.2)] bg-white/70"><ParkMark theme={day.park} className="size-6" /></span><div><p className="text-sm font-semibold text-primary">Day {day.dayNumber}: {PARK_GUIDES[day.park].name}</p><p className="mt-0.5 text-xs leading-relaxed text-muted">We chose it because {day.explanation}.</p></div></li> : <li key={day.dayNumber} className="flex gap-3 rounded-control border border-border bg-parchment/55 p-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand/30 text-gold">☀</span><div><p className="text-sm font-semibold text-primary">Day {day.dayNumber}: Rest day</p><p className="mt-0.5 text-xs leading-relaxed text-muted">A slower day gives your family room to recover and enjoy the resort.</p></div></li>)}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-muted">Shows and parades run on many days, not all. Confirm your dates in My Disney Experience.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><button type="button" className={buttonStyles({ variant: "ghost", size: "lg" })} onClick={() => setStep(2)}>Back</button><button type="button" disabled={pending} className={buttonStyles({ size: "lg" })} onClick={createTrip}>{pending ? "Creating your draft…" : "Create my draft trip"}</button></div>
        </div>
      )}
    </div>
  );
}

function ChoiceGroup({ title, value, options, onChange }: { title: string; value: string; options: Record<string, string>; onChange: (value: string) => void }) {
  return <fieldset><legend className="text-sm font-semibold text-primary">{title}</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(options).map(([option, label]) => <label key={option} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-3 py-2 text-sm font-semibold ${value === option ? "border-gold bg-sand/20 text-primary ring-1 ring-gold/20" : "border-border text-muted"}`}><input type="radio" checked={value === option} onChange={() => onChange(option)} /><span>{label}</span></label>)}</div></fieldset>;
}

function countDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return null;
  const days = Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 86_400_000) + 1;
  return days > 0 && days <= 61 ? days : null;
}
