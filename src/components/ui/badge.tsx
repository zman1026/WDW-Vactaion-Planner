import { clsx } from "clsx";
import type { HTMLAttributes } from "react";
import { parkThemeId } from "@/lib/day-themes";

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" }) {
  return <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", tone === "neutral" && "border-border bg-parchment text-muted", tone === "success" && "border-success/20 bg-success/10 text-success", tone === "warning" && "border-warning/20 bg-warning/10 text-warning", className)} {...props} />;
}

export type ParkTone = "mk" | "epcot" | "hs" | "ak" | "rest";

export function parkTone(name?: string | null): ParkTone {
  const theme = parkThemeId(name);
  return theme === "mk" || theme === "epcot" || theme === "hs" || theme === "ak" ? theme : "rest";
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
