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
  author_name?: string | null; // optional convenience if you join later
};

export default function AnnouncementsPage() {
  const supabase = sb();
  const [role, setRole] = useState<AppRole>("guest");
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form state (only for sysadmin/secretary)
  const [openForm, setOpenForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // simple search
  const [q, setQ] = useState("");

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
          .limit(100);
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

  const canWrite = role === "sysadmin" || role === "secretary";

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
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{a.title}</h3>
                  <span className="text-xs text-white/60">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                {a.body ? (
                  <p className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{a.body}</p>
                ) : null}

                <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                  {/* If later you add details page, link it here */}
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

      {/* Footer note */}
      <p className="text-[11px] text-white/40">
        Table: <code>announcements</code> — fields used: <code>id</code>, <code>title</code>,{" "}
        <code>body</code>, <code>created_at</code>, <code>author_id</code>.
      </p>
    </div>
  );
}
