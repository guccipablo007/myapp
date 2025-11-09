// src/app/members/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { getCurrentUserRole, type AppRole } from "@/lib/userRole";

function sb() {
  // supports both direct client and factory export
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

  // Issue Fine modal state
  const [fineOpen, setFineOpen] = useState(false);
  const [fineBusy, setFineBusy] = useState(false);
  const [fineErr, setFineErr] = useState<string | null>(null);
  const [fineMember, setFineMember] = useState<Member | null>(null);
  const [fineAmount, setFineAmount] = useState<string>("");
  const [fineReason, setFineReason] = useState<string>("");
  const [fineDate, setFineDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const canWrite = role === "sysadmin" || role === "secretary";

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
        if (!gone) setMembers((data ?? []) as Member[]);
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

  function openFineModal(m: Member) {
    setFineMember(m);
    setFineAmount("");
    setFineReason("");
    setFineDate(new Date().toISOString().slice(0, 10));
    setFineErr(null);
    setFineOpen(true);
  }

  async function submitFine() {
    if (!fineMember) return;
    const amt = Number(fineAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFineErr("Please enter a valid amount greater than 0.");
      return;
    }
    setFineBusy(true);
    setFineErr(null);

    try {
      // Insert into fines (assumes columns: member_id, amount (numeric), status ('paid'|'unpaid'), date (date), reason (text))
      const { error } = await supabase.from("fines").insert({
        member_id: fineMember.id,
        amount: amt,
        status: "unpaid",
        date: fineDate || null,
        reason: fineReason?.trim() || null,
      });

      if (error) throw error;

      // Close modal on success
      setFineOpen(false);
    } catch (e: any) {
      setFineErr(e?.message || "Failed to issue fine");
    } finally {
      setFineBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/members"
            className="hidden md:inline-block rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
            title="Refresh"
          >
            Refresh
          </Link>
          {(role === "sysadmin" || role === "secretary") && (
            <Link
              href="/members/new"
              className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              + Add Member
            </Link>
          )}
        </div>
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
                <th className="py-2 px-4 text-right">Actions</th>
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
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/members/${m.id}`}
                        className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                        title="View profile"
                      >
                        View
                      </Link>
                      {canWrite && (
                        <button
                          onClick={() => openFineModal(m)}
                          className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                          title="Issue fine"
                        >
                          Issue Fine
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-white/60 text-center">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue Fine Modal */}
      {fineOpen && fineMember && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !fineBusy && setFineOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 mx-auto w-[min(92vw,520px)] rounded-xl border border-white/10 bg-black/95 p-5">
            <h3 className="text-sm font-medium">
              Issue Fine — <span className="text-white/70">{fineMember.full_name}</span>
            </h3>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs text-white/70">Amount (CFA)</label>
                <input
                  inputMode="decimal"
                  placeholder="e.g. 1000"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs text-white/70">Reason (optional)</label>
                <input
                  placeholder="e.g. Late attendance"
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs text-white/70">Date</label>
                <input
                  type="date"
                  value={fineDate}
                  onChange={(e) => setFineDate(e.target.value)}
                  className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                />
              </div>

              {fineErr ? (
                <p className="text-sm text-red-400">{fineErr}</p>
              ) : (
                <p className="text-[11px] text-white/40">
                  This will create an <code>unpaid</code> fine record in the <code>fines</code> table.  
                  Your Finances page will update automatically.
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setFineOpen(false)}
                disabled={fineBusy}
                className="rounded px-3 py-1.5 text-sm border border-white/10 hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitFine}
                disabled={fineBusy}
                className="rounded px-3 py-1.5 text-sm border border-white/10 bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                {fineBusy ? "Saving…" : "Save Fine"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
