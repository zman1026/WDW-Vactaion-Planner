import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { authConfiguration } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in | WDW Planner" };
export default function SignInPage() {
  if (!authConfiguration.isConfigured) return <div className="mx-auto max-w-lg rounded-card border border-warning/30 bg-warning/5 p-8 text-center shadow-card"><h1 className="text-2xl font-semibold text-primary">Sign-in is not configured</h1><p className="mt-3 text-muted">The site is online, but authentication is unavailable until the deployment administrator adds a secure session secret.</p><p className="mt-4 text-sm text-warning">Missing: {authConfiguration.missing.join(", ")}</p><Link href="/" className={buttonStyles({ className: "mt-6" })}>Return home</Link></div>;
  return <AuthForm googleEnabled={authConfiguration.googleConfigured} />;
}
