// src/app/finances/page.tsx
import { formatCurrency } from "@/lib/format";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { MonthlyInOutChart, CompositionChart } from "./ClientCharts";
import ClientFinesTable from "./ClientFinesTable";
import { SupabaseClient } from "@supabase/supabase-js";

// Works whether you export a Supabase client or a factory function
function sb(): SupabaseClient {
  const maybe: unknown = supabaseMaybe;
  if (typeof maybe === "function") {
    return maybe();
  }
  return maybe as SupabaseClient;
}

/** Try multiple date fields gracefully (schema evolved during build) */
function pickDate(row: Record<string, unknown>, fields: string[]): Date | null {
  for (const f of fields) {
    const val = row?.[f];
    if (!val) continue;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** YYYY-MM label */
function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Build an array of the last N months (labels only) */
function lastNMonths(n = 12): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(base.getMonth() - i);
    out.push(ym(d));
  }
  return out;
}

/** safe numeric */
const toNum = (x: unknown) => (typeof x === "number" ? x : parseFloat(String(x ?? 0))) || 0;

export default async function FinancePage() {
  const s = sb();

  // ------- Fetch raw rows (columns are flexible to match your DB) -------
  const [finesRes, loansRes] = await Promise.all([
    s.from("fines").select("amount,status,paid_on,issued_on,created_at"),
    s
      .from("loans")
      .select("amount,amount_repaid,status,issued_on,repaid_on,created_at"),
  ]);

  if (finesRes.error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Financial Overview</h1>
        <p className="text-red-400">Error (fines): {finesRes.error.message}</p>
      </div>
    );
  }
  if (loansRes.error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Financial Overview</h1>
        <p className="text-red-400">Error (loans): {loansRes.error.message}</p>
      </div>
    );
  }

  const fines = finesRes.data ?? [];
  const loans = loansRes.data ?? [];

  // ------- Totals -------
  const finesPaid = fines
    .filter((f: { status: unknown }) => (f.status ?? "").toString().toLowerCase() === "paid")
    .reduce((acc: number, f: { amount: unknown }) => acc + toNum(f.amount), 0);

  const finesUnpaid = fines
    .filter((f: { status: unknown }) => (f.status ?? "").toString().toLowerCase() === "unpaid")
    .reduce((acc: number, f: { amount: unknown }) => acc + toNum(f.amount), 0);

  const loansIssued = loans.reduce((acc: number, r: { status: unknown; amount: unknown }) => {
    const st = (r.status ?? "").toString().toLowerCase();
    if (["issued", "active", "outstanding"].includes(st)) acc += toNum(r.amount);
    return acc;
  }, 0);

  const loansRepaid = loans.reduce((acc: number, r: { status: unknown; amount_repaid: unknown; amount: unknown }) => {
    const st = (r.status ?? "").toString().toLowerCase();
    if (st === "repaid") acc += toNum(r.amount_repaid ?? r.amount);
    return acc;
  }, 0);

  const loansOutstanding = loans.reduce((acc: number, r: { status: unknown; amount: unknown }) => {
    const st = (r.status ?? "").toString().toLowerCase();
    if (["active", "outstanding"].includes(st)) acc += toNum(r.amount);
    return acc;
  }, 0);

  const outstandingDues = finesUnpaid + loansOutstanding;

  // ------- Composition blocks (left chart) -------
  const composition = [
    { name: "Fines Collected", value: finesPaid },
    { name: "Outstanding Loans", value: loansOutstanding },
  ];

  // ------- Monthly time series (right chart) -------
  const months = lastNMonths(12);
  const m = new Map(months.map((k) => [k, { month: k, inflow: 0, outflow: 0 }]));

  // Inflow: fines paid_on + loans repaid_on
  for (const f of fines) {
    if ((f.status ?? "").toLowerCase() !== "paid") continue;
    const d = pickDate(f, ["paid_on", "created_at", "issued_on"]);
    if (!d) continue;
    const k = ym(d);
    if (!m.has(k)) continue;
    m.get(k)!.inflow += toNum(f.amount);
  }
  for (const l of loans) {
    if ((l.status ?? "").toLowerCase() !== "repaid") continue;
    const d = pickDate(l, ["repaid_on", "created_at"]);
    if (!d) continue;
    const k = ym(d);
    if (!m.has(k)) continue;
    m.get(k)!.inflow += toNum(l.amount_repaid ?? l.amount);
  }

  // Outflow: loans issued_on
  for (const l of loans) {
    const st = (l.status ?? "").toLowerCase();
    if (!["issued", "active", "outstanding"].includes(st)) continue;
    const d = pickDate(l, ["issued_on", "created_at"]);
    if (!d) continue;
    const k = ym(d);
    if (!m.has(k)) continue;
    m.get(k)!.outflow += toNum(l.amount);
  }

  const monthly = months.map((k) => m.get(k)!);

  // ------- UI -------
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Financial Overview</h1>
        <div className="text-xs text-neutral-400">Range: Last 12 months</div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard title="Fines Collected" value={formatCurrency(finesPaid)} hint="Paid fines" />
        <MetricCard title="Loans Issued" value={formatCurrency(loansIssued)} hint="Disbursed principal" />
        <MetricCard title="Loans Repaid" value={formatCurrency(loansRepaid)} hint="Recovered principal" />
        <MetricCard title="Loans Outstanding" value={formatCurrency(loansOutstanding)} hint="Active balances" />
        <MetricCard title="Outstanding Dues" value={formatCurrency(outstandingDues)} hint="Unpaid fines + active loans" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompositionChart data={composition} />
        <MonthlyInOutChart data={monthly} />
      </div>

      {/* Admin actions for fines */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fines Admin</h2>
        <p className="text-sm text-white/60">
          Issue fines (Secretary/SysAdmin), and mark fines as <em>Paid</em> when received.
          These updates reflect here and on the Dashboard automatically.
        </p>
        <ClientFinesTable />
      </section>

      {/* Footer note */}
      <div className="text-xs text-neutral-500">
        Data derived directly from <code>fines</code> and <code>loans</code> (fields tolerated:{" "}
        <code>amount</code>, <code>status</code>, <code>paid_on</code>, <code>issued_on</code>,{" "}
        <code>repaid_on</code>, <code>amount_repaid</code>, <code>created_at</code>).
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 p-4">
      <div className="text-sm text-neutral-400">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-neutral-500 mt-1">{hint}</div> : null}
    </div>
  );
}
