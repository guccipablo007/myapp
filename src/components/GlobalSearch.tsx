// src/components/GlobalSearch.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase as supabaseMaybe, SupabaseClient } from "@/lib/supabase";

function sb(): SupabaseClient {
  const s: unknown = supabaseMaybe;
  if (typeof s === "function") {
    return s();
  }
  return s as SupabaseClient;
}

type GroupedResults = {
  members: { id: number; full_name: string }[];
  meetings: { id: number; title: string }[];
  projects: { id: number; name: string }[];
  announcements: { id: number; title: string }[];
};

const initial: GroupedResults = { members: [], meetings: [], projects: [], announcements: [] };

export default function GlobalSearch() {
  const supabase = sb();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<GroupedResults>(initial);
  const boxRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // debounce
  const debouncedQ = useDebounce(q, 250);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debouncedQ || debouncedQ.trim().length < 2) {
        setRes(initial);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [m, meet, p, a] = await Promise.all([
          supabase
            .from("members")
            .select("id, full_name")
            .ilike("full_name", `%${debouncedQ}%`)
            .limit(5),
          supabase
            .from("meetings")
            .select("id, title")
            .ilike("title", `%${debouncedQ}%`)
            .limit(5),
          supabase
            .from("projects")
            .select("id, name")
            .ilike("name", `%${debouncedQ}%`)
            .limit(5),
          supabase
            .from("announcements")
            .select("id, title")
            .ilike("title", `%${debouncedQ}%`)
            .limit(5),
        ]);

        if (!cancelled) {
          setRes({
            members: m.data ?? [],
            meetings: meet.data ?? [],
            projects: p.data ?? [],
            announcements: a.data ?? [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, supabase]);

  const any = useMemo(
    () =>
      (res.members?.length ?? 0) +
      (res.meetings?.length ?? 0) +
      (res.projects?.length ?? 0) +
      (res.announcements?.length ?? 0),
    [res]
  );

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search members, meetings, projects, announcements…"
        className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
        aria-label="Global search"
      />

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-lg border border-white/10 bg-black/90 backdrop-blur p-2">
          {loading ? (
            <RowMuted>Searching…</RowMuted>
          ) : any === 0 ? (
            debouncedQ.trim().length >= 2 ? (
              <RowMuted>No results</RowMuted>
            ) : (
              <RowMuted>Type at least 2 characters</RowMuted>
            )
          ) : (
            <div className="max-h-80 overflow-auto space-y-2">
              <Group title="Members" items={res.members} hrefBase="/members" labelKey="full_name" />
              <Group title="Meetings" items={res.meetings} hrefBase="/meetings" labelKey="title" />
              <Group title="Projects" items={res.projects} hrefBase="/projects" labelKey="name" />
              <Group
                title="Announcements"
                items={res.announcements}
                hrefBase="/meetings"
                labelKey="title"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  items,
  hrefBase,
  labelKey,
}: {
  title: string;
  items: { id: number; [key: string]: unknown }[];
  hrefBase: string;
  labelKey: "full_name" | "title" | "name";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-white/40 px-2">{title}</div>
      <ul className="mt-1">
        {items.map((x) => (
          <li key={x.id}>
            <Link
              className="block px-2 py-1.5 rounded hover:bg-white/10 text-sm"
              href={
                hrefBase === "/members"
                  ? `/members/${x.id}`
                  : hrefBase === "/meetings"
                  ? `/meetings` // if you later add /meetings/[id], change to `/meetings/${x.id}`
                  : hrefBase === "/projects"
                  ? `/projects`
                  : hrefBase
              }
            >
              {x[labelKey]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowMuted({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-1.5 text-sm text-white/60">{children}</div>;
}

function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
