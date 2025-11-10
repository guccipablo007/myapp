// src/app/members/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import IssueFineDialog from "@/components/IssueFineDialog";
import { supabase as supabaseMaybe } from "@/lib/supabase";

function sb() {
  const maybe: any = supabaseMaybe as any;
  return typeof maybe === "function" ? maybe() : maybe;
}

type Member = {
  id: number;
  full_name: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  joined?: string | null;
  created_at?: string | null;
  avatar_url?: string | null;
};

export default function MembersPage() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "admin">("all");

  // dialog state
  const [fineOpen, setFineOpen] = useState(false);
  const [fineMemberId, setFineMemberId] = useState<number | null>(null);
  const [fineMemberName, setFineMemberName] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const s = sb();
      // keep columns flexible to your schema
      const { data, error } = await s
        .from("members")
        .select("id, full_name, email, role, status, joined, created_at, avatar_url")
        .order("id", { ascending: true })
        .limit(500);
      if (error) throw error;
      setRows((data ?? []) as Member[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = [...rows];
    if (filter === "active") r = r.filter((x) => (x.status ?? "").toLowerCase() === "active");
    if (filter === "inactive") r = r.filter((x) => (x.status ?? "").toLowerCase() !== "active");
    if (filter === "admin") r = r.filter((x) => ["sysadmin", "secretary"].includes((x.role ?? "").toLowerCase()));
    const s = q.trim().toLowerCase();
    if (!s) return r;
    return r.filter((x) =>
      [
        x.full_name ?? "",
        x.email ?? "",
        x.role ?? "",
        x.status ?? "",
        x.id?.toString() ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, filter, q]);

  function openIssueFine(member: Member) {
    setFineMemberId(member.id);
    setFineMemberName(member.full_name || `#${member.id}`);
    setFineOpen(true);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Members Directory</h1>
          <p className="text-sm text-white/60">Manage members, roles, and actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members…"
            className="bg-transparent border border-white/10 rounded px-2 py-1 text-sm outline-none placeholder:text-white/40"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-transparent border border-white/10 rounded px-2 py-1 text-sm"
            title="Filter"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="admin">Admins</option>
          </select>
          <Link
            href="/finances"
            className="rounded border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 px-3 py-1.5 text-sm"
            title="Go to Finances"
          >
            Open Finances
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-white/60 bg-white/5">
            <tr>
              <th className="py-2 px-4">Avatar</th>
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Email</th>
              <th className="py-2 px-4">Role</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Joined</th>
              <th className="py-2 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.length === 0 && !loading && !err && (
              <tr>
                <td colSpan={7} className="py-4 px-4 text-white/60">
                  No members found.
                </td>
              </tr>
            )}
            {filtered.map((m) => {
              const joined =
                m.joined || m.created_at
                  ? new Date(m.joined || (m.created_at as string)).toLocaleDateString()
                  : "—";
              const role = (m.role ?? "member").toString();
              const status = (m.status ?? "active").toString();
              const roleChip =
                role.toLowerCase() === "sysadmin"
                  ? "border-purple-400/40 text-purple-200 bg-purple-400/10"
                  : role.toLowerCase() === "secretary"
                  ? "border-blue-400/40 text-blue-200 bg-blue-400/10"
                  : "border-white/15 text-white/70";

              const statChip =
                status.toLowerCase() === "active"
                  ? "border-green-500/40 text-green-200 bg-green-500/10"
                  : "border-yellow-500/40 text-yellow-200 bg-yellow-500/10";

              return (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="py-2 px-4">
                    <div className="h-8 w-8 rounded-full bg-white/10 overflow-hidden grid place-items-center">
                      {m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar_url} alt="" className="h-8 w-8 object-cover" />
                      ) : (
                        <span className="text-xs opacity-70">👤</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4">{m.full_name || `Member #${m.id}`}</td>
                  <td className="py-2 px-4">{m.email || "—"}</td>
                  <td className="py-2 px-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs border ${roleChip}`}>{role}</span>
                  </td>
                  <td className="py-2 px-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs border ${statChip}`}>{status}</span>
                  </td>
                  <td className="py-2 px-4">{joined}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/members/${m.id}`}
                        className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                        title="View"
                      >
                        View
                      </Link>
                      {/* Issue Fine (role checks enforced by RLS) */}
                      <button
                        onClick={() => openIssueFine(m)}
                        className="rounded border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 px-2 py-1 text-xs"
                        title="Issue Fine (Secretary/SysAdmin)"
                      >
                        Issue Fine
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && <div className="p-4 text-sm text-white/60">Loading…</div>}
        {err && <div className="p-4 text-sm text-red-400">{err}</div>}
      </div>

      {/* Modal */}
      <IssueFineDialog
        open={fineOpen}
        onClose={() => setFineOpen(false)}
        memberId={fineMemberId}
        memberName={fineMemberName}
        onIssued={load}
      />
    </div>
  );
}
