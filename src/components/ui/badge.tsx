import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={clsx("inline-flex items-center rounded-full border border-border bg-parchment px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted", className)} {...props} />;
}

export type ParkTone = "mk" | "epcot" | "hs" | "ak" | "rest";

export function parkTone(name?: string | null): ParkTone {
  const normalized = name?.toLowerCase() ?? "";
  if (normalized.includes("magic kingdom")) return "mk";
  if (normalized.includes("epcot")) return "epcot";
  if (normalized.includes("hollywood")) return "hs";
  if (normalized.includes("animal kingdom")) return "ak";
  return "rest";
}

const tones: Record<ParkTone, string> = {
  mk: "border-park-mk/25 bg-park-mk/10 text-park-mk",
  epcot: "border-park-epcot/25 bg-park-epcot/10 text-park-epcot",
  hs: "border-park-hs/25 bg-park-hs/10 text-park-hs",
  ak: "border-park-ak/25 bg-park-ak/10 text-park-ak",
  rest: "border-park-rest/20 bg-park-rest/10 text-park-rest",
};

export function ParkChip({ name, className }: { name?: string | null; className?: string }) {
  const tone = parkTone(name);
  return <span className={clsx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold", tones[tone], className)}>{name || "Rest day"}</span>;
}
