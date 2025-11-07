'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

type Metric = {
  finesCollected: number;
  loansIssued: number;
  loansRepaid: number;
  projectFunds: number;
};

export default function FinancesPage() {
  const sb = supabase();
  const [metrics, setMetrics] = useState<Metric>({ finesCollected: 0, loansIssued: 0, loansRepaid: 0, projectFunds: 0 });
  const [flow, setFlow] = useState<{ month: string; income: number; expense: number }[]>([]);

  async function load() {
    // totals
    const [fines, loans] = await Promise.all([
      sb.from('fines').select('amount,status'),
      sb.from('loans').select('amount,status')
    ]);

    const finesCollected = (fines.data ?? [])
      .filter((f: any) => f.status === 'paid')
      .reduce((t: number, f: any) => t + Number(f.amount ?? 0), 0);

    const loansIssued = (loans.data ?? [])
      .reduce((t: number, l: any) => t + Number(l.amount ?? 0), 0);

    const loansRepaid = (loans.data ?? [])
      .filter((l: any) => l.status === 'repaid')
      .reduce((t: number, l: any) => t + Number(l.amount ?? 0), 0);

    const projectFunds = Math.max(finesCollected + loansRepaid - loansIssued, 0);

    setMetrics({ finesCollected, loansIssued, loansRepaid, projectFunds });

    // fake monthly flow for demo (replace with real sums later)
    setFlow([
      { month: 'Jan', income: 10000, expense: 7000 },
      { month: 'Feb', income: 12000, expense: 9000 },
      { month: 'Mar', income: 14000, expense: 10000 },
      { month: 'Apr', income: 8000, expense: 6000 },
      { month: 'May', income: 15000, expense: 11000 },
    ]);
  }

  useEffect(() => { load(); }, []);

  const COLORS = ['#facc15', '#60a5fa', '#34d399', '#f87171'];
  const pieData = [
    { name: 'Fines Collected', value: metrics.finesCollected },
    { name: 'Loans Issued', value: metrics.loansIssued },
    { name: 'Loans Repaid', value: metrics.loansRepaid },
    { name: 'Funds for Projects', value: metrics.projectFunds },
  ];

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Financial Overview 💰</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Review collected fines, issued loans, repayments, and available funds.
      </p>

      {/* Summary tiles */}
      <div className="grid sm:grid-cols-4 gap-4 mb-10">
        <Tile label="💵 Fines Collected" value={`${metrics.finesCollected.toLocaleString()} CFA`} />
        <Tile label="🧾 Loans Issued" value={`${metrics.loansIssued.toLocaleString()} CFA`} />
        <Tile label="💳 Loans Repaid" value={`${metrics.loansRepaid.toLocaleString()} CFA`} />
        <Tile label="🧱 Funds for Projects" value={`${metrics.projectFunds.toLocaleString()} CFA`} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Pie */}
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/60">
          <h2 className="font-semibold mb-4">Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" outerRadius={100} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/60">
          <h2 className="font-semibold mb-4">Monthly Cash Flow</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={flow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#22c55e" />
              <Line type="monotone" dataKey="expense" stroke="#f59e0b" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => alert('Coming soon: export as CSV/PDF')}
          className="px-4 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10"
        >
          Export Report
        </button>
      </div>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/60">
      <div className="text-sm text-zinc-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-yellow-400">{value}</div>
    </div>
  );
}
