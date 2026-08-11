import Link from "next/link";
import { clsx } from "clsx";

import { buttonStyles } from "./button";
import { Card } from "./card";

export function EmptyState({ title, description, actionLabel, href, icon, className }: { title: string; description: string; actionLabel?: string; href?: string; icon?: React.ReactNode; className?: string }) {
  return <Card className={clsx("border-dashed p-8 text-center sm:p-12", className)}><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand/35 text-primary">{icon ?? <span className="font-display text-2xl">W</span>}</div><h2 className="mt-5 text-2xl font-semibold text-primary">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>{actionLabel && href && <Link href={href} className={buttonStyles({ className: "mt-6" })}>{actionLabel}</Link>}</Card>;
}
