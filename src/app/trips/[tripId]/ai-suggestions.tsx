"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import type { SuggestedItem } from "@/lib/ai-validation";
import { clock, entityTypeLabel } from "./day-planner-types";

type SuggestionResponse = {
  code?: string;
  message?: string;
  summary?: string;
  items?: SuggestedItem[];
};

export function AiSuggestions({ tripId, dayPlanId, disabled, onApply }: {
  tripId: string;
  dayPlanId: string;
  disabled: boolean;
  onApply: (items: SuggestedItem[]) => void;
}) {
  const [preferences, setPreferences] = useState("");
  const [items, setItems] = useState<SuggestedItem[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function suggest() {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setItems([]);
    setSummary("");
    try {
      const response = await fetch(`/api/trips/${tripId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayPlanId, preferences }),
      });
      const result = await response.json().catch(() => null) as SuggestionResponse | null;
      if (!response.ok) {
        setErrorCode(result?.code ?? null);
        throw new Error(result?.message ?? "A suggested day could not be made right now. Try again.");
      }
      if (!result?.items?.length) throw new Error("The suggestion came back empty. Try again.");
      setSummary(result.summary ?? "Here is a comfortable starting point for your day.");
      setItems(result.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A suggested day could not be made right now. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshDirectory() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/entities/sync", { method: "POST" });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? "The park directory could not be refreshed.");
      await suggest();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The park directory could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-3">
      <details className="group rounded-control border border-[rgb(var(--day-accent)/.18)] bg-white/50">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-primary">
          <span>Personalize it <span className="font-normal text-muted">(optional)</span></span>
          <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
        </summary>
        <div className="border-t border-[rgb(var(--day-accent)/.15)] p-3">
          <Textarea
            value={preferences}
            onChange={(event) => setPreferences(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="For example: easy morning, one character meal, avoid big drops"
            aria-label="Preferences for the suggested day"
          />
        </div>
      </details>

      <Button type="button" className="day-primary w-full" disabled={loading || refreshing || disabled} onClick={suggest}>
        {loading ? "Making your day…" : items.length ? "Make a different suggestion" : "Suggest a day with AI"}
      </Button>

      <div aria-live="polite">
        {error && (
          <div role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            <strong className="block">That didn’t work yet.</strong>
            <span>{error}</span>
            {errorCode === "DIRECTORY_EMPTY" && (
              <Button type="button" variant="secondary" className="mt-3 w-full" disabled={refreshing} onClick={refreshDirectory}>
                {refreshing ? "Refreshing the park guide…" : "Refresh park guide and try again"}
              </Button>
            )}
          </div>
        )}
        {items.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-primary">{summary}</p>
            <ol className="space-y-2">
              {items.map((item) => (
                <li key={item.entityId} className="day-accent-border rounded-control border bg-white/65 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-primary">{item.title}</strong>
                    <span className="shrink-0 font-semibold text-primary">{clock(item.startTime)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{entityTypeLabel(item.entityType)} · {item.reason}</p>
                </li>
              ))}
            </ol>
            <Button type="button" className="w-full" disabled={disabled} onClick={() => onApply(items)}>
              Add {items.length} {items.length === 1 ? "idea" : "ideas"} to this day
            </Button>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted">Suggestions are a starting point. Check current hours, reservations, and accessibility needs.</p>
    </div>
  );
}
