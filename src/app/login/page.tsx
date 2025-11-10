"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase as supabaseMaybe } from "@/lib/supabase";

function sb() {
  // @ts-expect-error tolerate factory/client
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const s = sb();
      const { error } = await s.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(redirectTo);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#0B0E16] text-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 p-6">
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Use your CAMSU account to continue.
        </p>
        <form onSubmit={signIn} className="space-y-3">
          <input
            type="email"
            className="w-full h-10 rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 text-sm outline-none focus:border-neutral-600"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full h-10 rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 text-sm outline-none focus:border-neutral-600"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err ? <div className="text-sm text-red-400">{err}</div> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-10 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-black font-medium disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
