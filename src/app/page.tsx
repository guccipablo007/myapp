'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Item = { id: number; name: string; created_at?: string };

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const sb = supabase();

  async function load() {
    const { data } = await sb.from('items').select('*').order('id', { ascending: false });
    setItems(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await sb.from('items').insert({ name });
    setName('');
    load();
  }

  return (
    <main style={{ padding: 24, maxWidth: 600 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Supabase Test</h1>

      <form onSubmit={addItem} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type a new item..."
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #444' }}
        />
        <button style={{ padding: '10px 16px', borderRadius: 6, background: 'black', color: 'white' }}>
          Add
        </button>
      </form>

      <ul style={{ marginTop: 24, display: 'grid', gap: 8 }}>
        {items.map(i => (
          <li key={i.id} style={{ border: '1px solid #333', borderRadius: 6, padding: 10 }}>
            {i.name}
          </li>
        ))}
      </ul>
    </main>
  );
}
