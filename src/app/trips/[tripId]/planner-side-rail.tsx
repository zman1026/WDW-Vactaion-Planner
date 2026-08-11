"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MustDoBoard, type MustDoSummary } from "./must-do-board";

export function PlannerSideRail({ tripId, mustDos, days, activeDayId, coachingNote }: { tripId: string; mustDos: MustDoSummary[]; days: Array<{ id: string; label: string }>; activeDayId: string; coachingNote?: string | null }) {
  const [open, setOpen] = useState(false); const unassigned = mustDos.filter((item) => !item.dayPlanItemId).length;
  return <div className="planner-tools"><div className="planner-tools__mobile mb-3 flex items-center gap-2 lg:hidden"><Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Must-dos{unassigned ? ` (${unassigned})` : ""}</Button>{coachingNote && <span className="min-w-0 truncate text-xs text-muted">{coachingNote}</span>}</div><Modal open={open} title="Trip must-dos" onClose={() => setOpen(false)}><MustDoBoard tripId={tripId} mustDos={mustDos} days={days} activeDayId={activeDayId} compact /></Modal><aside className="planner-tools__desktop hidden space-y-3 lg:block lg:sticky lg:top-[154px] lg:self-start"><MustDoBoard tripId={tripId} mustDos={mustDos} days={days} activeDayId={activeDayId} compact />{coachingNote && <div className="rounded-control border border-border bg-surface p-3 text-xs leading-relaxed text-muted"><strong className="text-primary">Day rhythm</strong><p className="mt-1">{coachingNote}</p></div>}</aside></div>;
}
