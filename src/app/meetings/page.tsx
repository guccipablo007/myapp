'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase as supabaseFactory } from '@/lib/supabase';
import MeetingModal from './MeetingModal';

// Toggle signed/public URLs for attachments in the modal
export const USE_SIGNED_URLS = true;

type MeetingRow = {
  id: number;
  title: string | null;
  date: string | null;         // ISO date (YYYY-MM-DD)
  recorded_by?: string | null; // optional if your schema has it
};

export default function MeetingsPage() {
  const sb = useMemo(() => supabaseFactory(), []);
  const [rows, setRows] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // for role gating (upload/delete)
  const [role, setRole] = useState<string>('guest');
  const canWrite = ['sysadmin', 'secretary'].includes(role);

  const [showNew, setShowNew] = useState(false);
  const [active, setActive] = useState<MeetingRow | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: sess } = await sb.auth.getSession();
        const uid = sess?.session?.user?.id;
        if (!uid) {
          if (alive) setRole('guest');
          return;
        }
        const { data: prof } = await sb
          .from('user_profiles')
          .select('role')
          .eq('user_id', uid)
          .maybeSingle();

        if (alive) setRole(prof?.role ?? 'member');
      } catch {
        if (alive) setRole('guest');
      }
    })();

    return () => { alive = false; };
  }, [sb]);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      // keep selection minimal to avoid column-mismatch headaches
      const { data, error } = await sb
        .from('meetings')
        .select('id,title,date,recorded_by')
        .order('date', { ascending: false });

      if (error) throw error;
      setRows((data ?? []) as MeetingRow[]);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load meetings');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create a new meeting (title + date only to be schema-safe)
  const createMeeting = async (title: string, dateISO: string) => {
    setErr(null);
    try {
      const { data, error } = await sb
        .from('meetings')
        .insert([{ title, date: dateISO }])
        .select('id,title,date,recorded_by')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setShowNew(false);
        setActive(data as MeetingRow); // open modal right away
        await load();
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create meeting');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meetings &amp; Minutes</h1>
        <div className="text-sm opacity-70">Role: {role}</div>
      </div>

      <p className="opacity-70">
        View meeting notes and manage attachments per meeting folder.
      </p>

      <div className="flex items-center justify-between">
        <div />
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded bg-yellow-500/20 border border-yellow-500/40 px-3 py-2 text-sm hover:bg-yellow-500/30"
          >
            + New Meeting
          </button>
        )}
      </div>

      {err && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Error: {err}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/40">
            <tr className="text-left">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Recorded By</th>
              <th className="px-4 py-2">Attachments</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan={5}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 opacity-70" colSpan={5}>
                  No meetings yet.
                </td>
              </tr>
            ) : (
              rows.map((m) => {
                const folder = `meetings/${m.id}`;
                return (
                  <tr key={m.id} className="border-t border-zinc-800/60">
                    <td className="px-4 py-2">{m.date ?? '—'}</td>
                    <td className="px-4 py-2">{m.title ?? 'Untitled'}</td>
                    <td className="px-4 py-2">{m.recorded_by ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{folder}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setActive(m)}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800/60"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showNew && (
        <NewMeetingDialog
          onCancel={() => setShowNew(false)}
          onCreate={createMeeting}
        />
      )}

      {/* Details modal (with attachments for that meeting) */}
      {active && (
        <MeetingModal
          meeting={active}
          onClose={() => setActive(null)}
          canWrite={canWrite}
          useSignedUrls={USE_SIGNED_URLS}
        />
      )}
    </div>
  );
}

/* ---------- Small inline dialog for creating a meeting ---------- */
function NewMeetingDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (title: string, dateISO: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    await onCreate(title.trim(), dateISO);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <h2 className="text-lg font-semibold">New Meeting</h2>

        <div className="space-y-2">
          <label className="text-sm opacity-70">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="e.g. Monthly Committee Review"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm opacity-70">Date</label>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
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
            disabled={!title.trim() || busy}
            className="rounded bg-yellow-500/20 border border-yellow-500/40 px-3 py-2 text-sm hover:bg-yellow-500/30 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
