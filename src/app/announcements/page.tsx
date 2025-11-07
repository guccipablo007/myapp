'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Ann = {
  id: number;
  title: string;
  body: string | null;
  created_at: string;
};

export default function AnnouncementsPage() {
  const sb = supabase();

  const [list, setList] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await sb
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setList((data ?? []) as Ann[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createAnn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload = { title: title.trim(), body: body.trim() || null };
    if (!payload.title) return setErr('Title is required.');

    const { error } = await sb.from('announcements').insert(payload);
    if (error) return setErr(error.message);

    setOpen(false);
    setTitle('');
    setBody('');
    load();
  }

  async function removeAnn(id: number) {
    if (!confirm('Delete this announcement?')) return;
    const { error } = await sb.from('announcements').delete().eq('id', id);
    if (error) return setErr(error.message);
    load();
  }

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-zinc-400">Post and review community updates.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30"
        >
          + New Announcement
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-400">Error: {err}</p>}

      <div className="mt-4 space-y-3">
        {loading && <div className="text-sm text-zinc-400">Loading…</div>}
        {!loading && list.length === 0 && (
          <div className="text-sm text-zinc-400 border border-zinc-800 rounded p-3">
            No announcements yet.
          </div>
        )}
        {list.map((a) => (
          <article key={a.id} className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{a.title}</h2>
              <div className="text-xs text-zinc-500">{new Date(a.created_at).toLocaleString()}</div>
            </div>
            <p className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">{a.body || '—'}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => removeAnn(a.id)}
                className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="font-semibold">New Announcement</div>
              <button onClick={() => setOpen(false)} className="px-2 py-1 rounded border border-zinc-700">Close</button>
            </div>
            <form onSubmit={createAnn} className="p-4 grid gap-3">
              <input
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                placeholder="Title*"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2 min-h-28"
                placeholder="Body (optional)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded border border-zinc-700">
                  Cancel
                </button>
                <button className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30">
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
