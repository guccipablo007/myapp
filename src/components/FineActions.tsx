// src/components/FineActions.tsx
"use client";

import { useState } from "react";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { getCurrentUserRole } from "@/lib/userRole";

function sb() {
  // supports both: client or factory
  // @ts-ignore
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

export type FineRow = {
  id: number;
  member_id: number;
  amount: number;
  status: "paid" | "unpaid";
  date: string | null;
  reason: string | null;
  paid_on: string | null;
  paid_amount: number | null;
};

export function FineActions({ fine, onChanged }: { fine: FineRow; onChanged?: () => void }) {
  const supabase = sb();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hist, setHist] = useState<any[]>([]);
  const [role, setRole] = useState<"guest"|"sysadmin"|"secretary"|"member">("guest");

  // Resolve role once (lazy)
  async function ensureRole() {
    if (role === "guest") {
      const r = await getCurrentUserRole();
      setRole(r);
    }
  }

  async function markPaid() {
    await ensureRole();
    if (role !== "sysadmin" && role !== "secretary") {
      setErr("Only sysadmin/secretary can mark as paid.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.from("fines").update({
        status: "paid",
        paid_on: new Date().toISOString().slice(0,10),
        paid_amount: fine.amount,
      }).eq("id", fine.id).single();
      if (error) throw error;
      onChanged?.();
    } catch (e:any) {
      setErr(e?.message || "Failed to mark as paid");
    } finally { setBusy(false); }
  }

  async function disburse() {
    await ensureRole();
    if (role !== "sysadmin" && role !== "secretary") {
      setErr("Only sysadmin/secretary can disburse.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      // Creates a disbursement record (simple amount==fine.amount, adjust as needed)
      const { error } = await supabase.from("fine_disbursements").insert({
        fine_id: fine.id,
        amount: fine.amount,
        disbursed_on: new Date().toISOString().slice(0,10),
        note: "Manual disbursement",
      });
      if (error) throw error;
      onChanged?.();
    } catch (e:any) {
      setErr(e?.message || "Failed to create disbursement");
    } finally { setBusy(false); }
  }

  async function loadHistory() {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase
        .from("fine_disbursements")
        .select("*")
        .eq("fine_id", fine.id)
        .order("disbursed_on", { ascending: false });
      if (error) throw error;
      setHist(data || []);
      setShowHistory(true);
    } catch (e:any) {
      setErr(e?.message || "Failed to load history");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={busy || fine.status === "paid"}
        onClick={markPaid}
        className="rounded border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/20 disabled:opacity-60"
        title="Mark fine as paid"
      >
        {fine.status === "paid" ? "Paid" : "Mark Paid"}
      </button>

      <button
        disabled={busy}
        onClick={disburse}
        className="rounded border border-white/10 bg-violet-600/20 px-2 py-1 text-xs hover:bg-violet-600/30 disabled:opacity-60"
        title="Record disbursement"
      >
        Disburse
      </button>

      <button
        disabled={busy}
        onClick={loadHistory}
        className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-60"
        title="View disbursement history"
      >
        History
      </button>

      {err && <span className="text-xs text-red-400">{err}</span>}

      {showHistory && (
        <div className="w-full border border-white/10 rounded-lg p-2 bg-black/30">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Disbursement History</div>
            <button onClick={() => setShowHistory(false)} className="text-xs text-white/60 hover:text-white">Close</button>
          </div>
          <div className="mt-2 space-y-1 text-xs text-white/80">
            {hist.length === 0 && <div>No disbursements yet.</div>}
            {hist.map((h) => (
              <div key={h.id} className="flex items-center justify-between">
                <div>{h.disbursed_on}</div>
                <div className="opacity-80">{h.note || "—"}</div>
                <div>{Number(h.amount).toLocaleString()} CFA</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
