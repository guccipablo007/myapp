'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fmtCFA } from '@/lib/format';

type RangeKey = '12m' | '6m' | '3m';
const RANGE_OPTS: { key: RangeKey; label: string; months: number }[] = [
  { key: '12m', label: 'Last 12 months', months: 12 },
  { key: '6m', label: 'Last 6 months', months: 6 },
  { key: '3m', label: 'Last 3 months', months: 3 },
];

type CashPoint = { month: string; inflow: number; outflow: number };

export default function FinancesPage() {
  const [range, setRange] = useState<RangeKey>('12m');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Tiles
  const [finesCollected, setFinesCollected] = useState(0);
  const [finesUnpaid, setFinesUnpaid] = useState(0);
  const [loansIssued, setLoansIssued] = useState(0);
  const [loansRepaid, setLoansRepaid] = useState(0);
  const [loansOutstanding, setLoansOutstanding] = useState(0);

  // Charts
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [cashFlow, setCashFlow] = useState<CashPoint[]>([]);

  useEffect(() => {
    void loadAll();
  }, [range]);

  async function loadAll() {
    setLoading(true);
    setErr(null);

    const sb = supabase(); // ← get the client instance

    try {
      const months = RANGE_OPTS.find((r) => r.key === range)!.months;
      const fromDate = monthsToStartDate(months);

      // ---- FINES ----
      // expected columns in public.fines:
      // amount (numeric), status ('paid'|'unpaid'), paid_on (date)
      let finesPaidQ = sb.from('fines').select('amount, paid_on, status').eq('status', 'paid');
      if (fromDate) finesPaidQ = finesPaidQ.gte('paid_on', fromDate.toISOString().slice(0, 10));
      const finesPaid = await finesPaidQ;

      const finesUnpaidQ = await sb
        .from('fines')
        .select('amount, status')
        .eq('status', 'unpaid');
      if (finesPaid.error) throw new Error(finesPaid.error.message);
      if (finesUnpaidQ.error) throw new Error(finesUnpaidQ.error.message);

      const finesCollectedSum =
        finesPaid.data?.reduce((t: number, x: any) => t + Number(x.amount ?? 0), 0) ?? 0;
      const finesUnpaidSum =
        finesUnpaidQ.data?.reduce((t: number, x: any) => t + Number(x.amount ?? 0), 0) ?? 0;

      setFinesCollected(finesCollectedSum);
      setFinesUnpaid(finesUnpaidSum);

      // ---- LOANS ----
      // expected columns in public.loans:
      // principal (numeric), issued_on (date), status ('issued'|'repaid'|'outstanding')
      let loansIssuedQ = sb
        .from('loans')
        .select('principal, issued_on, status')
        .in('status', ['issued', 'repaid', 'outstanding']);
      if (fromDate)
        loansIssuedQ = loansIssuedQ.gte('issued_on', fromDate.toISOString().slice(0, 10));
      const loansRows = await loansIssuedQ;
      if (loansRows.error) throw new Error(loansRows.error.message);

      const issued = loansRows.data ?? [];
      const loansIssuedSum = issued.reduce(
        (t: number, r: any) => t + Number(r.principal ?? 0),
        0
      );
      const loansRepaidSum = issued
        .filter((r: any) => r.status === 'repaid')
        .reduce((t: number, r: any) => t + Number(r.principal ?? 0), 0);
      const loansOutstandingSum = issued
        .filter((r: any) => r.status === 'outstanding')
        .reduce((t: number, r: any) => t + Number(r.principal ?? 0), 0);

      setLoansIssued(loansIssuedSum);
      setLoansRepaid(loansRepaidSum);
      setLoansOutstanding(loansOutstandingSum);

      // ---- PIE (composition) ----
      setPieData([
        { name: 'Fines Collected', value: finesCollectedSum },
        { name: 'Outstanding Loans', value: loansOutstandingSum },
      ]);

      // ---- CASH FLOW (per month) ----
      // Inflow: fines paid; Outflow: loans principal (issued+repaid both represent cash leaving when issued;
      // if your accounting treats “repaid” as inflow, switch accordingly).
      const finedPaidByMonth = bucketByMonth(
        finesPaid.data ?? [],
        'paid_on',
        (x: any) => Number(x.amount ?? 0)
      );

      const loansOutflowByMonth = bucketByMonth(
        issued,
        'issued_on',
        (x: any) => Number(x.principal ?? 0)
      );

      // Merge into a single array for selected range
      const monthsKeys = monthsBackKeys(months);
      const flow: CashPoint[] = monthsKeys.map((label) => ({
        month: label,
        inflow: finedPaidByMonth[label] ?? 0,
        outflow: loansOutflowByMonth[label] ?? 0,
      }));

      setCashFlow(flow);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const rangeLabel = RANGE_OPTS.find((r) => r.key === range)!.label;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Overview</h1>
          <p className="text-sm opacity-70">Totals, composition, and monthly cash flow.</p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-60">Range:</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2"
          >
            {RANGE_OPTS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TILES */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Tile label="Fines Collected" value={fmtCFA(finesCollected)} icon="🟩" />
        <Tile label="Fines Unpaid" value={fmtCFA(finesUnpaid)} icon="🟪" />
        <Tile label="Loans Issued" value={fmtCFA(loansIssued)} icon="🏦" />
        <Tile label="Loans Repaid" value={fmtCFA(loansRepaid)} icon="📘" />
        <Tile label="Loans Outstanding" value={fmtCFA(loansOutstanding)} icon="⏳" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PIE */}
        <div className="border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm opacity-70 mb-2">Composition</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(d: any) => `${d.name}: ${fmtCFA(d.value)}`}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#eab308" />
                </Pie>
                <Tooltip formatter={(v: any) => fmtCFA(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm">
            <LegendDot color="#22c55e" label="Fines Collected" />
            <LegendDot color="#eab308" label="Outstanding Loans" />
          </div>
        </div>

        {/* LINE */}
        <div className="border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm opacity-70 mb-2">Monthly Cash Flow</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: any) => fmtCFA(Number(v))}
                  labelFormatter={(label) => `${label} (${rangeLabel})`}
                />
                <Legend />
                <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#eab308" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {err && <div className="text-sm text-red-400">Error: {err}</div>}
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <div className="text-sm opacity-70 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="inline-block w-3 h-3 rounded" style={{ background: color }} />
      {label}
    </div>
  );
}

/* ---------- helpers ---------- */

function monthsToStartDate(months: number): Date | null {
  const d = new Date();
  // go to first day of this month, then back (months-1)
  d.setDate(1);
  d.setMonth(d.getMonth() - (months - 1));
  return d;
}

function labelOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthsBackKeys(months: number): string[] {
  const now = new Date();
  const arr: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(labelOf(d));
  }
  return arr;
}

function bucketByMonth(
  rows: any[],
  dateField: string,
  amountGetter: (row: any) => number
): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const raw = r[dateField];
    if (!raw) return;
    // support 'YYYY-MM-DD' or Date
    const d = typeof raw === 'string' ? new Date(raw) : (raw as Date);
    if (isNaN(d.getTime())) return;
    const k = labelOf(new Date(d.getFullYear(), d.getMonth(), 1));
    map[k] = (map[k] ?? 0) + amountGetter(r);
  });
  return map;
}
