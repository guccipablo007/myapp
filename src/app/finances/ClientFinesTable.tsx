"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";

// Works whether you export a client or a factory function from lib/supabase
function sbClient() {
  const maybe: any = supabaseMaybe as any;
  return typeof maybe === "function" ? maybe() : maybe;
}

type FineRow = {
  id: number;
  member_id?: number | null;
  member_name?: string | null;
  amount: number;
  status: "paid" | "unpaid" | string;
  reason?: string | null;
  issued_on?: string | null;
  created_at?: string | null;
  paid_on?: string | null;
  paid_amount?: number | null;
  date?: string | null;
};

export default function ClientFinesTable() {
  const [rows, setRows] = useState<FineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // quick search
  const [q, setQ] = useState("");

  // new fine modal
  const [showNew, setShowNew] = useState(false);
  const [nfMemberId, setNfMemberId] = useState<string>("");
  const [nfAmount, setNfAmount] = useState<string>("");
  const [nfReason, setNfReason] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const s = sbClient();
      const { data, error } = await s
        .from("fines")
        .select("id, member_id, amount, status, reason, issued_on, created_at, paid_on, paid_amount, date")
        .order("date", { ascending: false })
        .limit(150);
      if (error) throw error;
      setRows((data ?? []) as FineRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load fines");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const parts = [
        r.member_name ?? "",
        r.member_id?.toString() ?? "",
        r.reason ?? "",
        r.status ?? "",
        r.amount?.toString() ?? "",
      ].join(" ").toLowerCase();
      return parts.includes(s);
    });
  }, [rows, q]);

  async function markPaid(row: FineRow) {
    const s = sbClient();
    const now = new Date().toISOString().slice(0, 10);
    const prev = [...rows];
    const optimistic = rows.map((r) =>
      r.id === row.id ? { ...r, status: "paid", paid_on: now, paid_amount: r.amount } : r
    );
    setRows(optimistic);
    const { error } = await s
      .from("fines")
      .update({ status: "paid", paid_on: now, paid_amount: row.amount })
      .eq("id", row.id);
    if (error) {
      setRows(prev);
      alert(`Failed to mark paid: ${error.message}`);
    }
  }

  async function markUnpaid(row: FineRow) {
    const s = sbClient();
    const prev = [...rows];
    const optimistic = rows.map((r) =>
      r.id === row.id ? { ...r, status: "unpaid", paid_on: null, paid_amount: null } : r
    );
    setRows(optimistic);
    const { error } = await s
      .from("fines")
      .update({ status: "unpaid", paid_on: null, paid_amount: null })
      .eq("id", row.id);
    if (error) {
      setRows(prev);
      alert(`Failed to mark unpaid: ${error.message}`);
    }
  }

  async function createFine() {
    if (!nfMemberId || !nfAmount) {
      alert("Please enter member ID and amount.");
      return;
    }
    const s = sbClient();
    const amt = Number(nfAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Amount must be a positive number.");
      return;
    }
    const issued = new Date().toISOString().slice(0, 10);
    const { error } = await s.from("fines").insert({
      member_id: Number(nfMemberId),
      amount: amt,
      status: "unpaid",
      reason: nfReason || null,
      issued_on: issued,
      date: issued,
    });
    if (error) {
      alert(`Failed to create fine: ${error.message}`);
      return;
    }
    setShowNew(false);
    setNfMemberId("");
    setNfAmount("");
    setNfReason("");
    await load();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
      {/* Header / actions */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <div className="text-sm font-medium text-white/90">Fines (Admin Controls)</div>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fines…"
            className="bg-transparent border border-white/10 rounded px-2 py-1 text-sm outline-none placeholder:text-white/40"
          />
          <button
            onClick={() => setShowNew(true)}
            className="rounded border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 px-2 py-1 text-sm"
            title="Issue a new fine (sysadmin/secretary)"
          >
            + Issue Fine
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="rounded border border-white/10 px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="px-4 py-2 text-red-400 text-sm">{err}</div>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-white/60 bg-white/5">
            <tr>
              <th className="py-2 px-4">Date</th>
              <th className="py-2 px-4">Member</th>
              <th className="py-2 px-4">Amount</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Reason</th>
              <th className="py-2 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.length === 0 && !loading && !err && (
              <tr>
                <td colSpan={6} className="py-4 px-4 text-white/60">
                  No fines found.
                </td>
              </tr>
            )}
            {filtered.map((f) => {
              const date = f.date ?? f.issued_on ?? f.created_at ?? null;
              const dateTxt = date ? new Date(date).toLocaleDateString() : "—";
              const member = f.member_name ?? (f.member_id != null ? `#${f.member_id}` : "—");
              const statusChip =
                f.status === "paid"
                  ? "border-green-500/30 text-green-300 bg-green-500/10"
                  : f.status === "unpaid"
                  ? "border-yellow-400/30 text-yellow-200 bg-yellow-400/10"
                  : "border-blue-400/30 text-blue-200 bg-blue-400/10";

              return (
                <tr key={f.id} className="hover:bg-white/5">
                  <td className="py-2 px-4">{dateTxt}</td>
                  <td className="py-2 px-4">{member}</td>
                  <td className="py-2 px-4">{formatCurrency(f.amount, "XAF")}</td>
                  <td className="py-2 px-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide border ${statusChip}`}>
                      {f.status}
                    </span>
                    {f.paid_on && (
                      <span className="ml-2 text-xs text-white/50">
                        ({new Date(f.paid_on).toLocaleDateString()})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4">{f.reason || "—"}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {f.status === "paid" ? (
                        <button
                          onClick={() => markUnpaid(f)}
                          className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                          title="Mark Unpaid"
                        >
                          Mark Unpaid
                        </button>
                      ) : (
                        <button
                          onClick={() => markPaid(f)}
                          className="rounded border border-green-500/40 text-green-300 hover:bg-green-500/10 px-2 py-1 text-xs"
                          title="Mark Paid"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-white/60 border-top border-white/10">
        <div>Showing {filtered.length} record(s)</div>
      </div>

      {/* New Fine Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0E1020] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/90 font-medium">Issue New Fine</div>
              <button
                onClick={() => setShowNew(false)}
                className="text-white/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Member ID</label>
                <input
                  value={nfMemberId}
                  onChange={(e) => setNfMemberId(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Amount (XAF)</label>
                <input
                  value={nfAmount}
                  onChange={(e) => setNfAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Reason (optional)</label>
                <input
                  value={nfReason}
                  onChange={(e) => setNfReason(e.target.value)}
                  placeholder="Late meeting, absent, etc."
                  className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNew(false)}
                className="rounded border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={createFine}
                className="rounded border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 px-3 py-1.5 text-sm"
                title="Requires secretary/sysadmin role via RLS"
              >
                Create Fine
              </button>
            </div>
            <p className="text-[11px] text-white/40 mt-3">
              Note: Role-based policies (RLS) will block this if your account is not Secretary or SysAdmin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
