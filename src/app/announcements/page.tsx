// src/app/announcements/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { getCurrentUserRole, type AppRole } from "@/lib/userRole";
import { formatNumber } from "@/lib/format";

function sb() {
  // supports both: exported client or factory function
  // @ts-ignore
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

type Announcement = {
  id: number;
  title: string;
  body?: string | null;
  created_at: string;
  author_id?: string | null;
};

export default function AnnouncementsPage() {
  const supabase = sb();
  const [role, setRole] = useState<AppRole>("guest");

  // list & filters
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // create form
  const [openForm, setOpenForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  // delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const canWrite = role === "sysadmin" || role === "secretary";

  useEffect(() => {
    let gone = false;
    async function boot() {
      setLoading(true);
      setErr(null);
      try {
        const r = await getCurrentUserRole();
        if (!gone) setRole(r);
      } catch {
        if (!gone) setRole("guest");
      }

      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("id,title,body,created_at,author_id")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (!gone) setRows((data ?? []) as Announcement[]);
      } catch (e: any) {
        if (!gone) setErr(e?.message || "Failed to load announcements");
      } finally {
        if (!gone) setLoading(false);
      }
    }
    boot();
    return () => {
      gone = true;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.title?.toLowerCase().includes(term) ||
        (r.body ?? "").toLowerCase().includes(term)
    );
  }, [q, rows]);

  async function createAnnouncement() {
    if (!title.trim()) return;
    setErr(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: title.trim(),
          body: body.trim() || null,
          author_id: userId,
        })
        .select("id,title,body,created_at,author_id")
        .single();

      if (error) throw error;
      setRows((prev) => [data as Announcement, ...prev]);
      setTitle("");
      setBody("");
      setOpenForm(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to create announcement");
    }
  }

  function beginEdit(a: Announcement) {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditBody(a.body ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editTitle.trim()) return;

    setErr(null);
    // optimistic
    const prev = [...rows];
    const idx = rows.findIndex((r) => r.id === editingId);
    if (idx >= 0) {
      const updated = { ...rows[idx], title: editTitle.trim(), body: editBody.trim() || null };
      setRows([...rows.slice(0, idx), updated, ...rows.slice(idx + 1)]);
    }

    try {
      const { data, error } = await supabase
        .from("announcements")
        .update({
          title: editTitle.trim(),
          body: editBody.trim() || null,
        })
        .eq("id", editingId)
        .select("id,title,body,created_at,author_id")
        .single();
      if (error) throw error;

      // ensure canonical row is in state
      const idx2 = prev.findIndex((r) => r.id === editingId);
      if (idx2 >= 0) {
        const next = [...prev];
        next[idx2] = data as Announcement;
        setRows(next);
      }
      cancelEdit();
    } catch (e: any) {
      setErr(e?.message || "Failed to update announcement");
      // revert optimistic change
      setRows(prev);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setErr(null);

    // optimistic
    const prev = [...rows];
    setRows(prev.filter((r) => r.id !== deleteId));

    try {
      const { error } = await supabase.from("announcements").delete().eq("id", deleteId);
      if (error) throw error;
      setDeleteId(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to delete announcement");
      setRows(prev);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-white/60">
            Broadcast updates to all members. {formatNumber(rows.length)} total.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            placeholder="Search announcements…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
          />
          {canWrite && (
            <button
              onClick={() => setOpenForm((v) => !v)}
              className="rounded-lg px-3 py-2 text-sm border border-white/10 bg-white/5 hover:bg-white/10"
              title="Post new announcement"
            >
              + New
            </button>
          )}
        </div>
      </div>

      {/* New announcement form (SysAdmin/Secretary) */}
      {canWrite && openForm && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
          <div className="grid gap-2">
            <label className="text-sm text-white/70">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              placeholder="Short, clear headline"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-white/70">Body (optional)</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              placeholder="Add details members should know…"
            />
          </div>

          {err ? <p className="text-sm text-red-400">{err}</p> : null}

          <div className="flex items-center gap-2">
            <button
              onClick={createAnnouncement}
              className="rounded-lg px-3 py-2 text-sm border border-white/10 bg-white/10 hover:bg-white/20"
            >
              Post
            </button>
            <button
              onClick={() => setOpenForm(false)}
              className="rounded-lg px-3 py-2 text-sm border border-white/10 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-white/10 bg-black/20">
        {loading ? (
          <div className="p-4 text-sm text-white/60">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-white/60">No announcements found.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {filtered.map((a) => (
              <li key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {editingId === a.id ? (
                      <>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded bg-black/30 border border-white/10 px-2 py-1 text-sm outline-none focus:border-white/20"
                        />
                        <textarea
                          rows={4}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="mt-2 w-full rounded bg-black/30 border border-white/10 px-2 py-1 text-sm outline-none focus:border-white/20"
                          placeholder="Details…"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={saveEdit}
                            className="rounded px-3 py-1.5 text-sm border border-white/10 bg-white/10 hover:bg-white/20"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded px-3 py-1.5 text-sm border border-white/10 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-medium truncate">{a.title}</h3>
                          <span className="text-xs text-white/60 shrink-0">
                            {new Date(a.created_at).toLocaleString()}
                          </span>
                        </div>
                        {a.body ? (
                          <p className="mt-1 text-sm text-white/80 whitespace-pre-wrap">
                            {a.body}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>

                  {/* Row actions */}
                  {canWrite && editingId !== a.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => beginEdit(a)}
                        className="rounded px-2 py-1 text-xs border border-white/10 hover:bg-white/10"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(a.id)}
                        className="rounded px-2 py-1 text-xs border border-red-500/30 text-red-300 hover:bg-red-500/10"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                  <Link
                    href="/meetings"
                    className="rounded px-2 py-1 border border-white/10 hover:bg-white/10"
                  >
                    Related meetings
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete confirm dialog */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/90 p-4">
            <h4 className="text-sm font-medium">Delete announcement?</h4>
            <p className="mt-1 text-sm text-white/70">
              This action cannot be undone.
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded px-3 py-1.5 text-sm border border-white/10 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded px-3 py-1.5 text-sm border border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-[11px] text-white/40">
        Table: <code>announcements</code> — fields used: <code>id</code>, <code>title</code>,{" "}
        <code>body</code>, <code>created_at</code>, <code>author_id</code>. Save your edits after changes.
      </p>
    </div>
  );
}
