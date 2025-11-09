'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Project = {
  id: number;
  name: string;
  budget?: number | null;
  status: 'ongoing' | 'completed' | 'on-hold';
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
};

const STATUS_OPTIONS: Array<Project['status']> = ['ongoing', 'completed', 'on-hold'];

export default function ProjectsPage() {
  const sb = supabase();

  const [tab, setTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [query, setQuery] = useState(''); // 🔎 quick search

  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Project>>({});

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newP, setNewP] = useState<Partial<Project>>({
    name: '',
    budget: undefined,
    status: 'ongoing',
    start_date: '',
    end_date: '',
    description: '',
  });

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .order('start_date', { ascending: false });

    setLoading(false);
    if (error) return setErr(error.message);
    setRows((data ?? []) as Project[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tab filter
  const byTab = useMemo(
    () => rows.filter(r => (tab === 'ongoing' ? r.status !== 'completed' : r.status === 'completed')),
    [rows, tab]
  );

  // search filter (name + description)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [byTab, query]);

  // totals bar for visible list
  const totals = useMemo(() => {
    const count = filtered.length;
    const totalBudget = filtered.reduce((t, p) => t + Number(p.budget ?? 0), 0);
    return { count, totalBudget };
  }, [filtered]);

  function beginEdit(p: Project) {
    setEditingId(p.id);
    setDraft({ ...p });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function saveEdit() {
    if (!editingId) return;

    // Keep array typed as Project[]
    const optimistic: Project[] = rows.map(r =>
      r.id === editingId ? ({ ...(r as Project), ...(draft as Project) } as Project) : r
    );
    setRows(optimistic);
    setEditingId(null);

    const payload = { ...draft };
    Object.keys(payload).forEach(k => (payload as any)[k] === undefined && delete (payload as any)[k]);

    const { error } = await sb.from('projects').update(payload).eq('id', editingId);
    if (error) {
      setErr(error.message);
      load(); // revert if failed
    }
  }

  async function toggleToCompleted(p: Project) {
    // Keep status narrowed to union type
    const updated: Project[] = rows.map(r =>
      r.id === p.id
        ? { ...r, status: (r.status === 'completed' ? 'ongoing' : 'completed') as Project['status'] }
        : r
    );
    setRows(updated);

    const { error } = await sb
      .from('projects')
      .update({ status: p.status === 'completed' ? 'ongoing' : 'completed' })
      .eq('id', p.id);

    if (error) {
      setErr(error.message);
      load();
    }
  }

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const keep: Project[] = rows.filter(r => r.id !== p.id);
    setRows(keep);
    const { error } = await sb.from('projects').delete().eq('id', p.id);
    if (error) {
      setErr(error.message);
      load();
    }
  }

  async function create() {
    if (!newP.name?.trim()) return alert('Name is required.');
    const payload = {
      name: newP.name?.trim()!,
      budget: newP.budget ?? null,
      status: ((newP.status as Project['status']) ?? 'ongoing') as Project['status'],
      start_date: newP.start_date || null,
      end_date: newP.end_date || null,
      description: newP.description || null,
    };

    const { data, error } = await sb.from('projects').insert(payload).select('*').maybeSingle();
    if (error) return setErr(error.message);
    if (data) setRows([data as Project, ...rows]);

    setShowCreate(false);
    setNewP({ name: '', status: 'ongoing' });
  }

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Community Projects</h1>
          <p className="text-sm text-zinc-400">Track budgets and timelines for ongoing and completed projects.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* 🔎 Quick Search */}
          <div className="relative">
            <input
              className="pl-9 pr-8 py-2 rounded bg-zinc-900 border border-zinc-700 w-64"
              placeholder="Search projects…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500">🔎</span>
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                onClick={() => setQuery('')}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10 hover:text-yellow-400"
          >
            + Create New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 border-b border-zinc-800 flex gap-6 text-sm">
        {(['ongoing', 'completed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 border-b-2 ${
              tab === t ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-zinc-400 hover:text-yellow-300'
            } capitalize`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Totals bar (for visible, filtered list) */}
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <TotalCard label="Projects" value={totals.count.toLocaleString()} />
        <TotalCard label="Total Budget (CFA)" value={totals.totalBudget.toLocaleString()} />
        <TotalCard
          label="Avg Budget (CFA)"
          value={totals.count ? Math.round(totals.totalBudget / totals.count).toLocaleString() : '0'}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-zinc-800 rounded-lg mt-4">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Project</th>
              <th>Budget (CFA)</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th className="text-right pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-3">Loading…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-3">No projects</td>
              </tr>
            )}

            {filtered.map(p => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id} className="border-t border-zinc-800">
                  {/* Name */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={String(draft.name ?? '')}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder="Project name"
                      />
                    ) : (
                      <div className="font-medium">{p.name}</div>
                    )}
                  </td>

                  {/* Budget */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        className="w-40 bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={draft.budget ?? ''}
                        onChange={e => setDraft(d => ({ ...d, budget: e.target.value === '' ? null : Number(e.target.value) }))}
                        placeholder="0"
                      />
                    ) : (
                      <span>{Number(p.budget ?? 0).toLocaleString()}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <select
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={(draft.status as Project['status']) ?? 'ongoing'}
                        onChange={e => setDraft(d => ({ ...d, status: e.target.value as Project['status'] }))}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{chipLabel(s)}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusChip status={p.status} />
                    )}
                  </td>

                  {/* Dates */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="date"
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={formatDateInput(draft.start_date)}
                        onChange={e => setDraft(d => ({ ...d, start_date: e.target.value || null }))}
                      />
                    ) : (
                      <span>{formatDateText(p.start_date)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="date"
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={formatDateInput(draft.end_date)}
                        onChange={e => setDraft(d => ({ ...d, end_date: e.target.value || null }))}
                      />
                    ) : (
                      <span>{formatDateText(p.end_date)}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={saveEdit} className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10">
                          Save
                        </button>
                        <button onClick={cancelEdit} className="px-2 py-1 rounded border border-zinc-700">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => beginEdit(p)}
                          className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleToCompleted(p)}
                          className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
                          title={p.status === 'completed' ? 'Mark Ongoing' : 'Mark Completed'}
                        >
                          {p.status === 'completed' ? 'Reopen' : 'Complete'}
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="px-2 py-1 rounded border border-zinc-700 hover:bg-red-500/10 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Create Project</h3>
              <button onClick={() => setShowCreate(false)} className="px-2 py-1 border border-zinc-700 rounded">Close</button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="text-zinc-400 mb-1">Name*</div>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2"
                  value={newP.name ?? ''}
                  onChange={e => setNewP(p => ({ ...p, name: e.target.value }))}
                  placeholder="Project name"
                />
              </label>
              <label className="text-sm">
                <div className="text-zinc-400 mb-1">Budget (CFA)</div>
                <input
                  type="number"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2"
                  value={newP.budget ?? ''}
                  onChange={e => setNewP(p => ({ ...p, budget: e.target.value === '' ? null : Number(e.target.value) }))}
                  placeholder="0"
                />
              </label>

              <label className="text-sm">
                <div className="text-zinc-400 mb-1">Start Date</div>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2"
                  value={formatDateInput(newP.start_date)}
                  onChange={e => setNewP(p => ({ ...p, start_date: e.target.value || '' }))}
                />
              </label>
              <label className="text-sm">
                <div className="text-zinc-400 mb-1">End Date</div>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2"
                  value={formatDateInput(newP.end_date)}
                  onChange={e => setNewP(p => ({ ...p, end_date: e.target.value || '' }))}
                />
              </label>

              <label className="text-sm md:col-span-2">
                <div className="text-zinc-400 mb-1">Status</div>
                <select
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2"
                  value={(newP.status as Project['status']) ?? 'ongoing'}
                  onChange={e => setNewP(p => ({ ...p, status: e.target.value as Project['status'] }))}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{chipLabel(s)}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm md:col-span-2">
                <div className="text-zinc-400 mb-1">Description</div>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2"
                  rows={4}
                  value={newP.description ?? ''}
                  onChange={e => setNewP(p => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-3 py-2 border border-zinc-700 rounded">
                Cancel
              </button>
              <button onClick={create} className="px-3 py-2 border border-zinc-700 rounded hover:bg-yellow-500/10 hover:text-yellow-400">
                Save Project
              </button>
            </div>

            {err && <p className="mt-3 text-sm text-red-400">Error: {err}</p>}
          </div>
        </div>
      )}

      {err && <p className="mt-4 text-sm text-red-400">Error: {err}</p>}
    </main>
  );
}

/* ---------- UI helpers ---------- */

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 rounded p-3 bg-zinc-950/60">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function chipLabel(s: Project['status']) {
  if (s === 'completed') return 'Completed';
  if (s === 'on-hold') return 'On Hold';
  return 'Ongoing';
}

function StatusChip({ status }: { status: Project['status'] }) {
  const map: Record<Project['status'], string> = {
    ongoing: 'bg-yellow-500/10 text-yellow-400 border-yellow-600/40',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-600/40',
    'on-hold': 'bg-orange-500/10 text-orange-400 border-orange-600/40',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs border ${map[status]}`}>
      {chipLabel(status)}
    </span>
  );
}

function formatDateText(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}
function formatDateInput(d?: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}
