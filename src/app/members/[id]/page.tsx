// src/app/members/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase as supabaseMaybe } from "@/lib/supabase";
import EditMemberPanel from "./EditMemberPanel";

function sb() {
  // @ts-expect-error – tolerate factory or client
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

type Member = {
  id: string;                 // bigint in DB, we read as string
  user_id: string | null;     // uuid (auth user)
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
};

export const revalidate = 0;

export default async function MemberProfilePage({
  params,
}: { params: { id?: string } }) {
  const s = sb();

  // --------- Guard: reject missing/undefined ----------
  const slug = (params.id ?? "").trim();
  if (!slug || slug.toLowerCase() === "undefined" || slug.toLowerCase() === "null") {
    notFound();
  }

  // Detect if slug is a UUID (user_id) or a numeric id
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = UUID_RE.test(slug);
  const column = isUuid ? "user_id" : "id";

  // For numeric id, also make sure it's digits only; if not, 404
  if (!isUuid && !/^[0-9]+$/.test(slug)) {
    notFound();
  }

  // --------- Load the member using the appropriate column ----------
  const { data: rows, error } = await s
    .from("members")
    .select("id,user_id,full_name,email,role,status,created_at")
    .eq(column, slug) // string is fine for both bigint and uuid here
    .limit(1);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Member</h1>
        <p className="text-red-400">Error: {error.message}</p>
      </div>
    );
  }

  const member = (rows?.[0] ?? null) as Member | null;
  if (!member) notFound();

  // --------- Viewer permissions (isSelf / canAdmin) ----------
  const { data: auth } = await s.auth.getUser();
  const viewerUid = auth?.user?.id ?? null;

  let canAdmin = false;
  let isSelf = false;
  if (viewerUid) {
    isSelf = member.user_id === viewerUid;
    const { data: meRow } = await s
      .from("members")
      .select("role,user_id")
      .eq("user_id", viewerUid)
      .limit(1)
      .maybeSingle();
    const viewerRole = (meRow?.role ?? "member").toLowerCase();
    canAdmin = ["sysadmin", "secretary"].includes(viewerRole);
  }

  // --------- Avatar candidates (no DB column required) ----------
  const storage = s.storage.from("avatars");
  const candidates: string[] = [];
  if (member.user_id) {
    for (const ext of ["png", "jpg", "jpeg", "webp"]) {
      const { data: pub } = storage.getPublicUrl(`${member.user_id}.${ext}`);
      if (pub?.publicUrl) candidates.push(pub.publicUrl);
    }
  }

  const joinedTxt = member.created_at
    ? new Date(member.created_at).toLocaleDateString()
    : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-semibold">{member.full_name ?? "—"}</div>
          <div className="mt-1 text-neutral-400">{member.email ?? "—"}</div>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{(member.role ?? "member").toUpperCase()}</Badge>
            <Badge
              className={
                (member.status ?? "active").toLowerCase() === "active"
                  ? "border-emerald-600 text-emerald-400"
                  : "border-neutral-600 text-neutral-400"
              }
            >
              {(member.status ?? "active").toUpperCase()}
            </Badge>
            <span className="text-sm text-neutral-500">Joined: {joinedTxt}</span>
          </div>
        </div>

        {(isSelf || canAdmin) && (
          <a
            href="#edit-panel"
            className="rounded-lg bg-amber-500/90 hover:bg-amber-500 text-black px-4 py-2 text-sm font-medium"
          >
            Edit profile
          </a>
        )}
      </div>

      {(isSelf || canAdmin) && (
        <EditMemberPanel
          id="edit-panel"
          member={member}
          avatarCandidates={candidates}
          canAdmin={canAdmin}
          isSelf={isSelf}
        />
      )}

      <div className="flex gap-2">
        <Link className="btn-tab" href={`/members/${member.id}`}>Overview</Link>
        <Link className="btn-tab" href={`/members/${member.id}?t=fines`}>Fines</Link>
        <Link className="btn-tab" href={`/members/${member.id}?t=loans`}>Loans</Link>
        <Link className="btn-tab" href={`/members/${member.id}?t=attendance`}>Attendance</Link>
      </div>
    </div>
  );
}

function Badge({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-neutral-700 px-2 py-0.5 text-xs tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
