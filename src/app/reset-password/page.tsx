'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const sb = supabase();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    // User must arrive from the magic link (already authenticated on this tab)
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setErr('This page requires a valid password-reset link. Open the link from your email.');
      }
      setReady(true);
    });
  }, [sb]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (pwd.length < 6) return setErr('Password must be at least 6 characters.');
    if (pwd !== pwd2) return setErr('Passwords do not match.');
    const { error } = await sb.auth.updateUser({ password: pwd });
    if (error) return setErr(error.message);
    setMsg('Password updated! Redirecting to login…');
    setTimeout(() => router.push('/login'), 1200);
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Enter and confirm your new password.
      </p>

      {!ready ? (
        <p className="text-sm text-zinc-400">Checking reset session…</p>
      ) : err ? (
        <p className="text-sm text-red-400">{err}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-950/60"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-950/60"
            required
          />
          <button className="w-full px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10">
            Save New Password
          </button>
          {msg && <p className="text-green-400 text-sm">{msg}</p>}
          {err && <p className="text-red-400 text-sm">{err}</p>}
        </form>
      )}
    </main>
  );
}
