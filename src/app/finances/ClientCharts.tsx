'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { fmtCFA } from '@/lib/format';

type MonthlyPoint = { month: string; inflow: number; outflow: number };
type CompositionPoint = { name: string; value: number };

export function MonthlyInOutChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="rounded-2xl border border-neutral-800 p-4">
      <h3 className="mb-2 text-sm text-neutral-400">Monthly Cash Flow</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip
              formatter={(v: number) => fmtCFA(v)}
              labelStyle={{ color: '#a3a3a3' }}
            />
            <Legend />
            <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CompositionChart({ data }: { data: CompositionPoint[] }) {
  return (
    <div className="rounded-2xl border border-neutral-800 p-4">
      <h3 className="mb-2 text-sm text-neutral-400">Composition</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip formatter={(v: number) => fmtCFA(v)} />
            <Bar dataKey="value" name="Amount" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
