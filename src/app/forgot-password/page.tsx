'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const sb = supabase();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [msg, setMsg] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setMsg('');
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatus('sent');
      setMsg('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      setStatus('error');
      setMsg(err.message ?? 'Something went wrong.');
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
      <p className="text-sm text-zinc-400 mb-6">Enter your email to receive a reset link.</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-950/60"
        />
        <button
          disabled={status === 'sending'}
          className="w-full px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10"
        >
          {status === 'sending' ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      {!!msg && (
        <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {msg}
        </p>
      )}
    </main>
  );
}
