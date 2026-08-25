import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const controlStyles = "min-h-11 w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted/60 focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:bg-parchment disabled:text-muted";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={clsx(controlStyles, className)} {...props} />; }
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={clsx(controlStyles, className)} {...props} />; }
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={clsx(controlStyles, "resize-y", className)} {...props} />; }

export function Field({ label, error, hint, optional, children }: { label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-ink"><span>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</span><span className="mt-1.5 block">{children}</span>{error ? <span className="mt-1.5 block text-xs font-normal text-danger">{error}</span> : hint ? <span className="mt-1.5 block text-xs font-normal text-muted">{hint}</span> : null}</label>;
}
