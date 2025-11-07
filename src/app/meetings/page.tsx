'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Meeting = {
  id: number;
  title: string;
  date: string;          // date (string for simplicity)
  recorded_by?: string;
  notes?: string;
  attachments?: Attachment[];
};

type Attachment = {
  id: number;
  meeting_id: number;
  file_path: string;
  uploaded_at: string;
};

export default function MeetingsPage() {
  const sb = supabase();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [role, setRole] = useState<'sysadmin'|'secretary'|'member'|'unknown'>('unknown');

  async function loadRole() {
    // If you already store the role in user_profiles, fetch it here.
    const session = (await sb.auth.getSession()).data.session;
    if (!session?.user) return setRole('member');
    const { data } = await sb.from('user_profiles').select('role').eq('user_id', session.user.id).maybeSingle();
    setRole((data?.role as any) ?? 'member');
  }

  async function load() {
    const { data: mtgs } = await sb
      .from('meetings')
      .select('id, title, date, recorded_by, notes')
      .order('date', { ascending: false });

    const ids = (mtgs ?? []).map(m => m.id);
    let atts: Attachment[] = [];
    if (ids.length) {
      const { data } = await sb
        .from('meeting_attachments')
        .select('*')
        .in('meeting_id', ids)
        .order('uploaded_at', { ascending: false });
      atts = data ?? [];
    }

    const joined = (mtgs ?? []).map(m => ({
      ...m,
      attachments: atts.filter(a => a.meeting_id === m.id)
    })) as Meeting[];

    setMeetings(joined);
  }

  useEffect(() => {
    loadRole();
    load();
  }, []);

  const openMeeting = useMemo(
    () => meetings.find(m => m.id === openId) ?? null,
    [openId, meetings]
  );

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Meetings & Minutes</h1>
      <p className="text-sm text-zinc-400 mb-6">
        View meeting notes and download attachments.
      </p>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 text-zinc-400">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Recorded By</th>
              <th className="text-left p-3">Attachments</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-zinc-500">No meetings yet.</td>
              </tr>
            )}
            {meetings.map(m => (
              <tr key={m.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                <td className="p-3">{m.date ?? '-'}</td>
                <td className="p-3">{m.title}</td>
                <td className="p-3">{m.recorded_by ?? '-'}</td>
                <td className="p-3">{m.attachments?.length ?? 0}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => setOpenId(m.id)}
                    className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-yellow-500/10"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openMeeting && (
        <MeetingModal
          meeting={openMeeting}
          onClose={() => setOpenId(null)}
          role={role}
          refresh={load}
        />
      )}
    </main>
  );
}

function MeetingModal({
  meeting,
  onClose,
  role,
  refresh
}: {
  meeting: Meeting;
  onClose: () => void;
  role: 'sysadmin'|'secretary'|'member'|'unknown';
  refresh: () => Promise<void>;
}) {
  const sb = supabase();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canUpload = role === 'sysadmin' || role === 'secretary';

  async function handleUpload() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const fileName = `${meeting.id}-${Date.now()}-${f.name}`.replace(/\s+/g, '_');
    const path = `meetings/${fileName}`;

    // upload to bucket
    const { error: upErr } = await sb.storage.from('meetings').upload(path, f, {
      cacheControl: '3600',
      upsert: false
    });
    if (upErr) return alert(upErr.message);

    // record in DB
    const { error: insErr } = await sb
      .from('meeting_attachments')
      .insert({ meeting_id: meeting.id, file_path: path });

    if (insErr) return alert(insErr.message);

    await refresh();
    alert('File uploaded.');
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="w-[min(850px,95vw)] max-h-[85vh] overflow-auto border border-zinc-800 rounded-lg bg-zinc-950">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold">{meeting.title}</h3>
            <div className="text-xs text-zinc-400">{meeting.date} • {meeting.recorded_by ?? '—'}</div>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-yellow-500/10">Close</button>
        </div>

        <div className="p-4 space-y-5">
          <section>
            <h4 className="font-semibold mb-2">Minutes / Notes</h4>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap">
              {meeting.notes ?? 'No notes added.'}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Attachments</h4>
              {canUpload && (
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" className="text-xs" />
                  <button
                    onClick={handleUpload}
                    className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-yellow-500/10"
                  >
                    Upload
                  </button>
                </div>
              )}
            </div>

            <ul className="space-y-2 text-sm">
              {(meeting.attachments ?? []).length === 0 && (
                <li className="text-zinc-400">No files.</li>
              )}
              {(meeting.attachments ?? []).map(a => {
                // public bucket: direct URL
                const publicUrl = supabase().storage.from('meetings').getPublicUrl(a.file_path).data.publicUrl;
                return (
                  <li key={a.id} className="flex items-center justify-between border border-zinc-800 rounded p-2">
                    <span className="truncate">{a.file_path.split('/').slice(-1)[0]}</span>
                    <a
                      href={publicUrl}
                      target="_blank"
                      className="px-3 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
                    >
                      Download
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
