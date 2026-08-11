"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { assignMustDo, removeMustDo, saveMustDo } from "./actions";

type MustDo = { id: string; title: string; notes: string | null; priority: number; dayPlanItemId: string | null };

export function MustDoBoard({ tripId, mustDos, days }: { tripId: string; mustDos: MustDo[]; days: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const unassigned = mustDos.filter((item) => !item.dayPlanItemId);

  function run(action: () => Promise<void>, reset?: () => void) {
    setError(null);
    startTransition(async () => { try { await action(); reset?.(); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "That change could not be saved."); } });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(() => saveMustDo({ tripId, title: String(data.get("title") ?? ""), entityId: "", entityType: null, notes: String(data.get("notes") ?? ""), priority: Number(data.get("priority") ?? 2) }), () => form.reset());
  }

  return <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6" aria-labelledby="must-do-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Trip priorities</p><h2 id="must-do-title" className="mt-1 text-2xl font-semibold text-primary">Must-do board</h2><p className="mt-1 text-sm text-muted">Keep the family’s top wishes visible, then place them onto a day.</p></div><Badge className={unassigned.length ? "border-warning/25 bg-warning/5 text-warning" : "border-success/25 bg-success/5 text-success"}>{unassigned.length} unassigned</Badge></div>
    {mustDos.length > 0 && <ul className="mt-5 space-y-2">{mustDos.map((item) => <li key={item.id} className="flex flex-col gap-3 rounded-control border border-border bg-parchment/45 p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-primary">{item.title}</p><span className="text-[10px] font-bold uppercase tracking-wider text-muted">{priorityLabel(item.priority)}</span>{item.dayPlanItemId && <Badge className="border-success/25 bg-success/5 text-success">On the itinerary</Badge>}</div>{item.notes && <p className="mt-1 text-xs text-muted">{item.notes}</p>}</div>{!item.dayPlanItemId && <AssignMustDo disabled={pending} days={days} onAssign={(dayPlanId) => run(() => assignMustDo({ mustDoId: item.id, dayPlanId }))} />}<button type="button" disabled={pending} onClick={() => { if (window.confirm(`Remove ${item.title} from the must-do board?`)) run(() => removeMustDo({ mustDoId: item.id })); }} className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-40">Remove</button></li>)}</ul>}
    <details className="mt-4 rounded-control border border-dashed border-border p-4"><summary className="cursor-pointer text-sm font-semibold text-primary">Add a must-do</summary><form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="What matters most?"><Input name="title" required maxLength={150} placeholder="Dinner together, favorite attraction…" /></Field><Field label="Priority"><Select name="priority" defaultValue="2"><option value="1">High</option><option value="2">Medium</option><option value="3">Nice to have</option></Select></Field><div className="sm:col-span-2"><Field label="Notes" optional><Textarea name="notes" rows={2} maxLength={500} /></Field></div><Button type="submit" disabled={pending} size="sm" className="sm:justify-self-start">{pending ? "Saving…" : "Add must-do"}</Button></form></details>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </section>;
}

function AssignMustDo({ days, disabled, onAssign }: { days: Array<{ id: string; label: string }>; disabled: boolean; onAssign: (dayPlanId: string) => void }) {
  const [day, setDay] = useState("");
  return <div className="flex min-w-0 gap-2"><Select aria-label="Assign must-do to day" value={day} onChange={(event) => setDay(event.target.value)} disabled={disabled} className="min-w-40 py-1.5"><option value="">Choose day…</option>{days.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select><Button type="button" size="sm" variant="secondary" disabled={disabled || !day} onClick={() => onAssign(day)}>Place</Button></div>;
}

function priorityLabel(priority: number) { return priority === 1 ? "High priority" : priority === 3 ? "Nice to have" : "Important"; }
