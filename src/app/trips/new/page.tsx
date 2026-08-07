import type { Metadata } from "next";

import { requireCurrentUser } from "@/lib/current-user";

import { TripForm } from "./trip-form";

export const metadata: Metadata = {
  title: "Create a New Trip | WDW Planner",
};

export default async function NewTripPage() {
  await requireCurrentUser();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">A new adventure begins</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Plan your family trip</h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Start with the big picture. We’ll create a blank planning day for every date in your stay.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
        <div className="p-6 sm:p-8">
          <TripForm />
        </div>
      </section>
    </div>
  );
}
