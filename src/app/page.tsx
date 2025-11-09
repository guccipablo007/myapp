// src/app/page.tsx
import Link from "next/link";
import KpiCard from "@/components/KpiCard";
import AdminInsights from "@/components/AdminInsights";
import { formatNumber, formatCurrency } from "@/lib/format";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { getCurrentUserRole } from "@/lib/userRole";

/** Support both shapes: exported client or factory function */
function sb() {
  // @ts-ignore – tolerate either shape
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

type Counts = {
  announcements: number;
  activeMembers: number;
  outstandingDues: number;
  latestAnnouncement?: { id: number; title: string; created_at: string } | null;
  nextMeeting?: { id: number; title: string; scheduled_for: string } | null;
};

async function getDashboardCounts(): Promise<Counts> {
  const supabase = sb();

  // ---- Announcements count + latest
  let announcements = 0;
  let latestAnnouncement: Counts["latestAnnouncement"] = null;
  try {
    const { data, error, count } = await supabase
      .from("announcements")
      .select("id,title,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error) {
      announcements = count ?? 0;
      latestAnnouncement = data?.[0] ?? null;
    }
  } catch {}

  // ---- Active members
  let activeMembers = 0;
  try {
    const { count, error } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (!error) activeMembers = count ?? 0;
  } catch {}

  // ---- Outstanding dues = unpaid fines + outstanding loans
  let unpaidFines = 0;
  try {
    const { data, error } = await supabase
      .from("fines")
      .select("amount,status")
      .eq("status", "unpaid");
    if (!error && data) {
      unpaidFines = data.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    }
  } catch {}

  let outstandingLoans = 0;
  try {
    const { data, error } = await supabase
      .from("loans")
      .select("amount_issued,amount_repaid");
    if (!error && data) {
      outstandingLoans = data.reduce((sum: number, row: any) => {
        const issued = Number(row.amount_issued || 0);
        const repaid = Number(row.amount_repaid || 0);
        const balance = Math.max(0, issued - repaid);
        return sum + balance;
      }, 0);
    }
  } catch {}

  // ---- Next meeting (future soonest)
  let nextMeeting: Counts["nextMeeting"] = null;
  try {
    const { data, error } = await supabase
      .from("meetings")
      .select("id,title,scheduled_for")
      .gte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(1);
    if (!error) nextMeeting = data?.[0] ?? null;
  } catch {}

  return {
    announcements,
    activeMembers,
    outstandingDues: unpaidFines + outstandingLoans,
    latestAnnouncement,
    nextMeeting,
  };
}

export default async function DashboardPage() {
  const [{ announcements, activeMembers, outstandingDues, latestAnnouncement, nextMeeting }, role] =
    await Promise.all([getDashboardCounts(), getCurrentUserRole()]);

  const briefing = [
    `${announcements} announcement${announcements === 1 ? "" : "s"} total`,
    `${activeMembers} active member${activeMembers === 1 ? "" : "s"}`,
    `Outstanding dues: ${formatCurrency(outstandingDues)}`,
  ].join(" • ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Welcome, Collins! 👋</h1>
        <div className="flex gap-2">
          <Link href="/growth" className="text-sm rounded px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10">
            Growth
          </Link>
          <Link href="/finances" className="text-sm rounded px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10">
            Finances
          </Link>
          <Link href="/members" className="text-sm rounded px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10">
            Members
          </Link>
          <Link href="/meetings" className="text-sm rounded px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10">
            Meetings
          </Link>
          <Link href="/attachments" className="text-sm rounded px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10">
            Attachments
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Announcements"
          value={formatNumber(announcements)}
          hint="Total announcements posted"
          href="/meetings"
          tooltip="Count of rows in announcements table."
        />
        <KpiCard
          label="Active Members"
          value={formatNumber(activeMembers)}
          hint="Current active members"
          href="/members"
          tooltip="members.status = 'active'."
        />
        <KpiCard
          label="Outstanding Dues"
          value={formatCurrency(outstandingDues)}
          hint="Unpaid fines + active loans"
          href="/finances"
          tooltip="Sum of unpaid fines + outstanding loans."
        />
      </div>

      {/* Briefing + Latest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center gap-2">
            <span>🧠</span>
            <h2 className="text-sm font-medium">Here’s your briefing</h2>
          </div>
          <p className="mt-2 text-sm text-white/80">{briefing}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Latest Announcement</h2>
            <Link href="/meetings" className="text-xs opacity-80 hover:opacity-100">
              View
            </Link>
          </div>
          {latestAnnouncement ? (
            <div className="mt-2">
              <p className="text-white/90">{latestAnnouncement.title}</p>
              <p className="text-xs text-white/60">
                {new Date(latestAnnouncement.created_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/60">No announcements yet.</p>
          )}
        </div>
      </div>

      {/* Next Meeting */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Next Meeting</h2>
          <Link href="/meetings" className="text-xs opacity-80 hover:opacity-100">
            See all
          </Link>
        </div>
        {nextMeeting ? (
          <div className="mt-2">
            <p className="text-white/90">{nextMeeting.title}</p>
            <p className="text-xs text-white/60">
              {new Date(nextMeeting.scheduled_for).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/60">No upcoming meetings.</p>
        )}
      </div>

      {/* Admin Insights Section — gated by role */}
      {(role === 'sysadmin' || role === 'secretary') ? <AdminInsights /> : null}

      {/* Data sources note */}
      <p className="text-[11px] text-white/40">
        Data from: <code>announcements</code>, <code>members</code>, <code>fines</code>, <code>loans</code>, <code>meetings</code>.
      </p>
    </div>
  );
}
