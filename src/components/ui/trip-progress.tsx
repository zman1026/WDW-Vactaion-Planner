import { clsx } from "clsx";
import type { TripProgress as TripProgressValue } from "@/lib/trip-progress";

export function TripProgressMeter({ progress, compact = false }: { progress: TripProgressValue; compact?: boolean }) {
  return <div className={clsx(!compact && "rounded-control border border-border bg-parchment/55 p-4")}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Plan progress</span>
      <span className="text-sm font-bold text-primary">{progress.score}%</span>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/70" role="progressbar" aria-label="Trip planning progress" aria-valuenow={progress.score} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${progress.score}%` }} />
    </div>
    {!compact && <div className="mt-2 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-success">{progress.label}</span><span className="text-muted">{progress.completedSteps} of {progress.totalSteps} signals complete</span></div>}
  </div>;
}
