import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "./auth-controls";
import "./globals.css";

export const metadata: Metadata = {
  title: "WDW Planner – Family Walt Disney World Vacation Planner",
  description:
    "Plan every day of your Walt Disney World adventure: parks, attractions, restaurants, shows, budgets, and timelines.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="disney-gradient text-white shadow-md">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight">✨ WDW Planner</span>
              <span className="hidden sm:inline text-sm opacity-90">
                Family Vacation Planning Center
              </span>
            </div>
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/trips" className="hover:underline">
                My Trips
              </Link>
              <Link href="/explore" className="hover:underline">
                Explore Parks
              </Link>
              {session ? <SignOutButton /> : <Link href="/signin" className="hover:underline">Sign in</Link>}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t bg-white mt-16">
          <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500">
            Not affiliated with The Walt Disney Company. Data powered by{" "}
            <a
              href="https://themeparks.wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              ThemeParks.wiki
            </a>
            . Always verify times & availability on the official My Disney Experience app.
          </div>
        </footer>
      </body>
    </html>
  );
}
