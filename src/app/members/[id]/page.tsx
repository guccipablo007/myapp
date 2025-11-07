'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MemberProfile() {
  const sb = supabase();
  const { id } = useParams() as { id: string };
  const [member, setMember] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'fines' | 'loans'>('overview');
  const [fines, setFines] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb.from('members').select('*').eq('id', id).maybeSingle();
      if (error) setErr(error.message);
      else setMember(data);

      const { data: tx } = await sb.from('transactions').select('*').eq('member_id', id);
      setFines(tx?.filter((t) => t.kind === 'fine') ?? []);
      setLoans(tx?.filter((t) => ['loan', 'repayment'].includes(t.kind)) ?? []);
    })();
  }, [id]);

  if (err) return <p className="p-4 text-red-500">Error: {err}</p>;
  if (!member) return <p className="p-4">Loading…</p>;

  return (
    <main className="pt-6 max-w-5xl mx-auto">
      <div className="border border-zinc-800 rounded-lg p-6 flex flex-col md:flex-row gap-4 items-center md:items-start">
        <img src={member.avatar_url || '/avatar.png'} className="w-24 h-24 rounded-full border border-zinc-700" />
        <div>
          <h1 className="text-2xl font-bold">{member.full_name}</h1>
          <p className="text-zinc-400">{member.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="border border-zinc-700 rounded px-2 py-0.5 text-xs">{member.role || 'member'}</span>
            <span className={`border rounded px-2 py-0.5 text-xs ${
              member.status === 'active' ? 'border-emerald-600 text-emerald-400' : 'border-zinc-600 text-zinc-400'
            }`}>{member.status ?? 'active'}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Joined: {member.joined_date || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-zinc-800 flex gap-6 text-sm">
        {['overview', 'fines', 'loans'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-2 border-b-2 ${
              activeTab === tab ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-zinc-400 hover:text-yellow-300'
            } capitalize`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="border border-zinc-800 rounded-lg p-4">
              <p><strong>Full Name:</strong> {member.full_name}</p>
              <p><strong>Email:</strong> {member.email || '—'}</p>
              <p><strong>Phone:</strong> {member.phone || '—'}</p>
              <p><strong>Role:</strong> {member.role || 'member'}</p>
              <p><strong>Status:</strong> {member.status || 'active'}</p>
              <p><strong>Joined:</strong> {member.joined_date || '—'}</p>
            </div>
          </div>
        )}

        {activeTab === 'fines' && (
          <div>
            <h2 className="font-semibold mb-2">Fines History</h2>
            {fines.length === 0 ? (
              <p className="text-zinc-400 text-sm">No fines recorded.</p>
            ) : (
              <table className="w-full border border-zinc-800 rounded-lg text-sm">
                <thead className="bg-zinc-950/60 border-b border-zinc-800">
                  <tr><th className="text-left px-3 py-2">Date</th><th>Reason</th><th>Status</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {fines.map(f => (
                    <tr key={f.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                      <td className="px-3 py-2">{f.date}</td>
                      <td>{f.description}</td>
                      <td>{f.status}</td>
                      <td>{f.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'loans' && (
          <div>
            <h2 className="font-semibold mb-2">Loans & Repayments</h2>
            {loans.length === 0 ? (
              <p className="text-zinc-400 text-sm">No loans recorded.</p>
            ) : (
              <table className="w-full border border-zinc-800 rounded-lg text-sm">
                <thead className="bg-zinc-950/60 border-b border-zinc-800">
                  <tr><th className="text-left px-3 py-2">Date</th><th>Description</th><th>Kind</th><th>Status</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {loans.map(l => (
                    <tr key={l.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                      <td className="px-3 py-2">{l.date}</td>
                      <td>{l.description}</td>
                      <td>{l.kind}</td>
                      <td>{l.status}</td>
                      <td>{l.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
