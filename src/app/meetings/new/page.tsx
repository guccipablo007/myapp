'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewMeetingPage() {
  const sb = supabase();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setErr(null);
    const { error } = await sb
      .from('meetings')
      .insert([{ title: title || 'Untitled meeting', date, notes }])
      .select('id')
      .single();
    if (error) setErr(error.message);
    else router.push('/meetings');
    setSaving(false);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">New Meeting</h1>

      <div className="max-w-2xl space-y-4">
        <label className="block">
          <div className="text-sm opacity-70 mb-1">Title</div>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2 rounded border border-zinc-700 bg-black" />
        </label>

        <label className="block">
          <div className="text-sm opacity-70 mb-1">Date</div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-3 py-2 rounded border border-zinc-700 bg-black" />
        </label>

        <label className="block">
          <div className="text-sm opacity-70 mb-1">Notes (optional)</div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={8} className="w-full px-3 py-2 rounded border border-zinc-700 bg-black" />
        </label>

        {err && <div className="text-sm text-rose-400">Error: {err}</div>}

        <div className="flex gap-3">
          <a href="/meetings" className="px-3 py-2 rounded border border-zinc-700 hover:bg-zinc-800">Cancel</a>
          <button onClick={save} disabled={saving} className="px-3 py-2 rounded border border-yellow-600 text-yellow-400 hover:bg-yellow-500/10">
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
