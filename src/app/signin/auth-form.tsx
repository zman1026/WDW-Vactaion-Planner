"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "signin" | "register";
type FieldErrors = Record<string, string[] | undefined>;

const inputClasses = "mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function changeMode(nextMode: Mode) {
    setMode(nextMode); setMessage(null); setFieldErrors({});
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null); setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
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

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />
      <div className="p-7 sm:p-8">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">{mode === "signin" ? "Welcome back" : "Start planning"}</p>
        <h1 className="mt-2 text-center text-3xl font-bold">{mode === "signin" ? "Sign in to WDW Planner" : "Create your account"}</h1>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => changeMode("signin")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Sign in</button>
          <button type="button" onClick={() => changeMode("register")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Create account</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p>}
          {mode === "register" && <Field label="Name" name="name" type="text" autoComplete="name" error={fieldErrors.name?.[0]} />}
          <Field label="Email" name="email" type="email" autoComplete="email" error={fieldErrors.email?.[0]} />
          <Field label="Password" name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} error={fieldErrors.password?.[0]} hint={mode === "register" ? "Use 12–72 characters. Password managers are welcome." : undefined} />
          {mode === "register" && <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={fieldErrors.confirmPassword?.[0]} />}
          <button type="submit" disabled={busy} className="w-full rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">Your password is securely hashed and never stored in readable form.</p>
      </div>
    </div>
  );
}

function Field({ label, error, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input required {...props} className={inputClasses} aria-invalid={Boolean(error)} />{error ? <span className="mt-1 block text-xs font-normal text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span> : null}</label>;
}
