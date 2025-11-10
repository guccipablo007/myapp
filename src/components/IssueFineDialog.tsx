"use client";

import { useState } from "react";
import { supabase as supabaseMaybe } from "@/lib/supabase";

function sb() {
  const maybe: any = supabaseMaybe as any;
  return typeof maybe === "function" ? maybe() : maybe;
}

export default function IssueFineDialog({
  open,
  onClose,
  memberId,
  memberName,
  onIssued,
}: {
  open: boolean;
  onClose: () => void;
  memberId: number | null;
  memberName?: string | null;
  onIssued?: () => void; // optional callback so parent can refresh
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const s = sb();

  if (!open) return null;

  async function submit() {
    if (!memberId) {
      alert("Missing member id");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      alert("Amount must be a positive number");
      return;
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await s.from("fines").insert({
        member_id: memberId,
        amount: amt,
        status: "unpaid",
        reason: reason || null,
        issued_on: today,
        date: today,
      });
      if (error) throw error;
      onClose();
      setAmount("");
      setReason("");
      onIssued?.();
    } catch (e: any) {
      alert(e?.message || "Failed to issue fine");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0E1020] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/90 font-medium">
            Issue Fine {memberName ? `to ${memberName}` : ""}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 mb-1">Member ID</label>
            <input
              value={memberId ?? ""}
              readOnly
              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm text-white/70"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Amount (XAF)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Late meeting, absent, etc."
              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="rounded border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 px-3 py-1.5 text-sm"
            title="Requires secretary/sysadmin role via RLS"
          >
            {loading ? "Issuing…" : "Issue Fine"}
          </button>
        </div>

        <p className="text-[11px] text-white/40 mt-3">
          Note: RLS policies will block this if your account is not Secretary or SysAdmin.
        </p>
      </div>
    </div>
  );
}
