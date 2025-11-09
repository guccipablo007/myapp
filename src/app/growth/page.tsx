'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

// ---- Supabase client compatibility wrapper ----
// Works whether your lib exports a client *object* or a client *factory function*.
import { supabase as supabaseMaybe } from '@/lib/supabase';
function sb() {
  const maybe: any = supabaseMaybe as any;
  return typeof maybe === 'function' ? maybe() : maybe;
}

// Optional formatting helpers you already have:
import { formatNumber, fmtCFA as formatCurrency } from '@/lib/format';

// ---- Types that match the SQL views we created earlier ----
type StatusRow = { status: 'active' | 'inactive'; total: number };
type RoleRow = { role: 'sysadmin' | 'secretary' | 'member'; total: number };
type TenureRow = {
  avg_days: number;
  first_joined: string | null;
  last_joined: string | null;
  total_members: number;
};

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function GrowthPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [statusData, setStatusData] = useState<StatusRow[]>([]);
  const [roleData, setRoleData] = useState<RoleRow[]>([]);
  const [tenure, setTenure] = useState<TenureRow | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // v_member_status_totals:  status, total
        const s1 = await sb().from('v_member_status_totals').select('*');

        // v_member_role_totals:    role, total
        const s2 = await sb().from('v_member_role_totals').select('*');

        // v_member_tenure: avg_days, first_joined, last_joined, total_members
        const s3 = await sb().from('v_member_tenure').select('*').maybeSingle();

        if (s1.error) throw s1.error;
        if (s2.error) throw s2.error;
        if (s3.error) throw s3.error;

        if (!alive) return;
        setStatusData((s1.data || []) as StatusRow[]);
        setRoleData((s2.data || []) as RoleRow[]);
        setTenure((s3.data || null) as TenureRow | null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load growth data');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const statusPie = useMemo(
    () => statusData.map((r) => ({ name: r.status, value: r.total })),
    [statusData]
  );

  const roleBars = useMemo(
    () => roleData.map((r) => ({ name: r.role, count: r.total })),
    [roleData]
  );

  const avgMonths = useMemo(() => {
    if (!tenure?.avg_days) return 0;
    return Math.round((tenure.avg_days / 30) * 10) / 10; // 1 dec place
  }, [tenure]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Growth & Member Analytics</h1>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi
          label="Total Members"
          value={formatNumber(tenure?.total_members ?? 0)}
          hint={
            tenure?.first_joined
              ? `Since ${new Date(tenure.first_joined).toLocaleDateString()}`
              : '—'
          }
        />
        <Kpi
          label="Average Tenure"
          value={`${avgMonths} mo`}
          hint={
            tenure?.last_joined
              ? `Latest join: ${new Date(tenure.last_joined).toLocaleDateString()}`
              : '—'
          }
        />
        <Kpi
          label="Active vs Inactive"
          value={`${formatNumber(
            statusData.find((s) => s.status === 'active')?.total || 0
          )} / ${formatNumber(
            statusData.find((s) => s.status === 'inactive')?.total || 0
          )}`}
          hint="Active / Inactive members"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Member Status Composition">
          <ChartBox loading={loading} error={err}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {statusPie.map((_, i) => (
                    <Cell key={`s-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>

        <Card title="Roles Breakdown">
          <ChartBox loading={loading} error={err}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roleBars} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Members">
                  {roleBars.map((_, i) => (
                    <Cell key={`r-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
      </div>

      {/* Footnote */}
      <p className="text-xs text-neutral-400">
        Data source: <code>v_member_status_totals</code>, <code>v_member_role_totals</code>,{' '}
        <code>v_member_tenure</code>.
      </p>
    </div>
  );
}

/* ---------- Small UI helpers (no external deps) ---------- */
function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 p-5 bg-neutral-900/40">
      <div className="text-neutral-400 text-sm">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-neutral-500 text-xs mt-1">{hint}</div> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-800 p-5 bg-neutral-900/40">
      <div className="text-neutral-200 font-medium mb-3">{title}</div>
      {children}
    </div>
  );
}

function ChartBox({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  if (loading) {
    return <div className="h-[280px] grid place-items-center text-neutral-500">Loading…</div>;
  }
  if (error) {
    return (
      <div className="h-[280px] grid place-items-center text-red-400 text-sm">
        Error: {error}
      </div>
    );
  }
  return <div className="h-[280px]">{children}</div>;
}
