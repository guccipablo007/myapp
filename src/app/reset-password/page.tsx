'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const sb = supabase();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);
  const [busy, setBusy] = useState(false);

  // Make sure we have a session (Supabase sets it from the email link)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) setErr('The reset link is invalid or expired. Try requesting a new one.');
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const { error } = await sb.auth.updateUser({ password });
    if (error) setErr(error.message);
    else setMsg('Password updated! You can now log in.');
    setBusy(false);
  }

  if (!ready) return <main className="p-6">Loading…</main>;

  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border border-zinc-800 rounded-lg p-5 bg-zinc-950/60">
        <h1 className="text-xl font-semibold mb-3">Set a new password</h1>
        <input
          type="password"
          className="w-full px-3 py-2 rounded border border-zinc-800 bg-zinc-900"
          placeholder="New password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
        {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
        {msg && <p className="text-sm text-emerald-400 mt-2">{msg}</p>}
        <button disabled={busy} className="mt-3 w-full px-3 py-2 rounded border border-yellow-500/40 bg-yellow-500/20 hover:bg-yellow-500/30">
          {busy ? 'Updating…' : 'Update password'}
        </button>
        <p className="text-sm text-zinc-400 mt-3">
          Return to <a href="/login" className="text-yellow-400">Login</a>
        </p>
      </form>
    </main>
  );
}
