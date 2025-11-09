'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase as supabaseFactory } from '@/lib/supabase';

type Ann = {
  id: number;
  title: string | null;
  body: string | null;
  created_at: string | null;
};

export default function AnnouncementsPage() {
  const sb = useMemo(() => supabaseFactory(), []);
  const [rows, setRows] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [role, setRole] = useState<'guest'|'member'|'secretary'|'sysadmin'>('guest');
  const canWrite = role === 'sysadmin' || role === 'secretary';

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Ann | null>(null);

  // --- load role
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: sess } = await sb.auth.getSession();
        const uid = sess?.session?.user?.id;
        if (!uid) { if (alive) setRole('guest'); return; }
        const { data } = await sb.from('user_profiles').select('role').eq('user_id', uid).maybeSingle();
        const r = (data?.role as any) ?? 'member';
        if (alive) setRole(r);
      } catch {
        if (alive) setRole('guest');
      }
    })();
    return () => { alive = false; };
  }, [sb]);

  // --- load announcements
  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await sb
        .from('announcements')
        .select('id,title,body,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as Ann[]);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load announcements');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // --- create
  const createAnn = async (title: string, body: string) => {
    setErr(null);
    try {
      const { error } = await sb.from('announcements').insert([{ title, body }]);
      if (error) throw error;
      setShowNew(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Create failed');
    }
  };

  // --- update
  const updateAnn = async (id: number, title: string, body: string) => {
    setErr(null);
    try {
      const { error } = await sb.from('announcements').update({ title, body }).eq('id', id);
      if (error) throw error;
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Update failed');
    }
  };

  // --- delete
  const deleteAnn = async (id: number) => {
    if (!confirm('Delete this announcement?')) return;
    setErr(null);
    try {
      const { error } = await sb.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Delete failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <div className="text-sm opacity-70">Role: {role}</div>
      </div>

      <p className="opacity-70">
        Post important updates for the community. Everyone can read; only secretary/sysadmin can create or edit.
      </p>

      <div className="flex items-center justify-end">
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded bg-yellow-500/20 border border-yellow-500/40 px-3 py-2 text-sm hover:bg-yellow-500/30"
          >
            + New Announcement
          </button>
        )}
      </div>

      {err && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Error: {err}
        </div>
      )}

      <div className="rounded border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/40">
            <tr className="text-left">
              <th className="px-4 py-2 w-[180px]">Date</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Body</th>
              <th className="px-4 py-2 w-[160px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={4}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 opacity-70" colSpan={4}>No announcements yet.</td></tr>
            ) : (
              rows.map(a => (
                <tr key={a.id} className="border-t border-zinc-800/60 align-top">
                  <td className="px-4 py-2">{a.created_at?.slice(0, 19).replace('T',' ') ?? '—'}</td>
                  <td className="px-4 py-2 font-medium">{a.title}</td>
                  <td className="px-4 py-2 whitespace-pre-wrap">{a.body ?? '—'}</td>
                  <td className="px-4 py-2">
                    {canWrite ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(a)}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800/60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAnn(a.id)}
                          className="rounded border border-red-600/50 px-2 py-1 text-xs text-red-300 hover:bg-red-600/10"
                        >
                          Delete
                        </button>
                      </div>
                    ) : <span className="opacity-60">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <AnnDialog
          title="New Announcement"
          initial={{ title: '', body: '' }}
          onCancel={() => setShowNew(false)}
          onSave={(t, b) => createAnn(t, b)}
        />
      )}

      {editing && (
        <AnnDialog
          title="Edit Announcement"
          initial={{ title: editing.title ?? '', body: editing.body ?? '' }}
          onCancel={() => setEditing(null)}
          onSave={(t, b) => updateAnn(editing.id, t, b)}
        />
      )}
    </div>
  );
}

function AnnDialog({
  title,
  initial,
  onCancel,
  onSave,
}: {
  title: string;
  initial: { title: string; body: string };
  onCancel: () => void;
  onSave: (title: string, body: string) => void;
}) {
  const [t, setT] = useState(initial.title);
  const [b, setB] = useState(initial.body);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!t.trim()) return;
    setBusy(true);
    await onSave(t.trim(), b.trim());
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        <div className="space-y-2">
          <label className="text-sm opacity-70">Title</label>
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="e.g. April General Meeting Notes"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm opacity-70">Body</label>
          <textarea
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="min-h-[140px] w-full rounded border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="Short announcement text…"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!t.trim() || busy}
            className="rounded bg-yellow-500/20 border border-yellow-500/40 px-3 py-2 text-sm hover:bg-yellow-500/30 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
