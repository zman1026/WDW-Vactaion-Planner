"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";

export function Modal({ open, title, onClose, children, size = "wide" }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; size?: "compact" | "wide" }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} className={clsx("max-h-[94dvh] w-full overflow-y-auto rounded-t-card border border-border bg-surface p-5 text-ink shadow-lift outline-none sm:rounded-card sm:p-6", size === "compact" ? "sm:max-w-lg" : "sm:max-w-2xl")}><div className="mb-5 flex items-center justify-between gap-4"><h2 id="modal-title" className="text-2xl font-semibold text-primary">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-parchment hover:text-primary">×</button></div>{children}</div></div>;
}
