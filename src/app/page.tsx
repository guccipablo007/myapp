'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Summary = {
  announcements: number;
  members: number;
  outstanding: number;
};

export default function Dashboard() {
  const sb = supabase();
  const [summary, setSummary] = useState<Summary>({ announcements: 0, members: 0, outstanding: 0 });
  const [latest, setLatest] = useState<{ title: string; date: string } | null>(null);
  const [nextMeeting, setNextMeeting] = useState<{ date: string; title: string } | null>(null);

  async function load() {
    const [a, m, f, meeting] = await Promise.all([
      sb.from('announcements').select('id', { count: 'exact', head: true }),
      sb.from('members').select('id', { count: 'exact', head: true }),
      sb.from('fines').select('amount,status', { count: 'exact' }),
      sb.from('meetings').select('*').order('date', { ascending: true }).limit(1)
    ]);
    setSummary({
      announcements: a.count ?? 0,
      members: m.count ?? 0,
      outstanding:
        (f.data ?? [])
          .filter((x: any) => x.status !== 'paid')
          .reduce((t: number, x: any) => t + Number(x.amount ?? 0), 0) || 0,
    });
    if (a.data && a.data.length) setLatest({ title: a.data[0].title, date: a.data[0].created_at });
    if (meeting.data && meeting.data.length) setNextMeeting({ date: meeting.data[0].date, title: meeting.data[0].title });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome 👋</h1>
      <p className="text-sm text-zinc-400 mb-6">Here’s a quick look at what’s happening in the community.</p>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card title="📢 Announcements" value={summary.announcements.toString()} href="/announcements" />
        <Card title="👥 Active Members" value={summary.members.toString()} href="/members" />
        <Card title="💰 Outstanding Dues" value={`${summary.outstanding.toLocaleString()} CFA`} href="/finances" />
      </div>

      {/* Briefing banner */}
      <div className="border border-zinc-800 rounded-lg p-4 mb-8 bg-zinc-950/60">
        <h2 className="text-lg font-semibold mb-2">🧠 Here’s your briefing</h2>
        <p className="text-sm text-zinc-400">
          - Latest announcement: <strong>{latest?.title ?? 'None yet'}</strong><br />
          - Next meeting: <strong>{nextMeeting?.date ?? 'None scheduled'}</strong><br />
          - Outstanding dues: <strong>{summary.outstanding.toLocaleString()} CFA</strong>
        </p>
      </div>

      {/* Recent activity */}
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/40">
        <h2 className="text-lg font-semibold mb-3">📜 Recent Activity</h2>
        <div className="text-sm text-zinc-400 space-y-1">
          <div>📢 Latest Announcement: {latest?.title ?? 'No announcements yet'}</div>
          <div>📅 Next Meeting: {nextMeeting?.date ?? 'No upcoming meetings'}</div>
        </div>
      </div>
    </main>
  );
}

function Card({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/60 hover:bg-yellow-500/10 transition"
    >
      <div className="text-sm text-zinc-400 mb-1">{title}</div>
      <div className="text-2xl font-semibold text-yellow-400">{value}</div>
    </Link>
  );
}
