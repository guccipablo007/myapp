// src/components/NotificationsDrawer.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import { formatCurrency, formatNumber } from "@/lib/format";
import { SupabaseClient } from "@supabase/supabase-js";

function sb(): SupabaseClient {
  const s: unknown = supabaseMaybe;
  if (typeof s === "function") {
    return s();
  }
  return s as SupabaseClient;
}

type Item = {
  id: string;                // unique id (string for cross-table)
  kind: "announcement" | "meeting" | "finance";
  title: string;
  note?: string;
  date?: string;             // ISO
  href?: string;
};

const READ_KEY = "camsu.notifications.read.v1";

export default function NotificationsDrawer() {
  const supabase = sb();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  // load read ids from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      if (raw) setReadIds(JSON.parse(raw));
    } catch {}
  }, []);

  const saveReadIds = useCallback((ids: string[]) => {
    setReadIds(ids);
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(ids));
    } catch {}
  }, []);

  const markAllRead = useCallback(() => {
    saveReadIds(Array.from(new Set([...readIds, ...items.map(i => i.id)])));
  }, [items, readIds, saveReadIds]);

  const toggleOpen = useCallback(() => setOpen(v => !v), []);

  useEffect(() => {
    let gone = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const now = new Date();
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(now.getDate() - 14);
        const twoWeeksISO = twoWeeksAgo.toISOString();

        const nextTwoWeeks = new Date(now);
        nextTwoWeeks.setDate(now.getDate() + 14);
        const nextTwoWeeksISO = nextTwoWeeks.toISOString();

        const [
          a, // announcements in last 14d
          m, // meetings in next 14d
          funpaid, // unpaid fines
          lall, // loans (to compute outstanding)
        ] = await Promise.all([
          supabase
            .from("announcements")
            .select("id,title,created_at")
            .gte("created_at", twoWeeksISO)
            .order("created_at", { ascending: false })
            .limit(30),

          supabase
            .from("meetings")
            .select("id,title,scheduled_for")
            .gte("scheduled_for", now.toISOString())
            .lte("scheduled_for", nextTwoWeeksISO)
            .order("scheduled_for", { ascending: true })
            .limit(30),

          supabase
            .from("fines")
            .select("amount,status")
            .eq("status", "unpaid"),

          supabase
            .from("loans")
            .select("amount,amount_issued,amount_repaid,status"),
        ]);

        if (gone) return;

        const ann: Item[] =
          a.data?.map((r: { id: number; title: string; created_at: string }) => ({
            id: `a:${r.id}`,
            kind: "announcement",
            title: r.title,
            note: new Date(r.created_at).toLocaleString(),
            date: r.created_at,
            href: "/announcements",
          })) ?? [];

        const meets: Item[] =
          m.data?.map((r: { id: number; title: string; scheduled_for: string }) => ({
            id: `m:${r.id}`,
            kind: "meeting",
            title: r.title,
            note: new Date(r.scheduled_for).toLocaleString(),
            date: r.scheduled_for,
            href: "/meetings",
          })) ?? [];

        let unpaid = 0;
        if (funpaid.data) {
          unpaid = funpaid.data.reduce((t: number, x: { amount: unknown }) => t + Number(x.amount || 0), 0);
        }

        let outstanding = 0;
        if (lall.data) {
          outstanding = lall.data.reduce((t: number, x: { amount_issued: unknown; amount: unknown; amount_repaid: unknown; status: unknown }) => {
            const issued = Number(x.amount_issued ?? x.amount ?? 0);
            const repaid = Number(x.amount_repaid ?? 0);
            const st = String(x.status || "").toLowerCase();
            const bal = ["active", "outstanding", "issued"].includes(st) ? Math.max(0, issued - repaid) : 0;
            return t + bal;
          }, 0);
        }

        const finance: Item[] = [
          {
            id: `f:unpaid`,
            kind: "finance",
            title: `Unpaid fines: ${formatCurrency(unpaid)}`,
            note: unpaid > 0 ? "Please review and collect" : "All clear",
            date: new Date().toISOString(),
            href: "/finances",
          },
          {
            id: `f:outstanding`,
            kind: "finance",
            title: `Outstanding loans: ${formatCurrency(outstanding)}`,
            note: outstanding > 0 ? "Track repayments" : "No outstanding balance",
            date: new Date().toISOString(),
            href: "/finances",
          },
        ];

        // combine: meetings upcoming first, then announcements, then finance
        const combined = [...meets, ...ann, ...finance].sort((a, b) => {
          // newest first when both have date
          if (a.date && b.date) return b.date.localeCompare(a.date);
          return 0;
        });

        setItems(combined);
      } catch (e) {
        let message = "Failed to load notifications";
        if (e instanceof Error) {
          message = e.message;
        }
        setErr(message);
      } finally {
        if (!gone) setLoading(false);
      }
    }
    load();
    return () => { gone = true; };
  }, [supabase]);

  const unreadCount = useMemo(
    () => items.filter(i => !readIds.includes(i.id)).length,
    [items, readIds]
  );

  const markOneRead = useCallback((id: string) => {
    if (readIds.includes(id)) return;
    saveReadIds([...readIds, id]);
  }, [readIds, saveReadIds]);

  return (
    <>
      {/* Floating bell button */}
      <button
        onClick={toggleOpen}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-white/15 bg-black/70 backdrop-blur px-4 py-3 text-sm hover:bg-black/60"
        aria-label="Open notifications"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="ml-2 rounded-full bg-red-600/80 px-2 py-0.5 text-xs">
            {formatNumber(unreadCount)}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* panel */}
          <div
            className="absolute right-0 top-0 h-full w-[min(92vw,420px)] border-l border-white/10 bg-black/95 p-4 overflow-y-auto"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Notifications</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/10"
                >
                  Mark all read
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>

            {err ? (
              <p className="mt-3 text-sm text-red-400">{err}</p>
            ) : loading ? (
              <p className="mt-3 text-sm text-white/70">Loading…</p>
            ) : items.length === 0 ? (
              <p className="mt-3 text-sm text-white/70">No notifications.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className={`rounded-lg border px-3 py-2 ${
                      readIds.includes(it.id)
                        ? "border-white/10 bg-white/5"
                        : "border-yellow-400/30 bg-yellow-400/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wide text-white/50">
                          {it.kind}
                        </div>
                        <div className="font-medium truncate">{it.title}</div>
                        {it.note ? (
                          <div className="mt-0.5 text-xs text-white/60">{it.note}</div>
                        ) : null}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {!readIds.includes(it.id) && (
                          <button
                            onClick={() => markOneRead(it.id)}
                            className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/10"
                            title="Mark as read"
                          >
                            Read
                          </button>
                        )}
                        {it.href ? (
                          <Link
                            href={it.href}
                            onClick={() => markOneRead(it.id)}
                            className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/10"
                          >
                            Open
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-[11px] text-white/40">
              Sources: <code>announcements</code> (last 14d), <code>meetings</code> (next 14d),
              and finance snapshot (unpaid fines + outstanding loans).
            </p>
          </div>
        </div>
      )}
    </>
  );
}
