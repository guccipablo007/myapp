'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Tile = { label: string; value: number; };
type Tx = { id: number; kind: string; amount: number; note: string | null; occurred_on: string; };

export default function FinancesPage() {
  const sb = supabase();

  const [tiles, setTiles] = useState<Tile[]>([
    { label: '💵 Total Fines Collected', value: 0 },
    { label: '🧾 Loans Issued', value: 0 },
    { label: '💳 Loans Repaid', value: 0 },
    { label: '🧱 Funds for Projects', value: 0 },
  ]);

  const [latest, setLatest] = useState<Tx[]>([]);
  const [mix, setMix] = useState<{ fines: number; loans: number }>({ fines: 0, loans: 0 });
  const [series, setSeries] = useState<{ ym: string; net_amount: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);

    // SUMMARY
    const [{ data: finesPaid }, { data: loansIssued }, { data: loansRepaid }, { data: projectFunds }] = await Promise.all([
      sb.rpc('sql', { query: "select coalesce(sum(amount),0) as s from public.fines where status='paid';" } as any), // fallback trick
      sb.rpc('sql', { query: "select coalesce(sum(principal),0) as s from public.loans;" } as any),
      sb.rpc('sql', { query: "select coalesce(sum(amount),0) as s from public.loan_repayments;" } as any),
      sb.rpc('sql', { query: "select coalesce(sum(amount),0) as s from public.transactions where kind='project_fund';" } as any),
    ]).catch(() => [{ data: [{ s: 0 }] }, { data: [{ s: 0 }] }, { data: [{ s: 0 }] }, { data: [{ s: 0 }] }] as any);

    const t = [
      { label: '💵 Total Fines Collected', value: Number((finesPaid?.[0]?.s ?? 0)) },
      { label: '🧾 Loans Issued',        value: Number((loansIssued?.[0]?.s ?? 0)) },
      { label: '💳 Loans Repaid',        value: Number((loansRepaid?.[0]?.s ?? 0)) },
      { label: '🧱 Funds for Projects',  value: Number((projectFunds?.[0]?.s ?? 0)) },
    ];
    setTiles(t);

    // MIX for pie
    setMix({ fines: t[0].value, loans: t[1].value });

    // LATEST TRANSACTIONS
    const { data: tx } = await sb.from('transactions').select('*').order('occurred_on', { ascending: false }).limit(10);
    setLatest((tx ?? []) as Tx[]);

    // MONTHLY CASH FLOW
    const { data: flow } = await sb.from('v_monthly_cashflow').select('*');
    setSeries((flow ?? []) as any);
  }

  useEffect(() => {
    load();
  }, []);

  // pie geometry (very simple)
  const pie = useMemo(() => {
    const total = Math.max(1, mix.fines + mix.loans);
    const a = (mix.fines / total) * 2 * Math.PI;
    return { a, total };
  }, [mix]);

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Financial Overview</h1>
      <p className="text-sm text-zinc-400">Fines, loans, repayments and project funds at a glance.</p>

      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}

      {/* Tiles */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400">{t.label}</div>
            <div className="text-xl font-semibold">{t.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {/* Pie chart: fines vs loans */}
        <div className="border border-zinc-800 rounded p-4">
          <div className="font-semibold mb-2">Fines vs Loans</div>
          <svg viewBox="0 0 100 100" className="w-full max-w-xs">
            {/* background circle (loans) */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="18" />
            {/* arc for fines */}
            <path
              d={describeArc(50, 50, 40, 0, (pie.a * 180) / Math.PI)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="18"
              strokeLinecap="butt"
            />
          </svg>
          <div className="mt-2 text-sm text-zinc-400">
            <span className="inline-block w-3 h-3 mr-1 align-middle" style={{ background: '#f59e0b' }}></span>Fines:{' '}
            {mix.fines.toLocaleString()} &nbsp; | &nbsp;
            <span className="inline-block w-3 h-3 mr-1 align-middle" style={{ background: '#3b82f6' }}></span>Loans:{' '}
            {mix.loans.toLocaleString()}
          </div>
        </div>

        {/* Line chart: monthly cash flow */}
        <div className="border border-zinc-800 rounded p-4">
          <div className="font-semibold mb-2">Monthly Cash Flow (last 12 months)</div>
          <div className="h-40 relative">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {/* axis */}
              <line x1="0" y1="20" x2="100" y2="20" stroke="#27272a" strokeWidth="0.5" />
              {/* line */}
              <polyline
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.5"
                points={linePoints(series)}
              />
            </svg>
          </div>
          <div className="mt-2 text-xs text-zinc-400 grid grid-cols-6 gap-2">
            {series.map((p) => (
              <span key={p.ym}>{p.ym}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Latest transactions */}
      <div className="mt-6 overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Date</th><th>Type</th><th>Amount</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {latest.length === 0 && <tr><td colSpan={4} className="px-3 py-3">No transactions</td></tr>}
            {latest.map((x) => (
              <tr key={x.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                <td className="px-3 py-2">{x.occurred_on}</td>
                <td className="px-3 py-2">{x.kind}</td>
                <td className="px-3 py-2">{Number(x.amount).toLocaleString()}</td>
                <td className="px-3 py-2">{x.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add transaction (sysadmin only) */}
      <AddTransaction onAdded={load} />
    </main>
  );
}

/* ---------- helpers (inline, no external libs) ---------- */

function describeArc(x: number, y: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, r, endAngle);
  const end = polarToCartesian(x, y, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}
function polarToCartesian(x: number, y: number, r: number, angleInDegrees: number) {
  const a = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return { x: x + r * Math.cos(a), y: y + r * Math.sin(a) };
}
function linePoints(series: { ym: string; net_amount: number }[]) {
  if (!series || series.length === 0) return '';
  const max = Math.max(...series.map((s) => s.net_amount), 1);
  const min = Math.min(...series.map((s) => s.net_amount), 0);
  const span = Math.max(1, max - min);
  return series
    .map((s, i) => {
      const x = (i / Math.max(1, series.length - 1)) * 100;
      const y = 20 - ((s.net_amount - min) / span) * 18; // center around midline
      return `${x},${y}`;
    })
    .join(' ');
}

/* ---- AddTransaction subcomponent ---- */
function AddTransaction({ onAdded }: { onAdded: () => void }) {
  const sb = supabase();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'fine'|'loan_issue'|'loan_repay'|'project_fund'|'other'>('other');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const val = Number(amount);
    if (isNaN(val) || val < 0) return setErr('Enter a valid amount.');
    const { error } = await sb.from('transactions').insert({ kind, amount: val, note: note.trim() || null });
    if (error) return setErr(error.message);
    setOpen(false);
    setAmount(''); setNote('');
    onAdded();
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10"
      >
        Add Transaction (sysadmin)
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="font-semibold">Add Transaction</div>
              <button onClick={() => setOpen(false)} className="px-2 py-1 rounded border border-zinc-700">Close</button>
            </div>
            <form onSubmit={submit} className="p-4 grid gap-3">
              <select className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" value={kind} onChange={(e)=>setKind(e.target.value as any)}>
                <option value="fine">Fine (income)</option>
                <option value="loan_issue">Loan Issued (expense)</option>
                <option value="loan_repay">Loan Repayment (income)</option>
                <option value="project_fund">Project Fund (expense)</option>
                <option value="other">Other</option>
              </select>
              <input className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" placeholder="Amount"
                     value={amount} onChange={(e)=>setAmount(e.target.value)} />
              <input className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" placeholder="Note (optional)"
                     value={note} onChange={(e)=>setNote(e.target.value)} />
              {err && <p className="text-sm text-red-400">{err}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setOpen(false)} className="px-3 py-2 rounded border border-zinc-700">Cancel</button>
                <button className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
