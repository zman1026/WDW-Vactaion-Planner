"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

export function Modal({ open, title, onClose, children, size = "wide", theme }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; size?: "compact" | "wide"; theme?: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
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
  }, [mounted, open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={clsx(
          "max-h-[94dvh] w-full overscroll-contain overflow-y-auto rounded-t-card border border-border bg-surface text-ink shadow-lift outline-none sm:rounded-card",
          size === "compact" ? "sm:max-w-lg" : "sm:max-w-2xl",
        )}
      >
        <div className={theme ? "day-theme min-h-full" : "min-h-full"} data-theme={theme} style={theme ? { backgroundColor: "transparent" } : undefined}>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/70 bg-surface/95 px-5 py-3 backdrop-blur sm:px-6">
            <h2 id="modal-title" className="text-2xl font-semibold text-primary">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-parchment hover:text-primary">×</button>
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
