import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import Link from "next/link";
import { ParkMark } from "@/components/park-mark";
import { ParkChip } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DayThemeId } from "@/lib/day-themes";
import type { TripProgress } from "@/lib/trip-progress";

export type TripSummary = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  budgetCents: number | null;
  hotelName: string | null;
  firstParkName: string | undefined;
  themeId: DayThemeId;
  dayThemes: Array<{ color: string; title: string; open: boolean }>;
  progress: TripProgress;
};

export function FeaturedTrip({ trip }: { trip: TripSummary }) {
  const actionHref = `/trips/${trip.id}${trip.progress.nextAction.dayId ? `?day=${trip.progress.nextAction.dayId}#day-canvas` : ""}`;
  return <section aria-labelledby="next-trip-title"><Card data-theme={trip.themeId} className="trip-feature relative overflow-hidden border-gold/25 bg-primary text-white shadow-lift"><div className="magic-dust absolute inset-0 opacity-30" aria-hidden="true" /><ParkMark theme={trip.themeId} className="absolute -bottom-8 -right-5 size-56 text-white opacity-[.07] sm:right-8" /><div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sand">Your next Disney adventure</p><h2 id="next-trip-title" className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{trip.name}</h2><p className="mt-3 text-sm font-semibold text-sand">{format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")} · {relativeTrip(trip.startDate, trip.endDate)}</p>{trip.hotelName && <p className="mt-2 text-sm text-white/70">Staying at {trip.hotelName}</p>}{trip.firstParkName && <div className="mt-4"><ParkChip name={trip.firstParkName} className="border-white/15 bg-white/10 text-white" /></div>}</div><div className="rounded-card border border-white/15 bg-white/[.09] p-5 backdrop-blur"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sand">Your next step</p><span className="text-xs font-bold text-sand">{trip.progress.score}% ready</span></div><h3 className="mt-2 font-display text-xl font-semibold text-white">{trip.progress.nextAction.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/70">{trip.progress.nextAction.description}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-sand" style={{ width: `${trip.progress.score}%` }} /></div><Link href={actionHref} className={buttonStyles({ variant: "secondary", size: "lg", className: "mt-5 w-full border-white/20 bg-white text-primary hover:bg-sand" })}>Continue planning</Link></div></div></Card></section>;
}

export function relativeTrip(start: Date, end: Date) { const now = startOfDay(new Date()); if (now >= start && now <= end) return "Happening now"; const days = differenceInCalendarDays(start, now); if (days > 0) return `${days} day${days === 1 ? "" : "s"} to go`; const past = differenceInCalendarDays(now, end); return `${past} day${past === 1 ? "" : "s"} ago`; }
