'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const sb = supabase();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) setErr(error.message);
    else setMsg('Check your email for a password reset link.');
    setBusy(false);
  }

  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border border-zinc-800 rounded-lg p-5 bg-zinc-950/60">
        <h1 className="text-xl font-semibold mb-3">Forgot password</h1>
        <input
          type="email"
          className="w-full px-3 py-2 rounded border border-zinc-800 bg-zinc-900"
          placeholder="Your account email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
        {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
        {msg && <p className="text-sm text-emerald-400 mt-2">{msg}</p>}
        <button disabled={busy} className="mt-3 w-full px-3 py-2 rounded border border-yellow-500/40 bg-yellow-500/20 hover:bg-yellow-500/30">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="text-sm text-zinc-400 mt-3">
          Remembered? <a href="/login" className="text-yellow-400">Back to login</a>
        </p>
      </form>
    </main>
  );
}
