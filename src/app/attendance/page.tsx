'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Member = { id: number; full_name: string; email?: string | null };
type Meeting = { id: number; date: string; title: string };
type AttRow = { id: number; meeting_id: number; member_id: number; status: 'present' | 'absent' | 'leave' };

const STATUSES = ['present', 'absent', 'leave'] as const;

export default function AttendancePage() {
  const sb = supabase();
  const params = useSearchParams();
  const meetingFromQuery = params.get('meeting');

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingId, setMeetingId] = useState<number | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<number, AttRow>>({}); // key: member_id

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);

  // Load meetings and members
  useEffect(() => {
    (async () => {
      setBusy(true);
      setErr(null);

      const [{ data: meet }, { data: mems }] = await Promise.all([
        sb.from('meetings').select('id,date,title').order('date', { ascending: false }),
        sb.from('members').select('id,full_name,email').order('full_name', { ascending: true }),
      ]);

      setMeetings(meet ?? []);
      setMembers(mems ?? []);

      // choose default meeting
      if (meetingFromQuery && meet?.length) {
        const mid = Number(meetingFromQuery);
        const exists = meet.find(m => m.id === mid);
        setMeetingId(exists ? mid : (meet[0]?.id ?? null));
      } else {
        setMeetingId(meet?.[0]?.id ?? null);
      }

      setBusy(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load attendance for selected meeting
  useEffect(() => {
    if (!meetingId) return;
    (async () => {
      setErr(null);
      const { data: rows, error } = await sb.from('attendance').select('*').eq('meeting_id', meetingId);
      if (error) { setErr(error.message); return; }
      const byMember: Record<number, AttRow> = {};
      (rows ?? []).forEach((r: any) => { byMember[r.member_id] = r as AttRow; });
      setAttendance(byMember);
    })();
  }, [meetingId, sb]);

  function changeStatus(member_id: number, status: AttRow['status']) {
    setAttendance(prev => {
      const current = prev[member_id];
      if (current) return { ...prev, [member_id]: { ...current, status } };
      // not in DB yet—create local row
      return { ...prev, [member_id]: { id: 0, meeting_id: meetingId!, member_id, status } as AttRow };
    });
  }

  const stats = useMemo(() => {
    const values = Object.values(attendance);
    const present = values.filter(v => v.status === 'present').length;
    const absent = values.filter(v => v.status === 'absent').length;
    const leave = values.filter(v => v.status === 'leave').length;
    return { present, absent, leave };
  }, [attendance]);

  async function saveAll() {
    if (!meetingId) return;
    setSaving(true); setErr(null);

    // Build upsert payload from attendance map
    const payload = Object.values(attendance).map(row => ({
      meeting_id: meetingId,
      member_id: row.member_id,
      status: row.status,
    }));

    // Upsert: unique(meeting_id, member_id)
    const { error } = await sb.from('attendance').upsert(payload, { onConflict: 'meeting_id,member_id' });
    if (error) setErr(error.message);
    setSaving(false);
  }

  function exportCSV() {
    // Simple CSV: Name, Email, Status
    const lines = [['Name', 'Email', 'Status']];
    const byId = attendance;
    for (const m of members) {
      const st = byId[m.id]?.status ?? '';
      lines.push([m.full_name, m.email || '', st]);
    }
    const csv = lines.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_meeting_${meetingId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (busy) return <main className="p-6">Loading…</main>;

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Tracker</h1>
          <p className="text-sm text-zinc-400">Mark members as Present, Absent, or On Leave—then save.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveAll} disabled={saving || !meetingId}
                  className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Attendance'}
          </button>
          <button onClick={exportCSV} className="px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10">
            Export CSV
          </button>
        </div>
      </div>

      {err && <p className="mt-2 text-sm text-red-400">Error: {err}</p>}

      {/* Meeting picker + stats */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div className="flex gap-2">
          <select
            className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2 min-w-64"
            value={meetingId ?? ''}
            onChange={(e)=>setMeetingId(Number(e.target.value)||null)}
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>{`${m.date} — ${m.title}`}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400">Present 🟢</div>
            <div className="text-xl font-semibold">{stats.present}</div>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400">Absent 🔴</div>
            <div className="text-xl font-semibold">{stats.absent}</div>
          </div>
          <div className="border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400">On Leave 🟡</div>
            <div className="text-xl font-semibold">{stats.leave}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Name</th><th>Email</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const current = attendance[m.id]?.status ?? '';
              return (
                <tr key={m.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                  <td className="px-3 py-2 font-medium">{m.full_name}</td>
                  <td className="px-3 py-2">{m.email || '—'}</td>
                  <td className="px-3 py-2">
                    <select
                      className="border border-zinc-800 bg-zinc-900 rounded px-2 py-1"
                      value={current}
                      onChange={(e)=>changeStatus(m.id, e.target.value as AttRow['status'])}
                    >
                      <option value="">—</option>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
