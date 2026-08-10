import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/current-user";
import { TripForm } from "./trip-form";

export const metadata: Metadata = { title: "Create a New Trip | WDW Planner" };

export default async function NewTripPage() {
  await requireCurrentUser();
  return <div className="mx-auto max-w-3xl space-y-8"><header className="space-y-3 text-center"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">A new adventure begins</p><h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">Plan your family trip</h1><p className="mx-auto max-w-2xl text-muted">Start with the big picture. We’ll create a blank planning page for every date in your stay.</p></header><section className="overflow-hidden rounded-card border border-border bg-surface shadow-card"><div className="h-1.5 bg-gold" /><div className="p-6 sm:p-8"><TripForm /></div></section></div>;
}
