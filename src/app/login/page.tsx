"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase as supabaseMaybe } from "@/lib/supabase";

// Works whether your supabase export is a factory or a client instance
function sb() {
  const s: any = typeof supabaseMaybe === "function" ? (supabaseMaybe as any)() : supabaseMaybe;
  return s;
}

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = sb();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }
    router.replace(redirectTo);
  }

  async function loginWithGoogle() {
    setErr(null);
    setBusy(true);
    const supabase = sb();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Welcome back! Use your email and password to continue.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              required
              type="email"
              className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              required
              type="password"
              className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </div>

          {err ? (
            <div className="text-sm text-red-400 border border-red-900/50 bg-red-950/20 rounded-lg px-3 py-2">
              {err}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-amber-500/90 hover:bg-amber-500 text-black font-medium py-2 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-4 text-center text-xs text-neutral-500">or</div>

        <button
          onClick={loginWithGoogle}
          disabled={busy}
          className="w-full rounded-lg border border-neutral-700 hover:bg-neutral-800 py-2 text-sm disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-amber-400 hover:underline">
            Forgot password?
          </Link>
          <Link href="/signup" className="text-neutral-300 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
