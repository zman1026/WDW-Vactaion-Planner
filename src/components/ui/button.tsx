import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25",
    variant === "primary" && "bg-primary text-white shadow-sm hover:bg-primary/90 hover:shadow-md",
    variant === "secondary" && "border border-border bg-surface text-primary hover:border-gold/60 hover:bg-sand/20",
    variant === "ghost" && "text-primary hover:bg-primary/5",
    variant === "danger" && "border border-danger/25 bg-surface text-danger hover:bg-danger/5",
    size === "sm" && "min-h-11 px-3 py-2 text-sm",
    size === "md" && "min-h-11 px-5 py-2.5 text-sm",
    size === "lg" && "min-h-12 px-6 py-3 text-base",
    className,
  );
}

export function Button({ variant, size, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />;
}
