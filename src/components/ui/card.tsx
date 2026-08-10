import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-card border border-border bg-surface shadow-card", className)} {...props} />;
}

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-control border border-border bg-surface", className)} {...props} />;
}
