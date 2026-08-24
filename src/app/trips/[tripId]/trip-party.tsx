"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { removeCompanion, saveCompanion, type MutationResult } from "./actions";

export type CompanionSummary = { id: string; name: string; email: string | null; role: string; rsvp: string };
const fieldClass = "mt-1.5 w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15";

export function TripParty({ tripId, companions, triggerLabel = "Party", triggerClassName }: { tripId: string; companions: CompanionSummary[]; triggerLabel?: string; triggerClassName?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ error?: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const going = companions.filter((person) => person.rsvp === "GOING").length;

  function run(action: () => Promise<MutationResult>, reset?: HTMLFormElement) {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await action();
        setNotice({ error: !result.success, text: result.message ?? "Saved." });
        if (result.success) { reset?.reset(); router.refresh(); }
      } catch { setNotice({ error: true, text: "That change could not be saved. Please try again." }); }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    run(() => saveCompanion({ tripId, name: form.get("name"), email: form.get("email"), role: form.get("role"), rsvp: form.get("rsvp") }), formElement);
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${tripId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <><Button type="button" variant="secondary" size="sm" className={triggerClassName ?? "border-white/15 bg-white/10 text-white hover:bg-white/20"} onClick={() => setOpen(true)}><PeopleIcon />{triggerLabel}{companions.length ? ` · ${companions.length + 1}` : ""}</Button><Modal open={open} title="Your travel party" onClose={() => setOpen(false)}><div className="space-y-5">
    <section className="rounded-card border border-gold/20 bg-sand/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Plan together</p><h3 className="mt-1 font-display text-xl font-semibold text-primary">One shared vacation story</h3><p className="mt-2 text-sm leading-relaxed text-muted">Keep track of who is going, who can help plan, and who still needs the itinerary link. The shared itinerary remains view-only.</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" onClick={copyShareLink}>{copied ? "Link copied" : "Copy itinerary link"}</Button><Link href={`/share/${tripId}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>Preview shared trip</Link></div></section>
    {notice && <p role="status" className={`rounded-control p-3 text-sm font-semibold ${notice.error ? "bg-danger/5 text-danger" : "bg-success/5 text-success"}`}>{notice.text}</p>}
    <section aria-labelledby="party-list-title"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Guest list</p><h3 id="party-list-title" className="mt-1 font-display text-xl font-semibold text-primary">{going + 1} confirmed traveler{going ? "s" : ""}</h3></div><Badge>{companions.length + 1} total</Badge></div><div className="mt-3 overflow-hidden rounded-card border border-border bg-surface"><div className="flex items-center gap-3 p-3"><Avatar name="You" /><div className="min-w-0 flex-1"><p className="font-semibold text-primary">You</p><p className="text-xs text-muted">Trip owner · Co-planner</p></div><Badge tone="success">Going</Badge></div>{companions.map((person) => <div key={person.id} className="flex items-center gap-3 border-t border-border p-3"><Avatar name={person.name} /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-primary">{person.name}</p><p className="truncate text-xs text-muted">{roleLabel(person.role)}{person.email ? ` · ${person.email}` : ""}</p></div><Badge tone={person.rsvp === "GOING" ? "success" : "warning"}>{rsvpLabel(person.rsvp)}</Badge><button type="button" aria-label={`Remove ${person.name}`} disabled={pending} onClick={() => { if (window.confirm(`Remove ${person.name} from the travel party?`)) run(() => removeCompanion({ companionId: person.id })); }} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-danger/5 hover:text-danger">×</button></div>)}</div></section>
    <form onSubmit={submit} className="space-y-3 border-t border-border pt-5"><div><h3 className="font-display text-xl font-semibold text-primary">Add someone</h3><p className="mt-1 text-xs text-muted">Email is kept with the trip for reference; no message is sent automatically.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Name<input name="name" required maxLength={100} className={fieldClass} /></label><label className="text-sm font-semibold">Email, optional<input name="email" type="email" maxLength={200} className={fieldClass} /></label><label className="text-sm font-semibold">Role<select name="role" defaultValue="TRAVELER" className={fieldClass}><option value="CO_PLANNER">Co-planner</option><option value="TRAVELER">Traveler</option><option value="CHILD">Child</option></select></label><label className="text-sm font-semibold">Status<select name="rsvp" defaultValue="GOING" className={fieldClass}><option value="GOING">Going</option><option value="INVITED">Invited</option><option value="MAYBE">Maybe</option></select></label></div><Button disabled={pending} size="sm">{pending ? "Saving…" : "Add to party"}</Button></form>
  </div></Modal></>;
}

function Avatar({ name }: { name: string }) { return <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/20 bg-primary font-display font-semibold text-sand">{name.trim().slice(0, 1).toUpperCase()}</span>; }
function roleLabel(value: string) { return value === "CO_PLANNER" ? "Co-planner" : value === "CHILD" ? "Child" : "Traveler"; }
function rsvpLabel(value: string) { return value === "GOING" ? "Going" : value === "MAYBE" ? "Maybe" : "Invited"; }
function PeopleIcon() { return <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20v-2c0-3 2.7-5 6-5s6 2 6 5v2m0-5c3 0 5 1.7 5 4v1" /></svg>; }
