import { formatCurrency } from '@/lib/format';
import { supabase as supabaseMaybe } from '@/lib/supabase';
import { MonthlyInOutChart, CompositionChart } from './ClientCharts';
import ClientFinesTable from './ClientFinesTable';

/* ------------------------------ Supabase helper ------------------------------ */
// Supports both shapes of the supabase export in your project (factory or client)
function sb() {
  // @ts-expect-error – support function export or client object
  const s = typeof supabaseMaybe === 'function' ? supabaseMaybe() : supabaseMaybe;
  return s;
}

/* ------------------------------- Date helpers -------------------------------- */
function pickDate(row: Record<string, any>, fields: string[]): Date | null {
  for (const f of fields) {
    const val = row?.[f];
    if (!val) continue;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
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
const toNum = (x: any) => (typeof x === 'number' ? x : parseFloat(x ?? 0)) || 0;

/* ============================== Server component ============================= */
export default async function FinancePage() {
  const s = sb();

  // --- fetch raw rows used for metrics/charts (tolerant columns) ---
  const [finesRes, loansRes] = await Promise.all([
    s.from('fines').select('amount,status,paid_on,issued_on,created_at'),
    s.from('loans').select('amount,amount_repaid,status,issued_on,repaid_on,created_at'),
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

  // --- totals ---
  const finesPaid = fines
    .filter((f: any) => (f.status ?? '').toLowerCase() === 'paid')
    .reduce((acc: number, f: any) => acc + toNum(f.amount), 0);

  const finesUnpaid = fines
    .filter((f: any) => (f.status ?? '').toLowerCase() === 'unpaid')
    .reduce((acc: number, f: any) => acc + toNum(f.amount), 0);

  const loansIssued = loans.reduce((acc: number, r: any) => {
    const st = (r.status ?? '').toLowerCase();
    if (['issued', 'active', 'outstanding'].includes(st)) acc += toNum(r.amount);
    return acc;
  }, 0);

  const loansRepaid = loans.reduce((acc: number, r: any) => {
    const st = (r.status ?? '').toLowerCase();
    if (st === 'repaid') acc += toNum(r.amount_repaid ?? r.amount);
    return acc;
  }, 0);

  const loansOutstanding = loans.reduce((acc: number, r: any) => {
    const st = (r.status ?? '').toLowerCase();
    if (['active', 'outstanding'].includes(st)) acc += toNum(r.amount);
    return acc;
  }, 0);

  // outstanding dues on top cards if you need it:
  // const outstandingDues = finesUnpaid + loansOutstanding;

  // --- composition (left chart) ---
  const composition = [
    { name: 'Fines Collected', value: finesPaid },
    { name: 'Outstanding Loans', value: loansOutstanding },
  ];

  // --- monthly time series (right chart) ---
  const months = lastNMonths(12);
  const m = new Map(months.map((k) => [k, { month: k, inflow: 0, outflow: 0 }]));

  // Inflow: fines paid_on + loans repaid_on
  for (const f of fines) {
    if ((f.status ?? '').toLowerCase() !== 'paid') continue;
    const d = pickDate(f, ['paid_on', 'created_at', 'issued_on']);
    if (!d) continue;
    const k = ym(d);
    if (!m.has(k)) continue;
    m.get(k)!.inflow += toNum(f.amount);
  }
  for (const l of loans) {
    if ((l.status ?? '').toLowerCase() !== 'repaid') continue;
    const d = pickDate(l, ['repaid_on', 'created_at']);
    if (!d) continue;
    const k = ym(d);
    if (!m.has(k)) continue;
    m.get(k)!.inflow += toNum(l.amount_repaid ?? l.amount);
  }

  // Outflow: loans issued_on
  for (const l of loans) {
    const st = (l.status ?? '').toLowerCase();
    if (!['issued', 'active', 'outstanding'].includes(st)) continue;
    const d = pickDate(l, ['issued_on', 'created_at']);
    if (!d) continue;
    const k = ym(d);
    if (!m.has(k)) continue;
    m.get(k)!.outflow += toNum(l.amount);
  }

  const monthly = months.map((k) => m.get(k)!);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Financial Overview</h1>
        <div className="text-xs text-neutral-400">Range: Last 12 months</div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Fines Collected" value={formatCurrency(finesPaid, 'XAF')} hint="Paid fines" />
        <MetricCard title="Loans Issued" value={formatCurrency(loansIssued, 'XAF')} hint="Disbursed principal" />
        <MetricCard title="Loans Repaid" value={formatCurrency(loansRepaid, 'XAF')} hint="Recovered principal" />
        <MetricCard title="Loans Outstanding" value={formatCurrency(loansOutstanding, 'XAF')} hint="Active balances" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompositionChart data={composition} />
        <MonthlyInOutChart data={monthly} />
      </div>

      {/* Client-side fines table + actions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fines (Admin Controls)</h2>
          <div className="text-xs text-neutral-500">
            Mark Paid / Disburse / View History — (sysadmin &amp; secretary only)
          </div>
        </div>
        <ClientFinesTable />
      </section>
    </div>
  );
}

/* ---------------------------------- UI bits --------------------------------- */
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
