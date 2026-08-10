import { clsx } from "clsx";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function BudgetMeter({ plannedCents, budgetCents, compact = false }: { plannedCents: number; budgetCents: number | null; compact?: boolean }) {
  const ratio = budgetCents === null ? 0 : budgetCents === 0 ? (plannedCents ? 1 : 0) : plannedCents / budgetCents;
  const over = budgetCents !== null && plannedCents > budgetCents;
  return <div className={clsx(!compact && "rounded-control border border-border bg-parchment/70 p-4")}><div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold text-primary">Planned spend</span><span className={clsx("font-bold", over ? "text-danger" : "text-ink")}>{money.format(plannedCents / 100)}{budgetCents !== null && <span className="font-normal text-muted"> of {money.format(budgetCents / 100)}</span>}</span></div>{budgetCents !== null && <><div className="mt-2 h-2 overflow-hidden rounded-full bg-border/70"><div className={clsx("h-full rounded-full transition-all duration-500", over ? "bg-danger" : ratio > 0.85 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>{over && !compact && <p className="mt-2 text-xs font-semibold text-danger">Over budget by {money.format((plannedCents - budgetCents) / 100)}</p>}</>}</div>;
}
