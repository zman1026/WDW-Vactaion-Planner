"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";

type Mode = "signin" | "register";
type FieldErrors = Record<string, string[] | undefined>;

export function AuthForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  function changeMode(next: Mode) { setMode(next); setMessage(null); setFieldErrors({}); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null); setFieldErrors({});
    const form = new FormData(event.currentTarget); const email = String(form.get("email") ?? "").trim().toLowerCase(); const password = String(form.get("password") ?? "");
    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: String(form.get("name") ?? ""), email, password, confirmPassword: String(form.get("confirmPassword") ?? "") }) });
        const result = await response.json() as { message?: string; fieldErrors?: FieldErrors };
        if (!response.ok) { setMessage(result.message ?? "We couldn't create your account."); setFieldErrors(result.fieldErrors ?? {}); return; }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result?.ok) { setMessage(mode === "register" ? "Your account was created, but sign-in failed. Try signing in." : "Email or password is incorrect."); if (mode === "register") setMode("signin"); return; }
      router.push("/trips"); router.refresh();
    } catch { setMessage("We couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }
  return <Card className="mx-auto max-w-md overflow-hidden"><div className="h-1.5 bg-gold" /><div className="p-7 sm:p-8"><p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gold">{mode === "signin" ? "Welcome back" : "Start planning"}</p><h1 className="mt-2 text-center text-3xl font-semibold text-primary">{mode === "signin" ? "Sign in to WDW Planner" : "Create your account"}</h1>
    {googleEnabled && <><Button type="button" variant="secondary" size="lg" className="mt-6 w-full" onClick={() => signIn("google", { callbackUrl: "/trips" })}>Continue with Google</Button><div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" /><span>or use email</span><span className="h-px flex-1 bg-border" /></div></>}
    <div className={`${googleEnabled ? "" : "mt-6"} grid grid-cols-2 rounded-control bg-parchment p-1`}><button type="button" onClick={() => changeMode("signin")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "signin" ? "bg-surface text-primary shadow-sm" : "text-muted"}`}>Sign in</button><button type="button" onClick={() => changeMode("register")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-surface text-primary shadow-sm" : "text-muted"}`}>Create account</button></div>
    <form onSubmit={submit} className="mt-6 space-y-4">{message && <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{message}</p>}{mode === "register" && <AuthField label="Name" name="name" type="text" autoComplete="name" error={fieldErrors.name?.[0]} />}<AuthField label="Email" name="email" type="email" autoComplete="email" error={fieldErrors.email?.[0]} /><AuthField label="Password" name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} error={fieldErrors.password?.[0]} hint={mode === "register" ? "Use 12–72 characters. Password managers are welcome." : undefined} />{mode === "register" && <AuthField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={fieldErrors.confirmPassword?.[0]} />}<Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button></form><p className="mt-5 text-center text-xs text-muted">Your password is securely hashed and never stored in readable form.</p></div></Card>;
}

function AuthField({ label, error, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) { return <label className="block text-sm font-semibold text-ink">{label}<Input required {...props} className="mt-1.5 py-3" aria-invalid={Boolean(error)} />{error ? <span className="mt-1 block text-xs font-normal text-danger">{error}</span> : hint ? <span className="mt-1 block text-xs font-normal text-muted">{hint}</span> : null}</label>; }
