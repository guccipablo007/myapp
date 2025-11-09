'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmtCFA } from '@/lib/format';
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
  LabelList,
} from 'recharts';

type RangeKey = '3m' | '6m' | '12m' | '24m' | 'all';

type Totals = {
  finesCollected: number;
  finesUnpaid: number;
  loansIssued: number;
  loansRepaid: number;
  loansOutstanding: number;
};

type Monthly = { month: string; inflow: number; outflow: number };

const RANGE_OPTIONS: { label: string; value: RangeKey }[] = [
  { label: 'Last 3 months', value: '3m' },
  { label: 'Last 6 months', value: '6m' },
  { label: 'Last 12 months', value: '12m' },
  { label: 'Last 24 months', value: '24m' },
  { label: 'All time', value: 'all' },
];

function rangeStart(k: RangeKey): Date | null {
  const d = new Date();
  if (k === 'all') return null;
  if (k === '3m') d.setMonth(d.getMonth() - 3);
  if (k === '6m') d.setMonth(d.getMonth() - 6);
  if (k === '12m') d.setMonth(d.getMonth() - 12);
  if (k === '24m') d.setMonth(d.getMonth() - 24);
  // normalize to first day of month for cleaner grouping
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded bg-zinc-900/90 border border-zinc-700 px-3 py-2 text-sm">
      {label && <div className="opacity-70 mb-1">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-6">
          <span className="opacity-80">{p.name}</span>
          <span className="font-medium">{fmtCFA(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function FinancesPage() {
  const [range, setRange] = useState<RangeKey>('12m');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [totals, setTotals] = useState<Totals>({
    finesCollected: 0,
    finesUnpaid: 0,
    loansIssued: 0,
    loansRepaid: 0,
    loansOutstanding: 0,
  });

  const [monthly, setMonthly] = useState<Monthly[]>([]);

  const fromDate = useMemo(() => rangeStart(range), [range]);
  const rangeLabel = useMemo(
    () => RANGE_OPTIONS.find((o) => o.value === range)?.label ?? 'Range',
    [range]
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      // ----- FINES -----
      // expected columns in public.fines:
      // amount (numeric), status ('paid'|'unpaid'), paid_on (date)
      let finesPaidQ = supabase.from('fines').select('amount, paid_on, status').eq('status', 'paid');
      if (fromDate) finesPaidQ = finesPaidQ.gte('paid_on', fromDate.toISOString().slice(0, 10));
      const finesPaid = await finesPaidQ;

      const finesUnpaid = await supabase
        .from('fines')
        .select('amount, status')
        .eq('status', 'unpaid');

      // ----- LOANS -----
      // expected columns in public.loans:
      // principal (numeric), status ('repaid'|'active'|'outstanding'), issued_on (date)
      let loansIssuedQ = supabase
        .from('loans')
        .select('principal, issued_on, status');
      if (fromDate) loansIssuedQ = loansIssuedQ.gte('issued_on', fromDate.toISOString().slice(0, 10));
      const loansIssued = await loansIssuedQ;

      const loansRepaid = await supabase
        .from('loans')
        .select('principal, status')
        .eq('status', 'repaid');

      const loansOutstanding = await supabase
        .from('loans')
        .select('principal, status')
        .neq('status', 'repaid');

      if (finesPaid.error) throw new Error(finesPaid.error.message);
      if (finesUnpaid.error) throw new Error(finesUnpaid.error.message);
      if (loansIssued.error) throw new Error(loansIssued.error.message);
      if (loansRepaid.error) throw new Error(loansRepaid.error.message);
      if (loansOutstanding.error) throw new Error(loansOutstanding.error.message);

      const t: Totals = {
        finesCollected:
          finesPaid.data?.reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0) ?? 0,
        finesUnpaid:
          finesUnpaid.data?.reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0) ?? 0,
        loansIssued:
          loansIssued.data?.reduce((sum: number, r: any) => sum + Number(r.principal ?? 0), 0) ?? 0,
        loansRepaid:
          loansRepaid.data?.reduce((sum: number, r: any) => sum + Number(r.principal ?? 0), 0) ??
          0,
        loansOutstanding:
          loansOutstanding.data?.reduce(
            (sum: number, r: any) => sum + Number(r.principal ?? 0),
            0
          ) ?? 0,
      };
      setTotals(t);

      // ----- MONTHLY CASH FLOW -----
      // inflow: paid fines; outflow: loans issued
      const map = new Map<string, { inflow: number; outflow: number }>();

      finesPaid.data?.forEach((r: any) => {
        const key = (r.paid_on ?? '').slice(0, 7); // YYYY-MM
        if (!key) return;
        const row = map.get(key) ?? { inflow: 0, outflow: 0 };
        row.inflow += Number(r.amount ?? 0);
        map.set(key, row);
      });

      loansIssued.data?.forEach((r: any) => {
        const key = (r.issued_on ?? '').slice(0, 7);
        if (!key) return;
        const row = map.get(key) ?? { inflow: 0, outflow: 0 };
        row.outflow += Number(r.principal ?? 0);
        map.set(key, row);
      });

      // sort by month asc
      const sorted = [...map.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([month, v]) => ({ month, ...v }));
      setMonthly(sorted);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  // PIE (composition)
  const pieData = [
    { name: 'Fines Collected', value: totals.finesCollected || 0, color: COLORS.green },
    { name: 'Outstanding Loans', value: totals.loansOutstanding || 0, color: COLORS.yellow },
  ];
  const showPie = pieData.some((d) => d.value > 0);

  // LINE (monthly inflow/outflow)
  const hasMonthly = monthly.some((m) => (m.inflow ?? 0) !== 0 || (m.outflow ?? 0) !== 0);

  function exportCSV() {
    const rows = monthly.map((m) => ({
      Month: m.month,
      Inflow: m.inflow,
      Outflow: m.outflow,
    }));
    const csv =
      ['Month,Inflow,Outflow', ...rows.map((r) => [r.Month, r.Inflow, r.Outflow].join(','))].join(
        '\n'
      );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finances_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Financial Overview</h1>
          <p className="text-sm opacity-70">
            Totals, composition, and monthly cash flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Range:</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded border border-zinc-700 hover:bg-zinc-800 text-sm"
            title="Export monthly cash flow to CSV"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard title="Fines Collected" value={fmtCFA(totals.finesCollected)} icon="🟩" />
        <MetricCard title="Fines Unpaid" value={fmtCFA(totals.finesUnpaid)} icon="🟪" />
        <MetricCard title="Loans Issued" value={fmtCFA(totals.loansIssued)} icon="🏦" />
        <MetricCard title="Loans Repaid" value={fmtCFA(totals.loansRepaid)} icon="💳" />
        <MetricCard title="Loans Outstanding" value={fmtCFA(totals.loansOutstanding)} icon="⏳" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Composition (Pie) */}
        <div className="border border-zinc-800 rounded-xl p-4">
          <h3 className="font-medium mb-3">Composition</h3>
          <div className="h-[360px] w-full">
            {showPie ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    isAnimationActive={false}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                    <LabelList position="outside" formatter={(v: number) => (v ? fmtCFA(v) : '')} />
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm opacity-70">
                No composition data in the selected range.
              </div>
            )}
          </div>
          <div className="flex gap-6 mt-3 text-sm">
            <LegendDot color={COLORS.green} label="Fines Collected" />
            <LegendDot color={COLORS.yellow} label="Outstanding Loans" />
          </div>
        </div>

        {/* Monthly Cash Flow (Line) */}
        <div className="border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Monthly Cash Flow</h3>
            <span className="text-xs opacity-60">{rangeLabel}</span>
          </div>
          <div className="h-[360px] w-full">
            {hasMonthly ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => fmtCFA(v).replace(/\s?CFA/i, '')} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="inflow" name="Inflow" stroke={COLORS.green} dot={false} />
                  <Line type="monotone" dataKey="outflow" name="Outflow" stroke={COLORS.yellow} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm opacity-70">
                No monthly activity in the selected range.
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm opacity-70">Loading…</div>
      )}
      {err && <div className="text-sm text-red-400">Error: {err}</div>}
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon?: string }) {
  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <div className="text-sm opacity-70 flex items-center gap-2">
        {icon && <span aria-hidden="true">{icon}</span>}
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
      <span className="opacity-80">{label}</span>
    </div>
  );
}
