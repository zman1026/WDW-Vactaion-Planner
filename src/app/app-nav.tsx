"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { buttonStyles } from "@/components/ui/button";

type AppNavProps = { signedIn: boolean; userName?: string | null; authConfigured: boolean };

const links = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/trips", label: "My trips", icon: TripsIcon },
  { href: "/explore", label: "Park guide", icon: ExploreIcon },
];

export function AppNav({ signedIn, userName, authConfigured }: AppNavProps) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <Link href="/" className="group flex items-center gap-3" aria-label="WDW Planner home">
        <span className="grid size-9 place-items-center rounded-full border border-gold/40 bg-primary text-gold shadow-sm" aria-hidden="true">
          <svg viewBox="0 0 32 32" className="size-5 fill-current"><path d="M16 3l2.2 7.2L25 7l-3.3 6.7L29 16l-7.3 2.3L25 25l-6.8-3.2L16 29l-2.2-7.2L7 25l3.3-6.7L3 16l7.3-2.3L7 7l6.8 3.2L16 3Z" /></svg>
        </span>
        <span><span className="block font-display text-xl font-semibold leading-none text-primary">WDW Planner</span><span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted sm:block">Make the magic manageable</span></span>
      </Link>
      <nav className="hidden items-center gap-1 text-sm sm:flex" aria-label="Primary navigation">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-2 font-medium transition ${active ? "bg-primary text-white" : "text-muted hover:bg-sand/35 hover:text-primary"}`}>{link.label}</Link>;
        })}
      </nav>
      <div className="order-2 flex items-center gap-2 sm:order-3">
        {signedIn ? <><span className="hidden max-w-32 truncate text-xs text-muted lg:block">{userName}</span><button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={buttonStyles({ variant: "ghost", size: "sm" })}>Sign out</button></> : authConfigured ? <Link href="/signin" className={buttonStyles({ variant: "secondary", size: "sm" })}>Sign in</Link> : <span className="text-xs text-muted" title="Authentication is not configured">Guest mode</span>}
      </div>
      <nav className="mobile-dock fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 rounded-2xl border border-white/20 bg-primary/95 p-1.5 text-white shadow-[0_16px_50px_rgba(11,31,58,.35)] backdrop-blur sm:hidden" aria-label="Mobile navigation">
        {links.map((link) => { const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href); const Icon = link.icon; return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-bold transition ${active ? "bg-white text-primary shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon /><span>{link.label}</span></Link>; })}
      </nav>
    </div>
  );
}

const navIconClass = "size-4 fill-none stroke-current stroke-[1.8]";
function HomeIcon() { return <svg viewBox="0 0 24 24" className={navIconClass} aria-hidden="true"><path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4v-9Z" /></svg>; }
function TripsIcon() { return <svg viewBox="0 0 24 24" className={navIconClass} aria-hidden="true"><path d="M5 7h14v13H5V7Zm3 0V4h8v3M5 12h14" /></svg>; }
function ExploreIcon() { return <svg viewBox="0 0 24 24" className={navIconClass} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>; }
