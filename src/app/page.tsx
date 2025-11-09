// src/app/page.tsx
import React from 'react';
import { formatCurrency } from '@/lib/format';
import { supabase as supabaseExport } from '@/lib/supabase';

// Support both exports: a client or a factory that returns a client.
function getDb() {
  // @ts-ignore – handle either shape at runtime
  return typeof supabaseExport === 'function' ? supabaseExport() : supabaseExport;
}

type SumRow = { sum?: number | null };

export default async function DashboardPage() {
  const sb = getDb();

  // --- Announcements count + latest ---
  const { count: announcementsCount = 0 } =
    (await sb.from('announcements').select('*', { count: 'exact', head: true })) || {};

  const { data: latestAnn } =
    (await sb
      .from('announcements')
      .select('title, created_at')
      .order('created_at', { ascending: false })
      .limit(1)) || { data: [] as any[] };

  // --- Active members count (status = 'active') ---
  const { count: activeMembers = 0 } =
    (await sb
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')) || {};

  // --- Next meeting (upcoming by date) ---
  const { data: nextMeetingRows } =
    (await sb
      .from('meetings')
      .select('title, date')
      .gte('date', new Date().toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .limit(1)) || { data: [] as any[] };
  const nextMeeting = nextMeetingRows?.[0] ?? null;

  // --- Finance: outstanding dues = unpaid fines + outstanding loans ---
  // Fines: sum where status='unpaid'
  const { data: finesSumRows } =
    (await sb
      .from('fines')
      .select('sum:amount', { head: false })
      .eq('status', 'unpaid')) || {};
  const finesSum = Array.isArray(finesSumRows) && finesSumRows[0]
    ? (finesSumRows[0] as SumRow).sum ?? 0
    : 0;

  // Loans outstanding: prefer a `principal_remaining` column if you have it.
  // Fallback: sum principal where status != 'repaid'
  // Adjust to your schema (principal vs amount, status values).
  const { data: loansSumRows } =
    (await sb
      .from('loans')
      .select('sum:principal', { head: false })
      .neq('status', 'repaid')) || {};
  const loansOutstanding = Array.isArray(loansSumRows) && loansSumRows[0]
    ? (loansSumRows[0] as SumRow).sum ?? 0
    : 0;

  const outstandingDues = (Number(finesSum) || 0) + (Number(loansOutstanding) || 0);

  // --- Briefing line
  const briefing = [
    `${announcementsCount} announcement${announcementsCount === 1 ? '' : 's'} total`,
    `${activeMembers} active member${activeMembers === 1 ? '' : 's'}`,
    `Outstanding dues: ${formatCurrency(outstandingDues)}`,
  ].join(' • ');

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Welcome, Collins! 👋</h1>
        <p className="text-zinc-400 mt-1">
          Here’s a quick look at what’s happening in the community.
        </p>
      </header>

      {/* Top stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5">
          <div className="text-sm text-zinc-400">📣 Announcements</div>
          <div className="text-4xl font-bold mt-2">{announcementsCount ?? 0}</div>
          <div className="text-xs text-zinc-500 mt-2">Total announcements posted</div>
        </div>

        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5">
          <div className="text-sm text-zinc-400">👥 Active Members</div>
          <div className="text-4xl font-bold mt-2">{activeMembers ?? 0}</div>
          <div className="text-xs text-zinc-500 mt-2">Current active members</div>
        </div>

        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5">
          <div className="text-sm text-zinc-400">💰 Outstanding Dues</div>
          <div className="text-4xl font-bold mt-2">
            {formatCurrency(outstandingDues)}
          </div>
          <div className="text-xs text-zinc-500 mt-2">Unpaid fines + active loans</div>
        </div>
      </section>

      {/* Briefing */}
      <section className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5">
        <div className="text-sm text-zinc-400">🧠 Here’s your briefing</div>
        <div className="text-sm mt-2">{briefing}</div>
      </section>

      {/* Latest & next */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5">
          <div className="text-sm text-zinc-400">Latest Announcement</div>
          {latestAnn?.length ? (
            <div className="mt-2">
              <div className="font-medium">{latestAnn[0]?.title}</div>
              <div className="text-xs text-zinc-500">
                {new Date(latestAnn[0]?.created_at).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500 mt-2">No announcements yet.</div>
          )}
        </div>

        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5">
          <div className="text-sm text-zinc-400">Next Meeting</div>
          {nextMeeting ? (
            <div className="mt-2">
              <div className="font-medium">{nextMeeting.title}</div>
              <div className="text-xs text-zinc-500">
                {new Date(nextMeeting.date).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500 mt-2">No upcoming meetings.</div>
          )}
        </div>
      </section>
    </main>
  );
}
