// src/app/members/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { getCurrentUserRole, type AppRole } from "@/lib/userRole";
import { formatCurrency, formatNumber } from "@/lib/format";

function sb() {
  // supports both: exported client or factory function
  // @ts-ignore
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

// ----- types kept loose to avoid TS friction with your current schema
type Member = {
  id: number;
  full_name: string;
  email?: string | null;
  role?: string | null;       // "sysadmin" | "secretary" | "member"
  status?: string | null;     // "active" | "suspended"
  joined_at?: string | null;  // date
};

type Fine = {
  id: number;
  member_id: number;
  date?: string | null;
  reason?: string | null;
  status: string;             // "paid" | "unpaid"
  amount: number;             // numeric
};

type Loan = {
  id: number;
  member_id: number;
  date?: string | null;
  description?: string | null;
  status?: string | null;     // "active" | "repaid" | "outstanding" | etc.
  amount?: number | null;     // legacy
  amount_issued?: number | null;
  amount_repaid?: number | null;
};

type Attendance = {
  id: number;
  meeting_id: number;
  member_id: number;
  status: string;             // "present" | "absent" | "leave"
};

type Meeting = {
  id: number;
  title?: string | null;
  scheduled_for?: string | null;
};

type TabKey = "overview" | "fines" | "loans" | "attendance";

export default function MemberProfilePage() {
  const supabase = sb();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const memberId = Number(params?.id);

  const [role, setRole] = useState<AppRole>("guest");
  const [tab, setTab] = useState<TabKey>("overview");

  const [member, setMember] = useState<Member | null>(null);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [meetingsMap, setMeetingsMap] = useState<Record<number, Meeting>>({});

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canWrite = role === "sysadmin" || role === "secretary";

  useEffect(() => {
    if (!memberId || Number.isNaN(memberId)) return;
    let gone = false;

    async function boot() {
      setLoading(true);
      setErr(null);

      try {
        // current app role
        try {
          const r = await getCurrentUserRole();
          if (!gone) setRole(r);
        } catch {
          if (!gone) setRole("guest");
        }

        // member
        const m = await supabase
          .from("members")
          .select("id,full_name,email,role,status,joined_at")
          .eq("id", memberId)
          .maybeSingle();

        if (m.error) throw m.error;
        if (!gone) setMember(m.data as Member);

        // fines
        const f = await supabase
          .from("fines")
          .select("id,member_id,date,reason,status,amount")
          .eq("member_id", memberId)
          .order("date", { ascending: false })
          .limit(500);

        if (!gone) setFines((f.data ?? []) as Fine[]);

        // loans (support old/new schema)
        const l = await supabase
          .from("loans")
          .select("id,member_id,date,description,status,amount,amount_issued,amount_repaid")
          .eq("member_id", memberId)
          .order("date", { ascending: false })
          .limit(500);

        if (!gone) setLoans((l.data ?? []) as Loan[]);

        // attendance
        const a = await supabase
          .from("attendance")
          .select("id,meeting_id,member_id,status")
          .eq("member_id", memberId)
          .limit(500);

        const att = (a.data ?? []) as Attendance[];
        if (!gone) setAttendance(att);

        // fetch related meetings for nice labels
        const ids = Array.from(new Set(att.map((x) => x.meeting_id))).filter(Boolean);
        if (ids.length) {
          const chunked = chunk(ids, 100); // in case of many
          const maps: Record<number, Meeting> = {};
          for (const chunkIds of chunked) {
            const mm = await supabase
              .from("meetings")
              .select("id,title,scheduled_for")
              .in("id", chunkIds);
            (mm.data ?? []).forEach((r: any) => {
              maps[r.id] = { id: r.id, title: r.title, scheduled_for: r.scheduled_for };
            });
          }
          if (!gone) setMeetingsMap(maps);
        }
      } catch (e: any) {
        if (!gone) setErr(e?.message || "Failed to load member profile");
      } finally {
        if (!gone) setLoading(false);
      }
    }

    boot();
    return () => {
      gone = true;
    };
  }, [memberId, supabase]);

  // ---- Derived numbers
  const finesPaid = useMemo(
    () => fines.filter((x) => x.status === "paid").reduce((t, x) => t + Number(x.amount || 0), 0),
    [fines]
  );
  const finesUnpaid = useMemo(
    () => fines.filter((x) => x.status === "unpaid").reduce((t, x) => t + Number(x.amount || 0), 0),
    [fines]
  );

  const loansIssued = useMemo(
    () =>
      loans.reduce((t, x) => {
        const issued = Number(x.amount_issued ?? x.amount ?? 0);
        return t + issued;
      }, 0),
    [loans]
  );
  const loansRepaid = useMemo(
    () =>
      loans.reduce((t, x) => {
        const repaid = Number(x.amount_repaid ?? 0);
        return t + repaid;
      }, 0),
    [loans]
  );
  const loansOutstanding = Math.max(0, loansIssued - loansRepaid);

  // ---- Actions: suspend / activate
  async function toggleStatus() {
    if (!member) return;
    if (!canWrite) return;

    const next = (member.status ?? "active") === "active" ? "suspended" : "active";
    setBusy(true);
    setErr(null);

    // optimistic
    const prev = member;
    setMember({ ...member, status: next });

    try {
      const { error } = await supabase.from("members").update({ status: next }).eq("id", member.id);
      if (error) throw error;
    } catch (e: any) {
      setErr(e?.message || "Failed to update status");
      setMember(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/10"
        >
          ← Back
        </button>
        <Link
          href="/members"
          className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/10"
        >
          Members
        </Link>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-5">
        {loading ? (
          <p className="text-sm text-white/70">Loading…</p>
        ) : err ? (
          <p className="text-sm text-red-400">{err}</p>
        ) : !member ? (
          <p className="text-sm text-white/70">Member not found.</p>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-lg font-semibold">
                {initials(member.full_name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold">{member.full_name}</h1>
                  {member.role ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-wide">
                      {member.role}
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide border ${
                      (member.status ?? "active") === "active"
                        ? "border-green-500/30 text-green-300 bg-green-500/10"
                        : "border-yellow-400/30 text-yellow-200 bg-yellow-400/10"
                    }`}
                  >
                    {member.status ?? "active"}
                  </span>
                </div>
                <p className="text-sm text-white/70">{member.email || "—"}</p>
                <p className="text-xs text-white/50">
                  Joined: {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canWrite && (
                <button
                  onClick={toggleStatus}
                  disabled={busy}
                  className="rounded px-3 py-2 text-sm border border-white/10 hover:bg-white/10 disabled:opacity-50"
                  title="Suspend/Activate"
                >
                  {(member.status ?? "active") === "active" ? "Suspend" : "Activate"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabBtn now={tab} setNow={setTab} me="overview">Overview</TabBtn>
        <TabBtn now={tab} setNow={setTab} me="fines">Fines</TabBtn>
        <TabBtn now={tab} setNow={setTab} me="loans">Loans</TabBtn>
        <TabBtn now={tab} setNow={setTab} me="attendance">Attendance</TabBtn>
      </div>

      {/* Panels */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-sm font-medium">Financial Summary</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Metric label="Fines Paid" value={formatCurrency(finesPaid)} />
              <Metric label="Fines Unpaid" value={formatCurrency(finesUnpaid)} />
              <Metric label="Loans Issued" value={formatCurrency(loansIssued)} />
              <Metric label="Loans Repaid" value={formatCurrency(loansRepaid)} />
              <Metric label="Outstanding" value={formatCurrency(loansOutstanding)} />
            </div>
            <div className="mt-3 text-xs text-white/50">
              From tables <code>fines</code> &amp; <code>loans</code>.
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium">Attendance Snapshot</h3>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Metric
                label="Present"
                value={formatNumber(attendance.filter((x) => x.status === "present").length)}
              />
              <Metric
                label="Absent"
                value={formatNumber(attendance.filter((x) => x.status === "absent").length)}
              />
              <Metric
                label="On Leave"
                value={formatNumber(attendance.filter((x) => x.status === "leave").length)}
              />
            </div>
            <div className="mt-3 text-xs text-white/50">
              From table <code>attendance</code>.
            </div>
          </Card>
        </div>
      )}

      {tab === "fines" && (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Fines History</h3>
            <div className="text-xs text-white/60">
              Paid: {formatCurrency(finesPaid)} • Unpaid: {formatCurrency(finesUnpaid)}
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Reason</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {fines.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2 pr-4">{f.date ? new Date(f.date).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-4">{f.reason || "—"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide border ${
                          f.status === "paid"
                            ? "border-green-500/30 text-green-300 bg-green-500/10"
                            : "border-yellow-400/30 text-yellow-200 bg-yellow-400/10"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(Number(f.amount || 0))}</td>
                  </tr>
                ))}
                {fines.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-white/60">
                      No fines recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "loans" && (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Loans</h3>
            <div className="text-xs text-white/60">
              Issued: {formatCurrency(loansIssued)} • Repaid: {formatCurrency(loansRepaid)} •{" "}
              <b>Outstanding: {formatCurrency(loansOutstanding)}</b>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Issued</th>
                  <th className="py-2 pr-4 text-right">Repaid</th>
                  <th className="py-2 pr-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loans.map((l) => {
                  const issued = Number(l.amount_issued ?? l.amount ?? 0);
                  const repaid = Number(l.amount_repaid ?? 0);
                  const balance = Math.max(0, issued - repaid);
                  return (
                    <tr key={l.id}>
                      <td className="py-2 pr-4">
                        {l.date ? new Date(l.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 pr-4">{l.description || "—"}</td>
                      <td className="py-2 pr-4">
                        <span className="rounded px-2 py-0.5 text-xs uppercase tracking-wide border border-white/10 bg-white/5">
                          {l.status || "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(issued)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(repaid)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(balance)}</td>
                    </tr>
                  );
                })}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-white/60">
                      No loans recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "attendance" && (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Attendance</h3>
            <div className="text-xs text-white/60">
              {formatNumber(attendance.length)} records
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th className="py-2 pr-4">Meeting</th>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {attendance.map((a) => {
                  const mt = meetingsMap[a.meeting_id];
                  return (
                    <tr key={a.id}>
                      <td className="py-2 pr-4">{mt?.title || `#${a.meeting_id}`}</td>
                      <td className="py-2 pr-4">
                        {mt?.scheduled_for ? new Date(mt.scheduled_for).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide border ${
                            a.status === "present"
                              ? "border-green-500/30 text-green-300 bg-green-500/10"
                              : a.status === "leave"
                              ? "border-yellow-400/30 text-yellow-200 bg-yellow-400/10"
                              : "border-red-500/30 text-red-300 bg-red-500/10"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {attendance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-white/60">
                      No attendance yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** helpers */
function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-5">{children}</div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function TabBtn({
  now,
  setNow,
  me,
  children,
}: {
  now: TabKey;
  setNow: (t: TabKey) => void;
  me: TabKey;
  children: React.ReactNode;
}) {
  const active = now === me;
  return (
    <button
      onClick={() => setNow(me)}
      className={`rounded-lg px-3 py-2 text-sm border ${
        active
          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
