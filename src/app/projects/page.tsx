'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Project = {
  id: number;
  name: string;
  description?: string | null;
  budget?: number | null;
  status: 'active' | 'completed';
  start_date?: string | null;
  end_date?: string | null;
};

export default function ProjectsPage() {
  const sb = supabase();
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    budget: '',
    status: 'active',
    start_date: '',
    end_date: '',
  });

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .eq('status', tab)
      .order('start_date', { ascending: false });
    if (error) setErr(error.message);
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      budget: '',
      status: 'active',
      start_date: '',
      end_date: '',
    });
    setOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({
      name: p.name || '',
      description: p.description || '',
      budget: p.budget != null ? String(p.budget) : '',
      status: p.status || 'active',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
    });
    setOpen(true);
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      budget: form.budget ? Number(form.budget) : null,
      status: form.status as 'active' | 'completed',
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    if (!payload.name) return setErr('Project name is required.');

    if (editing) {
      const { error } = await sb.from('projects').update(payload).eq('id', editing.id);
      if (error) return setErr(error.message);
    } else {
      const { error } = await sb.from('projects').insert(payload);
      if (error) return setErr(error.message);
    }
    setOpen(false);
    load();
  }

  async function removeProject(id: number) {
    if (!confirm('Delete this project?')) return;
    const { error } = await sb.from('projects').delete().eq('id', id);
    if (error) return setErr(error.message);
    load();
  }

  const totals = useMemo(() => {
    const sum = (projects ?? []).reduce((s, p) => s + Number(p.budget || 0), 0);
    return { count: projects.length, budget: sum };
  }, [projects]);

  return (
    <main className="pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Projects</h1>
          <p className="text-sm text-zinc-400">Track budgets and timelines for ongoing and completed projects.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30"
        >
          + Create New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 border-b border-zinc-800 flex gap-6 text-sm">
        {(['active', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 border-b-2 ${
              tab === t ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-zinc-400 hover:text-yellow-300'
            } capitalize`}
          >
            {t === 'active' ? 'Ongoing' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div className="border border-zinc-800 rounded p-3">
          <div className="text-xs text-zinc-400">Projects</div>
          <div className="text-xl font-semibold">{totals.count}</div>
        </div>
        <div className="border border-zinc-800 rounded p-3">
          <div className="text-xs text-zinc-400">Total Budget (CFA)</div>
          <div className="text-xl font-semibold">{totals.budget.toLocaleString()}</div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Project</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-3">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-3">
                  No projects
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-zinc-800 hover:bg-yellow-500/5">
                <td className="px-3 py-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-zinc-400 line-clamp-2 max-w-[40ch]">{p.description || '—'}</div>
                </td>
                <td className="px-3 py-2">{p.budget != null ? Number(p.budget).toLocaleString() : '—'}</td>
                <td className="px-3 py-2 capitalize">{p.status}</td>
                <td className="px-3 py-2">{p.start_date || '—'}</td>
                <td className="px-3 py-2">{p.end_date || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeProject(p.id)}
                      className="px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4">
          <div className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="font-semibold">{editing ? 'Edit Project' : 'Create Project'}</div>
              <button onClick={() => setOpen(false)} className="px-2 py-1 rounded border border-zinc-700">
                Close
              </button>
            </div>
            <form onSubmit={saveProject} className="p-4 grid md:grid-cols-2 gap-3">
              <input
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                placeholder="Name*"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                placeholder="Budget (CFA)"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
              <input
                type="date"
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
              <input
                type="date"
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
              <select
                className="border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
              <textarea
                className="md:col-span-2 border border-zinc-800 bg-zinc-900 rounded px-3 py-2"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded border border-zinc-700">
                  Cancel
                </button>
                <button className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30">
                  Save Project
                </button>
              </div>
            </form>
            {err && <p className="px-4 pb-4 text-sm text-red-400">Error: {err}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
