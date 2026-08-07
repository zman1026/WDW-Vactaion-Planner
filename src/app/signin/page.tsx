import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in | WDW Planner" };

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Welcome back</p>
      <h1 className="mt-2 text-3xl font-bold">Sign in to WDW Planner</h1>
      <p className="mt-3 text-slate-600">Keep your family’s trips private and available on every device.</p>
      <Link href="/api/auth/signin/github" className="mt-7 inline-flex w-full justify-center rounded-full bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700">Continue with GitHub</Link>
      <p className="mt-5 text-xs text-slate-500">Your profile email is used only to associate your saved trips.</p>
    </div>
  );
}
