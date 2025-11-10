// src/app/members/page.tsx
import Link from "next/link";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import ClientAvatar from "./ClientAvatar";

/** Support both shapes of your supabase export (factory or already-made client). */
function sb() {
  // @ts-expect-error tolerate either a function or a client object
  const s = typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
  return s;
}

type MemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null; // we display this as "Joined"
};

export const revalidate = 0; // fetch fresh while iterating

export default async function MembersPage() {
  const s = sb();

  // Select only safe, known columns
  const { data, error } = await s
    .from("members")
    .select("id, full_name, email, role, status, created_at")
    .order("full_name", { ascending: true });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Members Directory</h1>
        <p className="text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  const members = (data ?? []) as MemberRow[];

  // Build storage public URL candidates for each member avatar
  const storage = s.storage.from("avatars");
  const exts = ["png", "jpg", "jpeg", "webp"] as const;
  const avatarUrlsById = new Map<string, string[]>();

  for (const m of members) {
    const candidates: string[] = [];
    for (const ext of exts) {
      const path = `${m.id}.${ext}`;
      const { data: pub } = storage.getPublicUrl(path);
      if (pub?.publicUrl) candidates.push(pub.publicUrl);
    }
    avatarUrlsById.set(m.id, candidates);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Members Directory</h1>
          <p className="text-sm text-neutral-400">Manage members, roles, and actions.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="h-10 w-56 rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 text-sm outline-none focus:border-neutral-600"
            placeholder="Search members…"
          />
          <select
            className="h-10 rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 text-sm outline-none focus:border-neutral-600"
            defaultValue="all"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Link
            href="/finances"
            className="h-10 inline-flex items-center rounded-lg bg-amber-500/90 hover:bg-amber-500 px-4 text-sm font-medium text-black"
          >
            Open Finances
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/60 text-neutral-300">
            <tr>
              <Th className="w-16">Avatar</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th className="w-40 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-neutral-500">
                  No members found.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const joined = m.created_at
                  ? new Date(m.created_at).toLocaleDateString()
                  : "—";
                const name = m.full_name ?? "—";
                const email = m.email ?? "—";
                const role = m.role ?? "member";
                const status = (m.status ?? "active").toLowerCase();
                const candidates = avatarUrlsById.get(m.id) ?? [];

                return (
                  <tr
                    key={m.id}
                    className="border-t border-neutral-800 hover:bg-neutral-900/40"
                  >
                    <Td>
                      <ClientAvatar
                        candidates={candidates}
                        fallbackName={name}
                        size={36}
                      />
                    </Td>
                    <Td className="font-medium">{name}</Td>
                    <Td className="text-neutral-300">{email}</Td>
                    <Td>
                      <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs uppercase tracking-wide">
                        {role}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide border ${
                          status === "active"
                            ? "border-emerald-600 text-emerald-400"
                            : "border-neutral-600 text-neutral-400"
                        }`}
                      >
                        {status}
                      </span>
                    </Td>
                    <Td className="text-neutral-300">{joined}</Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/members/${m.id}`}
                          className="rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
                        >
                          View
                        </Link>
                        <Link
                          href={`/finances?member=${encodeURIComponent(m.id)}`}
                          className="rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
                        >
                          Finance
                        </Link>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tiny helper for users: where to upload their avatar */}
      <p className="mt-3 text-xs text-neutral-500">
        Tip: Avatars are loaded from the <code>avatars</code> storage bucket using file names like{" "}
        <code>{`<member_id>.png|jpg|jpeg|webp`}</code>. (Example: <code>2c0f...</code>
        <code>.png</code>)
      </p>
    </div>
  );
}

/* ---------- small presentational helpers (no external deps) ---------- */

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`text-left font-semibold text-xs uppercase tracking-wide px-4 py-3 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
