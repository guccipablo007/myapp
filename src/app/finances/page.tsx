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

/** ───────────────────────────────────────────────────────────────────────────
 *  Types (keep loose on dates because table columns may differ across installs)
 *  fines:   amount numeric, status 'paid'|'unpaid', date column could be 'created_at' or 'date'
 *  loans:   principal numeric, status 'repaid'|'active'|'defaulted', date column is usually 'issued_on'
 *  If your column names differ, tweak the `pickDate()` usage below.
 *  ─────────────────────────────────────────────────────────────────────────── */

type Fine = {
  amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  date?: string | null;
  paid_on?: string | null;
};

type Loan = {
  principal?: number | null;
  status?: string | null;
  issued_on?: string | null;
  created_at?: string | null;
};

type RangeKey = '6m' | '12m' | '24m';

const COLORS = ['#22c55e', '#eab308', '#60a5fa', '#f43f5e', '#a78bfa'];

export default function FinancesPage() {
  const sb = supabase();

  const [range, setRange] = useState<RangeKey>('12m');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [fines, setFines] = useState<Fine[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);

    // pull only the fields we actually use (safe if columns are missing)
    const [fRes, lRes] = await Promise.all([
      sb.from('fines').select('amount, status, created_at, date, paid_on'),
      sb.from('loans').select('principal, status, issued_on, created_at'),
    ]);

    setLoading(false);

    if (fRes.error) setErr(fRes.error.message);
    if (lRes.error) setErr(prev => prev ?? lRes.error?.message ?? null);

    setFines((fRes.data ?? []) as Fine[]);
    setLoans((lRes.data ?? []) as Loan[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ───────────────────────────── helpers ───────────────────────────── */

  function pickDate(obj: any, keys: string[]): Date | null {
    for (const k of keys) {
      const v = obj?.[k];
      if (v) {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    return null;
  }

  function ym(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthsBack(n: number) {
    const out: string[] = [];
    const base = new Date();
    base.setDate(1);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setMonth(d.getMonth() - i);
      out.push(ym(d));
    }
    return out;
  }

  /** ───────────────────────────── summaries ───────────────────────────── */

  const totals = useMemo(() => {
    const finesPaid = fines.reduce((t, f) => t + (f.status === 'paid' ? Number(f.amount ?? 0) : 0), 0);
    const finesUnpaid = fines.reduce((t, f) => t + (f.status === 'unpaid' ? Number(f.amount ?? 0) : 0), 0);

    const loansIssued = loans.reduce((t, l) => t + Number(l.principal ?? 0), 0);
    const loansRepaid = loans.reduce((t, l) => t + (l.status === 'repaid' ? Number(l.principal ?? 0) : 0), 0);
    const loansOutstanding = Math.max(0, loansIssued - loansRepaid);

    return { finesPaid, finesUnpaid, loansIssued, loansRepaid, loansOutstanding };
  }, [fines, loans]);

  /** ───────── pie data: composition (Collected vs Outstanding) ──────── */
  const pieData = useMemo(
    () => [
      { name: 'Fines Collected', value: totals.finesPaid },
      { name: 'Outstanding Loans', value: totals.loansOutstanding },
    ],
    [totals]
  );

  /** ───────── monthly cashflow data (Inflow vs Outflow) ─────────
   *  inflow  = finesPaid(month) + loansRepaid(month)
   *  outflow = loansIssued(month)
   */
  const cashData = useMemo(() => {
    const months = monthsBack(range === '6m' ? 6 : range === '12m' ? 12 : 24);

    const byMonth = new Map<string, { inflow: number; outflow: number }>();
    months.forEach(m => byMonth.set(m, { inflow: 0, outflow: 0 }));

    // Fines inflow (paid)
    for (const f of fines) {
      if (f.status !== 'paid') continue;
      const d = pickDate(f, ['paid_on', 'date', 'created_at']);
      if (!d) continue;
      const key = ym(d);
      if (!byMonth.has(key)) continue;
      byMonth.get(key)!.inflow += Number(f.amount ?? 0);
    }

    // Loans issued (outflow)
    for (const l of loans) {
      const d = pickDate(l, ['issued_on', 'created_at']);
      if (!d) continue;
      const key = ym(d);
      if (!byMonth.has(key)) continue;
      byMonth.get(key)!.outflow += Number(l.principal ?? 0);
    }

    // Loans repaid (inflow) — if you track repayment dates in another table,
    // replace this with that source. Here we assume status 'repaid' means
    // it was repaid on issued_on month (best effort).
    for (const l of loans) {
      if (l.status !== 'repaid') continue;
      const d = pickDate(l, ['issued_on', 'created_at']);
      if (!d) continue;
      const key = ym(d);
      if (!byMonth.has(key)) continue;
      byMonth.get(key)!.inflow += Number(l.principal ?? 0);
    }

    return months.map(m => ({ month: m, ...byMonth.get(m)! }));
  }, [fines, loans, range]);

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Financial Overview</h1>
          <p className="text-sm text-zinc-400">Totals, composition, and monthly cash flow.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Range:</label>
          <select
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-2"
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
          >
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
            <option value="24m">Last 24 months</option>
          </select>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid md:grid-cols-5 gap-3 mt-4">
        <Tile label="💵 Fines Collected" value={totals.finesPaid} />
        <Tile label="🧾 Fines Unpaid" value={totals.finesUnpaid} />
        <Tile label="🏦 Loans Issued" value={totals.loansIssued} />
        <Tile label="💳 Loans Repaid" value={totals.loansRepaid} />
        <Tile label="⏳ Loans Outstanding" value={totals.loansOutstanding} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-950/60">
          <h3 className="font-medium mb-2">Composition</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => Number(v).toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-950/60">
          <h3 className="font-medium mb-2">Monthly Cash Flow</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeOpacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: any) => Number(v).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#eab308" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {loading && <p className="mt-3 text-sm text-zinc-400">Loading…</p>}
      {err && <p className="mt-3 text-sm text-red-400">Error: {err}</p>}
    </main>
  );
}

/* ───────────────────────── small UI bits ───────────────────────── */

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-800 rounded p-3 bg-zinc-950/60">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-xl font-semibold">{Number(value).toLocaleString()} CFA</div>
    </div>
  );
}
