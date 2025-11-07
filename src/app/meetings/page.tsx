'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Meeting = {
  id: number;
  date: string;
  title: string;
  recorded_by?: string | null;
  minutes?: string | null;
  attachments?: any[] | null;
};

export default function MeetingsPage() {
  const sb = supabase();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [list, setList] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState({ date: '', title: '', minutes: '' });

  async function load() {
    setLoading(true);
    setErr(null);
    let q = sb.from('meetings').select('*').order('date', { ascending: false });
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    const { data, error } = await q;
    if (error) setErr(error.message);
    setList((data ?? []) as Meeting[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function openCreate() {
    setEditing(null);
    setForm({ date: '', title: '', minutes: '' });
    setOpen(true);
  }

  function openEdit(m: Meeting) {
    setEditing(m);
    setForm({
      date: m.date || '',
      title: m.title || '',
      minutes: m.minutes || '',
    });
    setOpen(true);
  }

  async function saveMeeting(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload = {
      date: form.date,
      title: form.title.trim(),
      minutes: form.minutes.trim() || null,
    };
    if (!payload.date || !payload.title) return setErr('Date and title are required.');

    if (editing) {
      const { error } = await sb.from('meetings').update(payload).eq('id', editing.id);
      if (error) return setErr(error.message);
    } else {
      const { data: userData } = await sb.auth.getUser();
      const { error } = await sb.from('meetings').insert({ ...payload, recorded_by: userData.user?.id ?? null });
      if (error) return setErr(error.message);
    }
    setOpen(false);
    load();
  }

  async function removeMeeting(id: number) {
    if (!confirm('Delete this meeting?')) return;
    const { error } = await sb.from('meetings').delete().eq('id', id);
    if (error) return setErr(error.message);
    load();
  }

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings & Minutes</h1>
          <p className="text-sm text-zinc-400">Create meetings, record minutes, and track attendance.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30"
        >
          + New Meeting
        </button>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="date"
          className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span className="text-sm text-zinc-500">to</span>
        <input
          type="date"
          className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button onClick={() => { setFrom(''); setTo(''); }} className="px-3 py-2 rounded border border-zinc-700">
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Date</th><th>Title</th><th>Recorded By</th><th>Attachments</th><th>Attendance</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-3">Loading…</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={6} className="px-3 py-3">No meetings</td></tr>}

            {list.map((m) => (
              <tr key={m.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                <td className="px-3 py-2">{m.date}</td>
                <td className="px-3 py-2">{m.title}</td>
                <td className="px-3 py-2">{m.recorded_by ? 'User' : '—'}</td>
                <td className="px-3 py-2">{Array.isArray(m.attachments) ? `${m.attachments.length} file(s)` : '0'}</td>
                <td className="px-3 py-2">
                  <a className="underline hover:text-yellow-400" href={`/attendance?meeting=${m.id}`}>Open</a>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)} className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10">Edit</button>
                    <button onClick={() => removeMeeting(m.id)} className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: create/edit */}
      {open && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4">
          <div className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="font-semibold">{editing ? 'Edit Meeting' : 'New Meeting'}</div>
              <button onClick={() => setOpen(false)} className="px-2 py-1 rounded border border-zinc-700">Close</button>
            </div>

            <form onSubmit={saveMeeting} className="p-4 grid gap-3">
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  type="date"
                  className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
                <input
                  className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                  placeholder="Meeting title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <textarea
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2 min-h-32"
                placeholder="Minutes / Notes (optional)"
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              />

              {err && <p className="text-sm text-red-400">Error: {err}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded border border-zinc-700">Cancel</button>
                <button className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30">{editing ? 'Save Changes' : 'Create Meeting'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
