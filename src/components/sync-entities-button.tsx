"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type SyncResult = { hotelCount: number; syncedAt: string; mode: "live" | "hotel-fallback"; warning: string | null };

export function SyncEntitiesButton({ compact = false, lastSynced, hotelCount }: { compact?: boolean; lastSynced?: string | null; hotelCount?: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  async function sync() {
    setState("loading");
    try { const response = await fetch("/api/entities/sync", { method: "POST" }); if (!response.ok) throw new Error(); const value = await response.json() as SyncResult; setResult(value); setState("success"); router.refresh(); }
    catch { setState("error"); }
  }
  const readyHotels = result?.hotelCount ?? hotelCount;
  const refreshedAt = result?.syncedAt ?? lastSynced;
  return <div className={compact ? "space-y-2" : "flex flex-wrap items-center gap-3"}>
    <Button type="button" variant="secondary" size="sm" onClick={sync} disabled={state === "loading"}>{state === "loading" ? "Refreshing resort list…" : readyHotels ? "Refresh resort list" : "Load resort hotels"}</Button>
    {!compact && state === "idle" && refreshedAt && <span className="text-xs text-muted">{readyHotels ?? 0} resorts ready · Last refreshed {formatSyncTime(refreshedAt)}</span>}
    {state === "success" && <span role="status" className={`text-xs font-semibold ${result?.warning ? "text-warning" : "text-success"}`}>{result?.warning ?? `${result?.hotelCount ?? 0} resorts are ready.`}</span>}
    {state === "error" && <span role="alert" className="text-xs text-danger">Couldn’t refresh right now. You can still enter any hotel manually.</span>}
  </div>;
}

function formatSyncTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
