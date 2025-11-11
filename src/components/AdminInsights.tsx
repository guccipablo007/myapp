// src/components/AdminInsights.tsx
import { formatCurrency, formatNumber } from "@/lib/format";
import { supabase as supabaseMaybe, SupabaseClient } from "@/lib/supabase";

function sb(): SupabaseClient {
  const maybe: unknown = supabaseMaybe;
  if (typeof maybe === "function") {
    return maybe();
  }
  return maybe as SupabaseClient;
}
const toNum = (x: unknown) => (typeof x === "number" ? x : parseFloat(String(x ?? 0))) || 0;

function pickDate(row: Record<string, unknown>, fields: string[]): Date | null {
  for (const f of fields) {
    const v = row?.[f];
    if (!v) continue;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export default async function AdminInsights() {
  const s = sb();

  // Members
  let totalMembers = 0,
    activeMembers = 0;
  try {
    const all = await s.from("members").select("*", { count: "exact", head: true });
    if (!all.error) totalMembers = all.count ?? 0;
  } catch {}
  try {
    const act = await s.from("members").select("*", { count: "exact", head: true }).eq("status", "active");
    if (!act.error) activeMembers = act.count ?? 0;
  } catch {}

  // Last 30 days
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceISO = since.toISOString().slice(0, 10);

  // Fines
  let finesCollected30d = 0,
    finesUnpaid = 0;
  try {
    const fpaid = await s
      .from("fines")
      .select("amount,status,paid_on,created_at")
      .eq("status", "paid");
    if (!fpaid.error && fpaid.data) {
      for (const r of fpaid.data) {
        const d = pickDate(r, ["paid_on", "created_at"]);
        if (d && d >= new Date(sinceISO)) finesCollected30d += toNum(r.amount);
      }
    }
  } catch {}
  try {
    const funpaid = await s.from("fines").select("amount,status").eq("status", "unpaid");
    if (!funpaid.error && funpaid.data) {
      finesUnpaid = funpaid.data.reduce((t: number, r: { amount: unknown }) => t + toNum(r.amount), 0);
    }
  } catch {}

  // Loans
  let loansIssued30d = 0,
    loansRepaid30d = 0,
    loansOutstanding = 0;
  try {
    const lq = await s
      .from("loans")
      .select("amount,amount_issued,amount_repaid,status,issued_on,repaid_on,created_at");
    if (!lq.error && lq.data) {
      for (const r of lq.data) {
        const issued = toNum(r.amount_issued ?? r.amount);
        const repaid = toNum(r.amount_repaid);
        const issuedDate = pickDate(r, ["issued_on", "created_at"]);
        const repaidDate = pickDate(r, ["repaid_on"]);
        if (issuedDate && issuedDate >= new Date(sinceISO)) loansIssued30d += issued;
        if (repaidDate && repaidDate >= new Date(sinceISO)) loansRepaid30d += (repaid || issued);
        const st = String(r.status || "").toLowerCase();
        if (["active", "outstanding", "issued"].includes(st)) {
          const bal = issued - repaid;
          loansOutstanding += bal > 0 ? bal : 0;
        }
      }
    }
  } catch {}

  // Next meeting
  let nextMeeting: { title: string; when: string } | null = null;
  try {
    const mq = await s
      .from("meetings")
      .select("title, scheduled_for, date, created_at")
      .gte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(1);
    if (!mq.error && mq.data?.[0]) {
      const row = mq.data[0];
      const d = pickDate(row, ["scheduled_for", "date", "created_at"]);
      nextMeeting = { title: row.title ?? 'Untitled', when: d ? d.toLocaleString() : "-" };
    }
  } catch {}

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Admin Insights</h2>
        <span className="text-[11px] text-white/50">Last 30 days</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          label="Members"
          value={`${formatNumber(totalMembers)} total`}
          hint={`${formatNumber(activeMembers)} active`}
          tooltip="Counts from members table."
        />
        <Card
          label="Fines"
          value={formatCurrency(finesCollected30d)}
          hint={`${formatCurrency(finesUnpaid)} unpaid`}
          tooltip="Paid in last 30 days; unpaid = status 'unpaid'."
        />
        <Card
          label="Loans"
          value={formatCurrency(loansIssued30d)}
          hint={`${formatCurrency(loansRepaid30d)} repaid • ${formatCurrency(loansOutstanding)} outstanding`}
          tooltip="Issued/repaid in last 30 days; outstanding = issued - repaid for active loans."
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Next Meeting</div>
        {nextMeeting ? (
          <>
            <div className="text-white/90 mt-1">{nextMeeting.title}</div>
            <div className="text-xs text-white/60">{nextMeeting.when}</div>
          </>
        ) : (
          <div className="text-sm text-white/60 mt-1">No upcoming meetings.</div>
        )}
      </div>

      <p className="text-[11px] text-white/40">
        Data: <code>members</code>, <code>fines</code>, <code>loans</code>, <code>meetings</code>.
      </p>
    </section>
  );
}

function Card({
  label,
  value,
  hint,
  tooltip,
}: {
  label: string;
  value: string;
  hint?: string;
  tooltip?: string;
}) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-black/20 p-4 hover:border-white/20 transition-colors"
      title={tooltip}
    >
      <div className="text-sm text-white/70">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-white/60 mt-1">{hint}</div> : null}
    </div>
  );
}
