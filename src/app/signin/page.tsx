import type { Metadata } from "next";
import Link from "next/link";

import { authConfiguration } from "@/lib/auth";

import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in | WDW Planner" };

export default function SignInPage() {
  if (!authConfiguration.isConfigured) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-amber-950">Sign-in is not configured</h1>
        <p className="mt-3 text-amber-900">The site is online, but authentication is unavailable until the deployment administrator adds a secure session secret.</p>
        <p className="mt-4 text-sm text-amber-800">Missing: {authConfiguration.missing.join(", ")}</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-amber-900 px-5 py-2.5 font-semibold text-white">Return home</Link>
      </div>
    );
  }

  return <AuthForm />;
}
