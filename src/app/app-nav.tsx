"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { buttonStyles } from "@/components/ui/button";

type AppNavProps = { signedIn: boolean; userName?: string | null; authConfigured: boolean };

const links = [
  { href: "/", label: "Home" },
  { href: "/trips", label: "My trips" },
  { href: "/explore", label: "Explore" },
];

export function AppNav({ signedIn, userName, authConfigured }: AppNavProps) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <Link href="/" className="group flex items-center gap-3" aria-label="WDW Planner home">
        <span className="grid size-9 place-items-center rounded-full border border-gold/40 bg-primary text-gold shadow-sm" aria-hidden="true">
          <svg viewBox="0 0 32 32" className="size-5 fill-current"><path d="M16 3l2.2 7.2L25 7l-3.3 6.7L29 16l-7.3 2.3L25 25l-6.8-3.2L16 29l-2.2-7.2L7 25l3.3-6.7L3 16l7.3-2.3L7 7l6.8 3.2L16 3Z" /></svg>
        </span>
        <span><span className="block font-display text-xl font-semibold leading-none text-primary">WDW Planner</span><span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted sm:block">Make the magic manageable</span></span>
      </Link>
      <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-border/70 pt-2 text-sm sm:order-2 sm:w-auto sm:border-0 sm:pt-0" aria-label="Primary navigation">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-2 font-medium transition ${active ? "bg-primary text-white" : "text-muted hover:bg-sand/35 hover:text-primary"}`}>{link.label}</Link>;
        })}
      </nav>
      <div className="order-2 flex items-center gap-2 sm:order-3">
        {signedIn ? <><span className="hidden max-w-32 truncate text-xs text-muted lg:block">{userName}</span><button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={buttonStyles({ variant: "ghost", size: "sm" })}>Sign out</button></> : authConfigured ? <Link href="/signin" className={buttonStyles({ variant: "secondary", size: "sm" })}>Sign in</Link> : <span className="text-xs text-muted" title="Authentication is not configured">Guest mode</span>}
      </div>
    </div>
  );
}
