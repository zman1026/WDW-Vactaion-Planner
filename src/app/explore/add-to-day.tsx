"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { addEntityToDay } from "./actions";

export function AddToDay({ entity, days }: { entity: { id: string; name: string; entityType: string }; days: Array<{ id: string; label: string }> }) {
  const [dayPlanId, setDayPlanId] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tripId?: string; error?: string } | null>(null);
  return <div className="mt-4 border-t border-border pt-3"><div className="flex gap-2"><Select aria-label={`Day for ${entity.name}`} value={dayPlanId} onChange={(event) => setDayPlanId(event.target.value)} className="min-w-0 py-1.5 text-xs"><option value="">Add to a day…</option>{days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</Select><Button type="button" size="sm" disabled={pending || !dayPlanId} onClick={() => startTransition(async () => { try { const value = await addEntityToDay({ dayPlanId, entityId: entity.id, entityType: entity.entityType, title: entity.name }); setResult({ tripId: value.tripId }); } catch (error) { setResult({ error: error instanceof Error ? error.message : "Could not add this item." }); } })}>{pending ? "Adding…" : "Add"}</Button></div>{result?.tripId && <p className="mt-2 text-xs font-semibold text-success">Added. <Link href={`/trips/${result.tripId}?day=${dayPlanId}#day-canvas`} className="underline">View day</Link></p>}{result?.error && <p className="mt-2 text-xs text-danger">{result.error}</p>}</div>;
}
