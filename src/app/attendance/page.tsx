'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Meeting = { id: number; title?: string | null; date?: string | null };
type Status = 'present' | 'absent' | 'leave';

type SelRow = {
  member_id: number;
  full_name: string;
  status: Status | null;
};

function downloadCSV(filename: string, rows: { [k: string]: unknown }[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv =
    [headers.join(',')]
      .concat(rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')))
      .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingId, setMeetingId] = useState<number | ''>('');
  const [rows, setRows] = useState<SelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sb = supabase(); // <-- get the client

  // Load meetings
  useEffect(() => {
    (async () => {
      const { data, error } = await sb
        .from('meetings')
        .select('id,title,date')
        .order('date', { ascending: false });
      if (error) return setErr(error.message);
      setMeetings(data || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load members and any existing attendance for selected meeting
  useEffect(() => {
    if (!meetingId) return;
    setLoading(true);
    setErr(null);

    (async () => {
      // members
      const { data: members, error: mErr } = await sb
        .from('members')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (mErr) {
        setErr(mErr.message);
        setLoading(false);
        return;
      }

      // existing attendance
      const { data: att, error: aErr } = await sb
        .from('attendance')
        .select('member_id,status')
        .eq('meeting_id', meetingId);

      if (aErr) {
        setErr(aErr.message);
        setLoading(false);
        return;
      }

      const map = new Map<number, Status>();
      (att || []).forEach((r) => map.set(r.member_id, r.status as Status));

      setRows(
        (members || []).map((m) => ({
          member_id: m.id,
          full_name: m.full_name,
          status: map.get(m.id) ?? null,
        })),
      );
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const counts = useMemo(() => {
    const present = rows.filter((r) => r.status === 'present').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const leave = rows.filter((r) => r.status === 'leave').length;
    return { present, absent, leave };
  }, [rows]);

  function setStatus(member_id: number, status: Status) {
    setRows((prev) =>
      prev.map((r) => (r.member_id === member_id ? { ...r, status } : r)),
    );
  }

  async function saveAttendance() {
    if (!meetingId) return;
    setLoading(true);
    setErr(null);
    const payload = rows
      .filter((r) => r.status) // only selected
      .map((r) => ({
        meeting_id: meetingId,
        member_id: r.member_id,
        status: r.status as Status,
      }));

    // upsert by (meeting_id, member_id)
    const { error } = await sb
      .from('attendance')
      .upsert(payload, { onConflict: 'meeting_id,member_id' });

    if (error) setErr(error.message);
    setLoading(false);
  }

  function exportCSV() {
    if (!meetingId) return;
    const meeting = meetings.find((m) => m.id === meetingId);
    downloadCSV(
      `attendance_${meeting?.date || meetingId}.csv`,
      rows.map((r) => ({
        meeting_id: meetingId,
        meeting_title: meeting?.title ?? '',
        member_id: r.member_id,
        full_name: r.full_name,
        status: r.status ?? '',
      })),
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Attendance Tracker</h1>
      <p className="text-zinc-400 mb-4">
        Select a meeting and mark each member’s status.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm mb-1">Meeting</label>
          <select
            className="w-full rounded border border-zinc-700 bg-black px-3 py-2"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">— Select meeting —</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title || 'Meeting'} {m.date ? `• ${m.date}` : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded border border-zinc-700 hover:bg-zinc-800"
        >
          Export CSV
        </button>

        <button
          onClick={saveAttendance}
          className="px-4 py-2 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-600 hover:bg-yellow-500/20"
          disabled={!meetingId || loading}
        >
          Save Attendance
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border border-zinc-800 p-4">
          <div className="text-zinc-400">Present</div>
          <div className="text-3xl font-semibold">{counts.present}</div>
        </div>
        <div className="rounded border border-zinc-800 p-4">
          <div className="text-zinc-400">Absent</div>
          <div className="text-3xl font-semibold">{counts.absent}</div>
        </div>
        <div className="rounded border border-zinc-800 p-4">
          <div className="text-zinc-400">On Leave</div>
          <div className="text-3xl font-semibold">{counts.leave}</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/50 border-b border-zinc-800">
            <tr>
              <th className="text-left p-3 w-1/2">Name</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-zinc-500" colSpan={2}>
                  No members found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.member_id} className="border-t border-zinc-800">
                  <td className="p-3">{r.full_name}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {(['present', 'absent', 'leave'] as Status[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(r.member_id, s)}
                          className={`px-3 py-1 rounded border ${
                            r.status === s
                              ? 'border-yellow-500 text-yellow-400'
                              : 'border-zinc-700 text-zinc-300'
                          } hover:bg-zinc-900`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {err && (
        <div className="text-red-400 text-sm">
          Error: {err}
        </div>
      )}
    </div>
  );
}
