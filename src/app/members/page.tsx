'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Member = {
  id: number;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string;
};

export default function MembersPage() {
  const sb = supabase();
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ full_name: '', phone: '', email: '' });
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data, error } = await sb.from('members').select('*').order('id', { ascending: false });
    if (error) setErr(error.message);
    else setMembers((data ?? []) as Member[]);
  }

  useEffect(() => { load(); }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    const { error } = await sb.from('members').insert({
      full_name: form.full_name.trim(),
      phone: form.phone || null,
      email: form.email || null,
    });
    if (error) return setErr(error.message);
    setForm({ full_name: '', phone: '', email: '' });
    load();
  }

  function startEdit(m: Member) {
    setEditingId(m.id);
    setEdit({
      full_name: m.full_name ?? '',
      phone: m.phone ?? '',
      email: m.email ?? '',
    });
  }

  async function saveEdit(id: number) {
    if (!edit.full_name.trim()) return;
    const { error } = await sb.from('members').update({
      full_name: edit.full_name.trim(),
      phone: edit.phone || null,
      email: edit.email || null,
    }).eq('id', id);
    if (error) return setErr(error.message);
    setEditingId(null);
    load();
  }

  async function remove(id: number) {
    const yes = confirm('Delete this member?');
    if (!yes) return;
    const { error } = await sb.from('members').delete().eq('id', id);
    if (error) return setErr(error.message);
    load();
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Members</h1>
      {err && <p style={{ color: 'tomato' }}>Error: {err}</p>}

      {/* Add form */}
      <form onSubmit={addMember} style={{ marginTop: 16, display: 'grid', gap: 8, gridTemplateColumns: '1.5fr 1fr 1.2fr auto' }}>
        <input
          placeholder="Full name *"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          style={{ padding: 10, borderRadius: 6, border: '1px solid #444' }}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={{ padding: 10, borderRadius: 6, border: '1px solid #444' }}
        />
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={{ padding: 10, borderRadius: 6, border: '1px solid #444' }}
        />
        <button style={{ padding: '10px 16px', borderRadius: 6, background: 'black', color: 'white' }}>
          Add
        </button>
      </form>

      {/* List */}
      <ul style={{ marginTop: 24, display: 'grid', gap: 8 }}>
        {members.map(m => (
          <li key={m.id} style={{ border: '1px solid #333', borderRadius: 8, padding: 12 }}>
            {editingId === m.id ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr auto auto', gap: 8 }}>
                <input
                  value={edit.full_name}
                  onChange={(e) => setEdit({ ...edit, full_name: e.target.value })}
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #444' }}
                />
                <input
                  value={edit.phone}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #444' }}
                />
                <input
                  value={edit.email}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #444' }}
                />
                <button onClick={() => saveEdit(m.id)} style={{ padding: '8px 12px', borderRadius: 6, background: 'black', color: 'white' }}>
                  Save
                </button>
                <button onClick={() => setEditingId(null)} style={{ padding: '8px 12px', borderRadius: 6 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr auto auto', gap: 8, alignItems: 'center' }}>
                <span><strong>{m.full_name}</strong></span>
                <span>{m.phone || '—'}</span>
                <span>{m.email || '—'}</span>
                <button onClick={() => startEdit(m)} style={{ padding: '8px 12px', borderRadius: 6 }}>
                  Edit
                </button>
                <button onClick={() => remove(m.id)} style={{ padding: '8px 12px', borderRadius: 6 }}>
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
