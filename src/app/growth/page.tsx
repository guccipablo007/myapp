'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/utils/format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type MonthlyRow = {
  month: string;            // date string (YYYY-MM-01)
  joined_count: number;
  cumulative_total: number;
};

type StatusRow = { status: 'active' | 'inactive'; count: number };
type RoleRow = { role: string; count: number };
type TenureRow = {
  avg_days: number;
  first_joined: string | null;
  last_joined: string | null;
  total_members: number;
};

const COLORS = {
  joined: '#22c55e',          // green
  cumulative: '#60a5fa',      // blue
  active: '#10b981',          // emerald
  inactive: '#f59e0b',        // amber
  roles: ['#60a5fa', '#22c55e', '#f59e0b', '#f43f5e', '#a78bfa', '#34d399'],
};

const card =
  'rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 md:p-5 shadow-sm';

const title = 'text-sm text-zinc-400';
const value = 'text-2xl md:text-3xl font-semibold';

function monthLabel(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function GrowthPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [statusTotals, setStatusTotals] = useState<StatusRow[]>([]);
  const [roleTotals, setRoleTotals] = useState<RoleRow[]>([]);
  const [tenure, setTenure] = useState<TenureRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const sb = supabase();

      const [mRes, sRes, rRes, tRes] = await Promise.all([
        sb.from('v_member_monthly_stats').select('*').order('month', { ascending: true }),
        sb.from('v_member_status_totals').select('*'),
        sb.from('v_member_role_totals').select('*').order('role', { ascending: true }),
        sb.from('v_member_tenure').select('*').single(),
      ]);

      if (mRes.error) return setErr(mRes.error.message), setLoading(false);
      if (sRes.error) return setErr(sRes.error.message), setLoading(false);
      if (rRes.error) return setErr(rRes.error.message), setLoading(false);
      if (tRes.error) return setErr(tRes.error.message), setLoading(false);

      setMonthly((mRes.data || []) as MonthlyRow[]);
      setStatusTotals((sRes.data || []) as StatusRow[]);
      setRoleTotals((rRes.data || []) as RoleRow[]);
      setTenure((tRes.data || null) as TenureRow | null);
      setLoading(false);
    })();
  }, []);

  const activeCount = useMemo(
    () => statusTotals.find(x => x.status === 'active')?.count ?? 0,
    [statusTotals],
  );
  const inactiveCount = useMemo(
    () => statusTotals.find(x => x.status === 'inactive')?.count ?? 0,
    [statusTotals],
  );

  const latestMonth = monthly.at(-1);
  const totalMembers = tenure?.total_members ?? latestMonth?.cumulative_total ?? 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-semibold">Community Growth</h1>
        <p className="text-zinc-400 text-sm">Last 24 months</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className={card}>
          <div className={title}>Total Members</div>
          <div className={value}>{formatNumber(totalMembers)}</div>
          <div className="text-xs text-zinc-500 mt-1">
            Cumulative up to this month
          </div>
        </div>

        <div className={card}>
          <div className={title}>New This Month</div>
          <div className={value}>{formatNumber(latestMonth?.joined_count ?? 0)}</div>
          <div className="text-xs text-zinc-500 mt-1">
            From <span className="text-zinc-300">{monthLabel(latestMonth?.month ?? '')}</span>
          </div>
        </div>

        <div className={card}>
          <div className={title}>Active</div>
          <div className={`${value} text-emerald-400`}>{formatNumber(activeCount)}</div>
          <div className="text-xs text-zinc-500 mt-1">
            Inactive: {formatNumber(inactiveCount)}
          </div>
        </div>

        <div className={card}>
          <div className={title}>Avg. Tenure (days)</div>
          <div className={value}>{formatNumber(Number(tenure?.avg_days ?? 0))}</div>
          <div className="text-xs text-zinc-500 mt-1">
            Since {tenure?.first_joined ? monthLabel(tenure.first_joined) : '—'}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Line Chart */}
        <div className={`lg:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Monthly Joins & Cumulative Members</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(monthly || []).map(m => ({
                  ...m,
                  label: monthLabel(m.month),
                }))}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={{ background: '#09090b', border: '1px solid #27272a' }}
                  formatter={(val: any) => formatNumber(val as number)}
                  labelClassName="text-white"
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="joined_count"
                  stroke={COLORS.joined}
                  strokeWidth={2}
                  dot={false}
                  name="Joined"
                />
                <Line
                  type="monotone"
                  dataKey="cumulative_total"
                  stroke={COLORS.cumulative}
                  strokeWidth={2}
                  dot={false}
                  name="Cumulative"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie */}
        <div className={card}>
          <div className="font-medium mb-3">Status Mix</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: activeCount },
                    { name: 'Inactive', value: inactiveCount },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  <Cell fill={COLORS.active} />
                  <Cell fill={COLORS.inactive} />
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#09090b', border: '1px solid #27272a' }}
                  formatter={(val: any) => formatNumber(val as number)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Roles Pie */}
      <div className={card}>
        <div className="font-medium mb-3">Roles Distribution</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={roleTotals}
                dataKey="count"
                nameKey="role"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {roleTotals.map((_, i) => (
                  <Cell key={i} fill={COLORS.roles[i % COLORS.roles.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#09090b', border: '1px solid #27272a' }}
                formatter={(val: any) => formatNumber(val as number)}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Errors & Loading */}
      {loading && (
        <div className="text-sm text-zinc-400">Loading growth data…</div>
      )}
      {err && (
        <div className="text-sm text-rose-400">Error: {err}</div>
      )}
    </div>
  );
}
