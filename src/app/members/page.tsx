// src/app/members/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { getCurrentUserRole, type AppRole } from "@/lib/userRole";

function sb() {
  // supports both direct and factory exports
  // @ts-ignore
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

type Member = {
  id: number;
  full_name: string;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  joined_at?: string | null;
};

export default function MembersPage() {
  const supabase = sb();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("guest");

  useEffect(() => {
    let gone = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const r = await getCurrentUserRole();
        if (!gone) setRole(r);
        const { data, error } = await supabase
          .from("members")
          .select("id, full_name, email, role, status, joined_at")
          .order("full_name", { ascending: true });
        if (error) throw error;
        if (!gone) setMembers(data ?? []);
      } catch (e: any) {
        if (!gone) setErr(e?.message || "Failed to load members");
      } finally {
        if (!gone) setLoading(false);
      }
    }
    load();
    return () => {
      gone = true;
    };
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        {role === "sysadmin" || role === "secretary" ? (
          <Link
            href="/members/new"
            className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            + Add Member
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-white/70">Loading…</p>
      ) : err ? (
        <p className="text-sm text-red-400">{err}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Role</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="py-2 px-4">
                    <Link
                      href={`/members/${m.id}`}
                      className="text-yellow-300 hover:underline"
                    >
                      {m.full_name}
                    </Link>
                  </td>
                  <td className="py-2 px-4">{m.email || "—"}</td>
                  <td className="py-2 px-4">
                    {m.role ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-wide">
                        {m.role}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide border ${
                        (m.status ?? "active") === "active"
                          ? "border-green-500/30 text-green-300 bg-green-500/10"
                          : "border-yellow-400/30 text-yellow-200 bg-yellow-400/10"
                      }`}
                    >
                      {m.status ?? "active"}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    {m.joined_at
                      ? new Date(m.joined_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-white/60 text-center">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
