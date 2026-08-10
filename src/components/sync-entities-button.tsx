"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncEntitiesButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  async function sync() {
    setState("loading");
    try { const response = await fetch("/api/entities/sync", { method: "POST" }); if (!response.ok) throw new Error(); router.refresh(); setState("idle"); }
    catch { setState("error"); }
  }
  return <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={sync} disabled={state === "loading"} className="rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{state === "loading" ? "Syncing WDW directory…" : "Sync park & hotel data"}</button>{state === "error" && <span className="text-xs text-danger">Sync failed. Try again shortly.</span>}</div>;
}
