import Link from "next/link";
import { clsx } from "clsx";

import { buttonStyles } from "./button";
import { Card } from "./card";

export function EmptyState({ title, description, actionLabel, href, icon, className, compact = false }: { title: string; description: string; actionLabel?: string; href?: string; icon?: React.ReactNode; className?: string; compact?: boolean }) {
  return <Card className={clsx("border-dashed text-center", compact ? "p-5 sm:p-6" : "p-8 sm:p-12", className)}><div className={clsx("mx-auto flex items-center justify-center rounded-full bg-sand/35 text-primary", compact ? "h-10 w-10" : "h-14 w-14")}>{icon ?? <span className="font-display text-2xl">W</span>}</div><h2 className={clsx("font-semibold text-primary", compact ? "mt-3 text-xl" : "mt-5 text-2xl")}>{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>{actionLabel && href && <Link href={href} className={buttonStyles({ className: compact ? "mt-4" : "mt-6" })}>{actionLabel}</Link>}</Card>;
}
