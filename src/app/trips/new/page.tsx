import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/current-user";
import Link from "next/link";
import { ParkMark } from "@/components/park-mark";
import { TripForm } from "./trip-form";
import { GuidedTripForm } from "./guided-trip-form";

export const metadata: Metadata = { title: "Create a New Trip | WDW Planner" };

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  await requireCurrentUser();
  const { path } = await searchParams;
  return <div className="mx-auto max-w-3xl space-y-8"><header className="space-y-3 text-center"><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">A new adventure begins</p><h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">Plan your family trip</h1><p className="mx-auto max-w-2xl text-muted">Choose how much help you want. Both paths lead to the same easy-to-edit day planner.</p></header>{path === "guide" ? <FlowCard><GuidedTripForm /></FlowCard> : path === "veteran" ? <FlowCard><div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">I’ll plan it myself</p><h2 className="mt-1 font-display text-2xl font-semibold text-primary">Create an open trip</h2></div><Link href="/trips/new?path=guide" className="min-h-11 content-center text-sm font-semibold text-primary underline decoration-border underline-offset-4">Help me plan</Link></div><TripForm /></FlowCard> : <div className="grid gap-4 sm:grid-cols-2"><Door href="/trips/new?path=guide" theme="mk" title="Help me plan" description="Answer a few easy questions. We’ll suggest parks and add editable starter stops to each park day." action="Guide me" /><Door href="/trips/new?path=veteran" theme="epcot" title="I’ll plan it myself" description="Choose your dates and start with open days. Nothing is filled in for you." action="Start with open days" /></div>}</div>;
}

function FlowCard({ children }: { children: React.ReactNode }) { return <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card"><div className="h-1.5 bg-gold" /><div className="p-5 sm:p-8">{children}</div></section>; }
function Door({ href, theme, title, description, action }: { href: string; theme: "mk" | "epcot"; title: string; description: string; action: string }) { return <Link href={href} data-theme={theme} className="day-theme day-theme__hero group flex min-h-64 flex-col rounded-card border p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lift"><span className="day-accent-text grid size-14 place-items-center rounded-full border border-[rgb(var(--day-accent)/.2)] bg-white/70"><ParkMark theme={theme} className="size-9" /></span><h2 className="mt-6 font-display text-2xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{description}</p><span className="day-accent-text mt-auto pt-6 text-sm font-bold">{action} →</span></Link>; }
