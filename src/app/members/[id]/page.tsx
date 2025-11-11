import Link from "next/link";
import { supabase as supabaseMaybe, SupabaseClient } from "@/lib/supabase";
import ClientAvatar from "../ClientAvatar";

function sb(): SupabaseClient {
  const s: unknown = supabaseMaybe;
  if (typeof s === "function") {
    return s();
  }
  return s as SupabaseClient;
}

export const revalidate = 0;

type PageProps = {
  params: {
    id: string;
  };
};

export default async function MemberDetailPage({ params }: PageProps) {
  const s = sb();
  const id = params?.id;

  const { data, error } = await s
    .from("members")
    .select("id, full_name, email, role, status, created_at")
    .eq("id", id)
    .single();

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Member</h1>
        <p className="text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  const m = data ?? {};
  const storage = s.storage.from("avatars");
  const avatarCandidates: string[] = [];
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const path = `${m.id}.${ext}`;
    const { data: pub } = storage.getPublicUrl(path);
    if (pub?.publicUrl) avatarCandidates.push(pub.publicUrl);
  }

  const joined = m.created_at ? new Date(m.created_at).toLocaleDateString() : "—";
  const name = m.full_name ?? "—";
  const email = m.email ?? "—";
  const role = m.role ?? "member";
  const status = (m.status ?? "active").toLowerCase();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/members"
          className="rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 text-sm"
        >
          ← Back
        </Link>

        <Link
          href={`/members/${m.id}/edit`}
          className="rounded-lg bg-amber-500/90 hover:bg-amber-500 px-4 py-2 text-sm font-medium text-black"
        >
          Edit Profile
        </Link>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-neutral-800 p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ClientAvatar candidates={avatarCandidates} fallbackName={name} size={64} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{name}</h1>
              <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs uppercase tracking-wide">
                {role}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide border ${
                  status === "active"
                    ? "border-emerald-600 text-emerald-400"
                    : "border-neutral-600 text-neutral-400"
                }`}
              >
                {status}
              </span>
            </div>
            <div className="text-sm text-neutral-400">{email}</div>
            <div className="text-xs text-neutral-500">Joined: {joined}</div>
          </div>
        </div>
      </div>

      {/* Overview / Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="text-sm text-neutral-400 mb-1">Overview</div>
          <div className="text-xs text-neutral-500">Member ID: <code>{m.id}</code></div>
          <div className="text-xs text-neutral-500">Role: {role}</div>
          <div className="text-xs text-neutral-500">Status: {status}</div>
        </div>

        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="text-sm text-neutral-400 mb-1">Quick Actions</div>
          <div className="flex gap-2">
            <Link
              href={`/finances?member=${encodeURIComponent(m.id)}`}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 text-sm"
            >
              Open Finances
            </Link>
            <Link
              href={`/members/${m.id}/edit`}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 text-sm"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
