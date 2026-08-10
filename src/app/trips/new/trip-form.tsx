"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/field";
import { createTripSchema } from "@/lib/trip-validation";

type FieldName = "name" | "startDate" | "endDate" | "budget" | "notes";
type FieldErrors = Partial<Record<FieldName, string[]>>;

interface CreateTripResponse {
  tripId?: string;
  message?: string;
  fieldErrors?: FieldErrors;
}

const inputClasses = `${controlStyles} mt-2 py-3`;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-danger">{errors[0]}</p>;
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
        <div role="alert" className="rounded-control border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="name" className="text-sm font-semibold text-ink">
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
          <label htmlFor="startDate" className="text-sm font-semibold text-ink">
            Start date <span className="text-red-500">*</span>
          </label>
          <input id="startDate" name="startDate" type="date" required className={inputClasses} aria-invalid={Boolean(errors.startDate)} />
          <FieldError errors={errors.startDate} />
        </div>
        <div>
          <label htmlFor="endDate" className="text-sm font-semibold text-ink">
            End date <span className="text-red-500">*</span>
          </label>
          <input id="endDate" name="endDate" type="date" required className={inputClasses} aria-invalid={Boolean(errors.endDate)} />
          <FieldError errors={errors.endDate} />
        </div>
      </div>

      <div>
        <label htmlFor="budget" className="text-sm font-semibold text-ink">
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
        <p className="mt-2 text-xs text-muted">A planning target—you can refine the details later.</p>
        <FieldError errors={errors.budget} />
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-semibold text-ink">
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
        <Link href="/trips" className={buttonStyles({ variant: "ghost", size: "lg" })}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className={buttonStyles({ size: "lg" })}
        >
          {isSubmitting ? "Creating your trip..." : "Create My Trip"}
        </button>
      </div>
    </form>
  );
}
