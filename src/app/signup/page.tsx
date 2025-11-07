'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/auth-helpers';

export default function SignupPage() {
  const sb = supabase();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }

    // With email confirmations OFF, user is available now:
    const user = data.user;
    if (user) {
      await ensureUserProfile(user.id, fullName);
      router.push('/'); // go home (dashboard)
    } else {
      // If confirmations were ON, you'd show "check your email".
      setErr('Check your email to confirm your account.');
    }
    setBusy(false);
  }

  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border border-zinc-800 rounded-lg p-5 bg-zinc-950/60">
        <h1 className="text-xl font-semibold mb-3">Create your account</h1>
        <div className="space-y-2">
          <input className="w-full px-3 py-2 rounded border border-zinc-800 bg-zinc-900"
                 placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} />
          <input className="w-full px-3 py-2 rounded border border-zinc-800 bg-zinc-900"
                 placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 rounded border border-zinc-800 bg-zinc-900"
                 placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button disabled={busy}
                  className="w-full px-3 py-2 rounded border border-yellow-500/40 bg-yellow-500/20 hover:bg-yellow-500/30">
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </div>
        <p className="text-sm text-zinc-400 mt-3">
          Already have an account? <a className="text-yellow-400" href="/login">Sign in</a>
        </p>
      </form>
    </main>
  );
}
