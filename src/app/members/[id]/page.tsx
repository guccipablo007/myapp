'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Member = {
  id: number;
  full_name: string;
  email?: string | null;
  role?: 'sysadmin' | 'secretary' | 'member' | null;
  status?: 'active' | 'suspended' | null;
  joined_at?: string | null;
};

type Fine = {
  id: number;
  issued_at?: string | null;  // your fines table uses issued_at
  reason?: string | null;
  amount: number;
  status: 'paid' | 'unpaid';
};

type Loan = {
  id: number;
  description?: string | null;
  principal: number;          // your loans table uses principal
  status: 'active' | 'repaid';
  issued_on?: string | null;
};

type FinanceView = {
  member_id: number;
  full_name: string;
  fines_paid: number;
  fines_unpaid: number;
  loans_issued: number;
  loans_repaid: number;
};

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const mid = Number(id);
  const sb = supabase();

  const [activeTab, setActiveTab] = useState<'overview' | 'fines' | 'loans'>('overview');

  const [member, setMember] = useState<Member | null>(null);
  const [view, setView] = useState<FinanceView | null>(null);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [role, setRole] = useState<'sysadmin' | 'secretary' | 'member' | 'unknown'>('unknown');
  const [err, setErr] = useState<string | null>(null);

  // Load current user's app role
  async function loadRole() {
    const { data } = await sb.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return setRole('member');

    const { data: up } = await sb
      .from('user_profiles')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle();

    setRole(((up?.role as any) ?? 'member'));
  }

  async function load() {
    setErr(null);

    const [
      { data: m, error: em },
      { data: vw, error: ev },
      { data: fs, error: ef },
      { data: ls, error: el },
    ] = await Promise.all([
      sb.from('members').select('*').eq('id', mid).maybeSingle(),
      // <- use the view we just created
      sb.from('v_member_finance_summary').select('*').eq('member_id', mid).maybeSingle(),
      sb.from('fines').select('*').eq('member_id', mid).order('issued_at', { ascending: false }),
      sb.from('loans').select('*').eq('member_id', mid).order('issued_on', { ascending: false }),
    ]);

    if (em) setErr(em.message);
    if (ev) setErr(ev.message);
    if (ef) setErr(ef.message);
    if (el) setErr(el.message);

    setMember(m as any);
    setView((vw as any) ?? null);
    setFines((fs ?? []) as Fine[]);
    setLoans((ls ?? []) as Loan[]);
  }

  useEffect(() => {
    loadRole();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fallback client computations if view is absent
  const fallback = useMemo(() => {
    const fines_paid = fines.filter(f => f.status === 'paid').reduce((t, f) => t + Number(f.amount || 0), 0);
    const fines_unpaid = fines.filter(f => f.status !== 'paid').reduce((t, f) => t + Number(f.amount || 0), 0);
    const loans_issued = loans.reduce((t, l) => t + Number(l.principal || 0), 0);
    const loans_repaid = loans.filter(l => l.status === 'repaid').reduce((t, l) => t + Number(l.principal || 0), 0);
    return { fines_paid, fines_unpaid, loans_issued, loans_repaid };
  }, [fines, loans]);

  const totals = useMemo(() => {
    const base = view ?? {
      fines_paid: fallback.fines_paid,
      fines_unpaid: fallback.fines_unpaid,
      loans_issued: fallback.loans_issued,
      loans_repaid: fallback.loans_repaid,
    };
    const outstanding = Math.max(base.loans_issued - base.loans_repaid, 0);
    return { ...base, outstanding };
  }, [view, fallback]);

  async function recordRepayment(loanId: number) {
    if (!(role === 'sysadmin' || role === 'secretary')) {
      alert('Only sysadmin or secretary can record repayments.');
      return;
    }
    const amountStr = prompt('Enter repayment amount (CFA):');
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Invalid amount.');
      return;
    }

    // Insert to loan_repayments if you created it
    const { error: er } = await sb.from('loan_repayments').insert({ loan_id: loanId, amount });
    if (er) return alert(er.message);

    // Optionally mark repaid (manual choice)
    const mark = confirm('Mark this loan as fully repaid now?');
    if (mark) {
      const { error: eu } = await sb.from('loans').update({ status: 'repaid' }).eq('id', loanId);
      if (eu) return alert(eu.message);
    }

    await load();
    alert('Repayment recorded.');
  }

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/60 flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold">{member?.full_name ?? 'Member'}</div>
          <div className="text-sm text-zinc-400">{member?.email ?? '—'}</div>
          <div className="mt-1 text-xs">
            <span className="px-2 py-0.5 rounded border border-zinc-700 mr-2">
              {member?.role ?? 'member'}
            </span>
            <span className="px-2 py-0.5 rounded border border-zinc-700">
              {member?.status ?? 'active'}
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Joined: {member?.joined_at ?? '—'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 border-b border-zinc-800 flex gap-6 text-sm">
        {(['overview', 'fines', 'loans'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-2 border-b-2 ${
              activeTab === t
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-zinc-400 hover:text-yellow-300'
            } capitalize`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="mt-4">
        {activeTab === 'overview' && (
          <section className="grid md:grid-cols-3 gap-3">
            <SummaryCard label="Fines Paid" value={`${totals.fines_paid.toLocaleString()} CFA`} />
            <SummaryCard label="Fines Unpaid" value={`${totals.fines_unpaid.toLocaleString()} CFA`} />
            <SummaryCard label="Loans Outstanding" value={`${totals.outstanding.toLocaleString()} CFA`} />
          </section>
        )}

        {activeTab === 'fines' && (
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/60 border-b border-zinc-800">
                <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {fines.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3">
                      No fines
                    </td>
                  </tr>
                )}
                {fines.map(f => (
                  <tr key={f.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">{f.issued_at ?? '—'}</td>
                    <td className="px-3 py-2">{f.reason ?? '—'}</td>
                    <td className="px-3 py-2 capitalize">{f.status}</td>
                    <td className="px-3 py-2">{Number(f.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <SummaryCard label="Loans Issued" value={`${(view?.loans_issued ?? fallback.loans_issued).toLocaleString()} CFA`} />
              <SummaryCard label="Loans Repaid" value={`${(view?.loans_repaid ?? fallback.loans_repaid).toLocaleString()} CFA`} />
              <SummaryCard label="Outstanding" value={`${totals.outstanding.toLocaleString()} CFA`} />
            </div>

            <div className="overflow-x-auto border border-zinc-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-zinc-950/60 border-b border-zinc-800">
                  <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
                    <th>Issued On</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3">
                        No loans
                      </td>
                    </tr>
                  )}
                  {loans.map(l => (
                    <tr key={l.id} className="border-t border-zinc-800">
                      <td className="px-3 py-2">{l.issued_on ?? '—'}</td>
                      <td className="px-3 py-2">{l.description ?? '—'}</td>
                      <td className="px-3 py-2 capitalize">{l.status}</td>
                      <td className="px-3 py-2">{Number(l.principal).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => recordRepayment(l.id)}
                          className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
                        >
                          Record Repayment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {err && <p className="mt-4 text-sm text-red-400">Error: {err}</p>}
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 rounded p-3 bg-zinc-950/60">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
