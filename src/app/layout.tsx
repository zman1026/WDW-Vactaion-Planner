import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authConfiguration, authOptions } from "@/lib/auth";
import { AppNav } from "./app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "WDW Planner – Family Walt Disney World Vacation Planner",
  description: "Plan every day of your Walt Disney World adventure: parks, attractions, restaurants, shows, budgets, and timelines.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = authConfiguration.isConfigured ? await getServerSession(authOptions) : null;
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 shadow-[0_4px_24px_rgba(35,29,20,0.05)] backdrop-blur">
          <AppNav signedIn={Boolean(session)} userName={session?.user?.name ?? session?.user?.email} authConfigured={authConfiguration.isConfigured} />
        </header>
        <div role="main" className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</div>
        <footer className="mt-16 border-t border-border bg-surface/70">
          <div className="mx-auto max-w-7xl px-4 py-7 text-center text-sm text-muted sm:px-6 lg:px-8">
            Not affiliated with The Walt Disney Company. Data powered by{" "}<a href="https://themeparks.wiki" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline decoration-gold/70 underline-offset-4">ThemeParks.wiki</a>. Always verify times and availability in the official My Disney Experience app.
          </div>
        </footer>
      </body>
    </html>
  );
}
