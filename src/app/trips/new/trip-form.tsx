"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/field";
import { veteranTripSchema } from "@/lib/trip-validation";
import { WDW_HOTELS } from "@/lib/wdw-hotels";

type FieldName = "name" | "startDate" | "endDate" | "budget" | "notes";
type FieldErrors = Partial<Record<FieldName, string[]>>;
interface CreateTripResponse { tripId?: string; message?: string; fieldErrors?: FieldErrors }

const inputClasses = `${controlStyles} mt-2 py-3`;
const tripLengths = [4, 5, 7, 10];
const budgetPresets = [4000, 6000, 8000];

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-danger">{errors[0]}</p>;
}

export function TripForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");

  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return null;
    const difference = Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 86_400_000) + 1;
    return difference > 0 && difference <= 61 ? difference : null;
  }, [startDate, endDate]);

  function applyTripLength(days: number) {
    if (!startDate) return;
    const date = new Date(`${startDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days - 1);
    setEndDate(date.toISOString().slice(0, 10));
    setErrors((current) => ({ ...current, endDate: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const payload = { path: "veteran" as const, name: String(form.get("name") ?? ""), startDate: String(form.get("startDate") ?? ""), endDate: String(form.get("endDate") ?? ""), budget: String(form.get("budget") ?? ""), notes: String(form.get("notes") ?? ""), hotelId: String(form.get("hotelId") ?? ""), adults: Number(form.get("adults") ?? 0), teens: Number(form.get("teens") ?? 0), kids: Number(form.get("kids") ?? 0), toddlers: Number(form.get("toddlers") ?? 0) };
    const validation = veteranTripSchema.safeParse(payload);
    if (!validation.success) { setErrors(validation.error.flatten().fieldErrors); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const result = (await response.json()) as CreateTripResponse;
      if (!response.ok || !result.tripId) { setErrors(result.fieldErrors ?? {}); setFormError(result.message ?? "We couldn't create your trip."); return; }
      router.push(`/trips/${result.tripId}`);
      router.refresh();
    } catch { setFormError("We couldn't reach the server. Check your connection and try again."); }
    finally { setIsSubmitting(false); }
  }

  return <form onSubmit={handleSubmit} noValidate>
    {formError && <div role="alert" className="mb-6 rounded-control border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{formError}</div>}
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="space-y-7">
        <section aria-labelledby="trip-basics-title"><div className="mb-4 flex items-center gap-3"><StepNumber>1</StepNumber><div><h2 id="trip-basics-title" className="font-display text-xl font-semibold text-primary">Name the adventure</h2><p className="text-xs text-muted">Something your whole family will recognize.</p></div></div><label htmlFor="name" className="text-sm font-semibold text-ink">Trip name <span className="text-danger">*</span></label><input id="name" name="name" type="text" required maxLength={100} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder="The Johnson Family Adventure" className={inputClasses} aria-invalid={Boolean(errors.name)} /><FieldError errors={errors.name} /></section>

        <section aria-labelledby="trip-dates-title" className="border-t border-border pt-7"><div className="mb-4 flex items-center gap-3"><StepNumber>2</StepNumber><div><h2 id="trip-dates-title" className="font-display text-xl font-semibold text-primary">Choose your dates</h2><p className="text-xs text-muted">We’ll build one flexible planning page per day.</p></div></div><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="startDate" className="text-sm font-semibold text-ink">Arrival <span className="text-danger">*</span></label><input id="startDate" name="startDate" type="date" required value={startDate} onChange={(event) => { setStartDate(event.target.value); if (endDate && event.target.value > endDate) setEndDate(""); }} className={inputClasses} aria-invalid={Boolean(errors.startDate)} /><FieldError errors={errors.startDate} /></div><div><label htmlFor="endDate" className="text-sm font-semibold text-ink">Departure <span className="text-danger">*</span></label><input id="endDate" name="endDate" type="date" required min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClasses} aria-invalid={Boolean(errors.endDate)} /><FieldError errors={errors.endDate} /></div></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold text-muted">Quick length</span>{tripLengths.map((days) => <button key={days} type="button" disabled={!startDate} onClick={() => applyTripLength(days)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${dayCount === days ? "border-gold bg-sand/25 text-primary" : "border-border bg-surface text-muted hover:border-gold/60 hover:text-primary"}`}>{days} days</button>)}</div></section>

        <section aria-labelledby="trip-details-title" className="border-t border-border pt-7"><div className="mb-4 flex items-center gap-3"><StepNumber>3</StepNumber><div><h2 id="trip-details-title" className="font-display text-xl font-semibold text-primary">Set the planning guardrails</h2><p className="text-xs text-muted">Both are optional and easy to change later.</p></div></div><label htmlFor="budget" className="text-sm font-semibold text-ink">Total budget <span className="font-normal text-muted">(optional)</span></label><div className="relative mt-2"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">$</span><input id="budget" name="budget" type="number" min="0" max="10000000" step="0.01" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="6000.00" className={`${inputClasses} mt-0 pl-8`} aria-invalid={Boolean(errors.budget)} /></div><div className="mt-3 flex flex-wrap gap-2">{budgetPresets.map((amount) => <button key={amount} type="button" onClick={() => setBudget(String(amount))} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${Number(budget) === amount ? "border-gold bg-sand/25 text-primary" : "border-border text-muted hover:border-gold/60 hover:text-primary"}`}>${amount.toLocaleString()}</button>)}</div><FieldError errors={errors.budget} /><label htmlFor="notes" className="mt-5 block text-sm font-semibold text-ink">Family notes <span className="font-normal text-muted">(optional)</span></label><textarea id="notes" name="notes" rows={4} maxLength={2000} placeholder="Celebrations, must-dos, accessibility needs, favorite characters..." className={`${inputClasses} resize-y`} aria-invalid={Boolean(errors.notes)} /><FieldError errors={errors.notes} /></section>

        <details className="group border-t border-border pt-7"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-display text-lg font-semibold text-primary"><span>Hotel and party <span className="font-sans text-xs font-normal text-muted">(optional)</span></span><span className="text-muted transition group-open:rotate-180">⌄</span></summary><div className="mt-4 space-y-5"><label className="block text-sm font-semibold text-primary">Hotel or resort<select name="hotelId" className={inputClasses}><option value="">Choose later</option>{WDW_HOTELS.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></label><fieldset><legend className="text-sm font-semibold text-primary">Who is coming?</legend><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{([['adults', 'Adults'], ['teens', 'Teens'], ['kids', 'Kids'], ['toddlers', 'Toddlers']] as const).map(([name, label]) => <label key={name} className="text-xs font-semibold text-muted">{label}<input name={name} type="number" min="0" max="30" defaultValue="0" className={`${inputClasses} text-center`} /></label>)}</div></fieldset></div></details>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start"><div className="rounded-card border border-gold/25 bg-parchment/70 p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Your trip at a glance</p><h3 className="mt-2 font-display text-xl font-semibold text-primary">{name.trim() || "Your Disney adventure"}</h3><dl className="mt-5 space-y-4"><SummaryRow label="Dates" value={startDate && endDate ? `${friendlyDate(startDate)} – ${friendlyDate(endDate)}` : "Choose arrival and departure"} /><SummaryRow label="Planning pages" value={dayCount ? `${dayCount} day${dayCount === 1 ? "" : "s"}` : "Waiting for dates"} /><SummaryRow label="Budget" value={budget && Number.isFinite(Number(budget)) ? `$${Number(budget).toLocaleString()}` : "Add later if you like"} /></dl><div className="mt-5 rounded-control border border-border bg-surface/75 p-3 text-xs leading-relaxed text-muted">After creation, start by assigning parks. You can add dining, attractions, must-dos, and party preferences at your own pace.</div></div></aside>
    </div>
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end"><Link href="/trips" className={buttonStyles({ variant: "ghost", size: "lg" })}>Cancel</Link><button type="submit" disabled={isSubmitting} className={buttonStyles({ size: "lg" })}>{isSubmitting ? "Creating your trip..." : "Create trip & start planning"}</button></div>
  </form>;
}

function StepNumber({ children }: { children: React.ReactNode }) { return <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{children}</span>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt><dd className="mt-1 text-sm font-semibold leading-snug text-primary">{value}</dd></div>; }
function friendlyDate(value: string) { const date = new Date(`${value}T12:00:00Z`); return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date); }
