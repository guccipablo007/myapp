'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

type Meeting = {
  id: number;
  title?: string | null;
  date: string;
};

type Row = {
  member_id: number;
  full_name: string;
  status: 'present' | 'absent' | 'leave';
};

function AttendanceInner() {
  const sb = supabase();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadMeetings() {
    const { data, error } = await sb
      .from('meetings')
      .select('id, title, date')
      .order('date', { ascending: false });
    if (error) return setErr(error.message);
    setMeetings((data ?? []) as Meeting[]);
    if (!meetingId && data && data.length) setMeetingId(data[0].id);
  }

  async function loadAttendance(mid: number) {
    setLoading(true);
    setErr(null);
    // join attendance + members for names
    const { data, error } = await sb
      .from('attendance')
      .select('member_id, status, members(full_name)')
      .eq('meeting_id', mid)
      .order('member_id', { ascending: true });

    setLoading(false);
    if (error) return setErr(error.message);

    const mapped: Row[] = (data ?? []).map((r: any) => ({
      member_id: r.member_id,
      full_name: r.members?.full_name ?? '—',
      status: r.status,
    }));
    setRows(mapped);
  }

  useEffect(() => {
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (meetingId) loadAttendance(meetingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const stats = useMemo(() => {
    const present = rows.filter(r => r.status === 'present').length;
    const absent = rows.filter(r => r.status === 'absent').length;
    const leave = rows.filter(r => r.status === 'leave').length;
    return { present, absent, leave };
  }, [rows]);

  function downloadCSV() {
    const header = ['Member ID', 'Full Name', 'Status'];
    const body = rows.map(r => [r.member_id, r.full_name, r.status]);
    const lines = [header, ...body].map(cols =>
      cols.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const m = meetings.find(m => m.id === meetingId);
    a.download = `attendance_${m?.date ?? 'meeting'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance Tracker</h1>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700"
            value={meetingId ?? ''}
            onChange={(e) => setMeetingId(Number(e.target.value))}
          >
            {meetings.map(m => (
              <option key={m.id} value={m.id}>
                {m.date} {m.title ? `— ${m.title}` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={downloadCSV}
            disabled={!rows.length}
            className="px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10 hover:text-yellow-400 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-3 mt-4">
        <Stat label="Present" value={stats.present} />
        <Stat label="Absent" value={stats.absent} />
        <Stat label="On Leave" value={stats.leave} />
      </section>

      <div className="overflow-x-auto border border-zinc-800 rounded-lg mt-4">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Member ID</th>
              <th>Full Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="px-3 py-3">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-3">No records</td></tr>
            )}
            {rows.map(r => (
              <tr key={`${r.member_id}`} className="border-t border-zinc-800">
                <td className="px-3 py-2">{r.member_id}</td>
                <td className="px-3 py-2">{r.full_name}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {err && <p className="mt-3 text-sm text-red-400">Error: {err}</p>}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-800 rounded p-3 bg-zinc-950/60">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

// Wrap with Suspense-friendly boundary so Vercel build doesn't complain
export default function AttendancePage() {
  return (
    <Suspense fallback={<main className="pt-6 max-w-6xl mx-auto">Loading…</main>}>
      <AttendanceInner />
    </Suspense>
  );
}
