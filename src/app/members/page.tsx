'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Member = {
  id: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  status?: 'active' | 'inactive' | null;
  joined_date?: string | null;
  avatar_url?: string | null;
};

const PAGE_SIZE = 10;

export default function MembersDirectory() {
  const sb = supabase();

  // UI state
  const [members, setMembers] = useState<Member[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // controls
  const [q, setQ] = useState('');                     // search
  const [status, setStatus] = useState<'all'|'active'|'inactive'>('all'); // filter
  const [page, setPage] = useState(1);                // pagination

  // add/edit
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ full_name: '', email: '', phone: '', status: 'active' });

  async function load() {
    setLoading(true); setErr(null);
    let query = sb.from('members').select('*').order('id', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);
    if (q.trim()) {
      // simple OR filter: name or email contains q
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await query.range(from, to);
    if (error) setErr(error.message);
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, status, page]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    const { error } = await sb.from('members').insert({
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      status: 'active',
    });
    if (error) return setErr(error.message);
    setForm({ full_name: '', email: '', phone: '' });
    setPage(1);
    load();
  }

  function startEdit(m: Member) {
    setEditingId(m.id);
    setEdit({
      full_name: m.full_name ?? '',
      email: m.email ?? '',
      phone: m.phone ?? '',
      // @ts-ignore
      status: (m.status ?? 'active') as any,
    });
  }

  async function saveEdit(id: number) {
    if (!edit.full_name.trim()) return;
    const { error } = await sb.from('members').update({
      full_name: edit.full_name.trim(),
      email: edit.email || null,
      phone: edit.phone || null,
      status: edit.status as any,
    }).eq('id', id);
    if (error) return setErr(error.message);
    setEditingId(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this member?')) return;
    const { error } = await sb.from('members').delete().eq('id', id);
    if (error) return setErr(error.message);
    load();
  }

  const canPrev = useMemo(() => page > 1, [page]);
  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => canPrev && setPage((p) => p - 1);

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members Directory</h1>
          <p className="text-sm text-zinc-400">Manage members of the community.</p>
        </div>
        <form onSubmit={addMember} className="hidden md:flex gap-2">
          <input
            className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
            placeholder="Full name*"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <input
            className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <button className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30">
            + Add New Member
          </button>
        </form>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-2">
          <input
            className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2 w-64"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          <select
            className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value as any); }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Mobile quick-add */}
        <form onSubmit={addMember} className="md:hidden grid grid-cols-2 gap-2">
          <input className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" placeholder="Full name*" value={form.full_name} onChange={(e)=>setForm({...form, full_name:e.target.value})}/>
          <button className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30">
            + Add
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Avatar</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-3" colSpan={7}>Loading…</td></tr>
            )}
            {!loading && members.length === 0 && (
              <tr><td className="px-3 py-3" colSpan={7}>No members found.</td></tr>
            )}
            {members.map(m => (
              <tr key={m.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                <td className="px-3 py-2">
                  <img src={m.avatar_url || '/avatar.png'} className="w-8 h-8 rounded-full border border-zinc-700" />
                </td>
                <td className="px-3 py-2 font-medium">
  <a href={`/members/${m.id}`} className="hover:text-yellow-400">{m.full_name}</a>
</td>

                <td className="px-3 py-2">{m.email || '—'}</td>
                <td className="px-3 py-2">{m.role || 'member'}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs border
                    ${m.status === 'active' ? 'border-emerald-600 text-emerald-400 bg-emerald-500/10' :
                                              'border-zinc-600 text-zinc-400 bg-zinc-500/10'}`}>
                    {m.status ?? 'active'}
                  </span>
                </td>
                <td className="px-3 py-2">{m.joined_date || '—'}</td>
                <td className="px-3 py-2">
                  {editingId === m.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(m.id)} className="px-2 py-1 rounded border border-zinc-700">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded border border-zinc-700">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(m)} className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10">Edit</button>
                      <button onClick={() => remove(m.id)} className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline editor row (appears above table on mobile or use a modal later) */}
      {editingId !== null && (
        <div className="mt-3 grid md:grid-cols-4 gap-2">
          <input className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" placeholder="Full name*" value={edit.full_name} onChange={(e)=>setEdit({...edit, full_name:e.target.value})}/>
          <input className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" placeholder="Email" value={edit.email} onChange={(e)=>setEdit({...edit, email:e.target.value})}/>
          <input className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" placeholder="Phone" value={edit.phone} onChange={(e)=>setEdit({...edit, phone:e.target.value})}/>
          <select className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2" value={edit.status} onChange={(e)=>setEdit({...edit, status:e.target.value})}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center gap-2 mt-4">
        <button disabled={!canPrev} onClick={prevPage} className="px-3 py-1.5 rounded border border-zinc-700 disabled:opacity-40">Prev</button>
        <span className="text-sm text-zinc-400">Page {page}</span>
        <button onClick={nextPage} className="px-3 py-1.5 rounded border border-zinc-700">Next</button>
      </div>
    </main>
  );
}
