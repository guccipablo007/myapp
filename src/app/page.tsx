// src/app/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { supabase as supabaseMaybe } from '@/lib/supabase';

/** Tolerate both supabase client or factory exports */
function sb() {
  // @ts-expect-error handle both shapes
  const s = typeof supabaseMaybe === 'function' ? supabaseMaybe() : supabaseMaybe;
  return s;
}

export default async function DashboardPage() {
  noStore(); // prevent Next.js from caching

  const s = sb();

  // --- Fetch data for dashboard cards ---
  const [{ data: members }, { data: announcements }, { data: fines }, { data: loans }] =
    await Promise.all([
      s.from('members').select('id, status').eq('status', 'active'),
      s.from('announcements').select('id'),
      s.from('fines').select('amount, status'),
      s.from('loans').select('amount, status')
    ]);

  const activeMembers = members?.length ?? 0;
  const totalAnnouncements = announcements?.length ?? 0;

  // Compute outstanding dues (fines + active loans)
  const finesDue =
    fines?.filter((f) => f.status === 'unpaid').reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
  const loansDue =
    loans?.filter((l) => l.status === 'active').reduce((sum, l) => sum + (l.amount || 0), 0) || 0;
  const totalOutstanding = finesDue + loansDue;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Welcome, Collins! 👋</h1>

      {/* Nav buttons */}
      <div className="flex gap-2 mb-6">
        {['Growth', 'Finances', 'Members', 'Meetings', 'Attachments'].map((tab) => (
          <Link
            key={tab}
            href={`/${tab.toLowerCase()}`}
            className="rounded-md bg-neutral-900/60 px-4 py-2 text-sm border border-neutral-800 hover:bg-neutral-800 transition-colors"
          >
            {tab}
          </Link>
        ))}
      </div>

      {/* Main cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card
          title="Announcements"
          value={totalAnnouncements}
          subtitle="Total announcements posted"
          link="/notifications"
        />
        <Card
          title="Active Members"
          value={activeMembers}
          subtitle="Current active members"
          link="/members"
        />
        <Card
          title="Outstanding Dues"
          value={`FCFA ${totalOutstanding}`}
          subtitle="Unpaid fines + active loans"
          link="/finances"
        />
      </div>

      {/* Briefing section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-800 p-4">
          <h2 className="font-semibold mb-2">🧠 Here’s your briefing</h2>
          <p className="text-sm text-neutral-400">
            {totalAnnouncements} announcements total • {activeMembers} active members • Outstanding
            dues: FCFA {totalOutstanding}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 p-4">
          <h2 className="font-semibold mb-2">Latest Announcement</h2>
          <p className="text-sm text-neutral-400">
            {totalAnnouncements > 0 ? 'Check the latest updates in Notifications.' : 'No announcements yet.'}
          </p>
          <Link href="/notifications" className="text-xs text-amber-400 hover:underline">
            View
          </Link>
        </div>

        <div className="rounded-lg border border-neutral-800 p-4 md:col-span-2">
          <h2 className="font-semibold mb-2">Next Meeting</h2>
          <p className="text-sm text-neutral-400">No upcoming meetings.</p>
          <Link href="/meetings" className="text-xs text-amber-400 hover:underline">
            See all
          </Link>
        </div>
      </div>

      <p className="mt-4 text-xs text-neutral-600">
        Data from: announcements, members, fines, loans, meetings.
      </p>
    </div>
  );
}

/* ──────────────── Small helper Card component ──────────────── */
function Card({
  title,
  value,
  subtitle,
  link
}: {
  title: string;
  value: string | number;
  subtitle: string;
  link: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 p-5 flex flex-col justify-between bg-neutral-900/40">
      <div>
        <h3 className="font-semibold text-neutral-200 mb-1">{title}</h3>
        <p className="text-neutral-400 text-sm">{subtitle}</p>
      </div>
      <div className="flex justify-between items-end mt-3">
        <span className="text-2xl font-bold text-white">{value}</span>
        <Link
          href={link}
          className="text-xs border border-neutral-700 rounded-md px-2 py-1 hover:bg-neutral-800"
        >
          View details
        </Link>
      </div>
    </div>
  );
}
