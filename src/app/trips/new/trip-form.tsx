"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { createTripSchema } from "@/lib/trip-validation";

type FieldName = "name" | "startDate" | "endDate" | "budget" | "notes";
type FieldErrors = Partial<Record<FieldName, string[]>>;

interface CreateTripResponse {
  tripId?: string;
  message?: string;
  fieldErrors?: FieldErrors;
}

const inputClasses =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-red-600">{errors[0]}</p>;
}

export function TripForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
      budget: String(form.get("budget") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    const validation = createTripSchema.safeParse(payload);

    if (!validation.success) {
      setErrors(validation.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const result = (await response.json()) as CreateTripResponse;

      if (!response.ok || !result.tripId) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message ?? "We couldn't create your trip.");
        return;
      }

      router.push(`/trips/${result.tripId}`);
      router.refresh();
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="name" className="text-sm font-semibold text-slate-800">
          Trip name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          placeholder="The Johnson Family Adventure"
          className={inputClasses}
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError errors={errors.name} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="text-sm font-semibold text-slate-800">
            Start date <span className="text-red-500">*</span>
          </label>
          <input id="startDate" name="startDate" type="date" required className={inputClasses} aria-invalid={Boolean(errors.startDate)} />
          <FieldError errors={errors.startDate} />
        </div>
        <div>
          <label htmlFor="endDate" className="text-sm font-semibold text-slate-800">
            End date <span className="text-red-500">*</span>
          </label>
          <input id="endDate" name="endDate" type="date" required className={inputClasses} aria-invalid={Boolean(errors.endDate)} />
          <FieldError errors={errors.endDate} />
        </div>
      </div>

      <div>
        <label htmlFor="budget" className="text-sm font-semibold text-slate-800">
          Total budget <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">$</span>
          <input
            id="budget"
            name="budget"
            type="number"
            min="0"
            max="10000000"
            step="0.01"
            inputMode="decimal"
            placeholder="5000.00"
            className={`${inputClasses} mt-0 pl-8`}
            aria-invalid={Boolean(errors.budget)}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">A planning target—you can refine the details later.</p>
        <FieldError errors={errors.budget} />
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-semibold text-slate-800">
          Family notes <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder="Celebrations, must-dos, accessibility needs, favorite characters..."
          className={`${inputClasses} resize-y`}
          aria-invalid={Boolean(errors.notes)}
        />
        <FieldError errors={errors.notes} />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link href="/" className="rounded-full px-6 py-3 text-center font-semibold text-slate-600 transition hover:bg-slate-100">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isSubmitting ? "Creating your trip..." : "Create My Trip"}
        </button>
      </div>
    </form>
  );
}
