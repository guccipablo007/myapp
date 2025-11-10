"use client";

// src/app/members/[id]/EditMemberPanel.tsx
import { useState } from "react";
import Image from "next/image";
import { supabase as supabaseMaybe } from "@/lib/supabase";

function sbClient() {
  // @ts-expect-error – tolerate factory or client
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

type Member = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

export default function EditMemberPanel({
  id,
  member,
  avatarCandidates,
  canAdmin,
  isSelf,
}: {
  id?: string;
  member: Member;
  avatarCandidates: string[];
  canAdmin: boolean;
  isSelf: boolean;
}) {
  const s = sbClient();

  const [fullName, setFullName] = useState(member.full_name ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [status, setStatus] = useState((member.status ?? "active").toLowerCase());
  const [role, setRole] = useState((member.role ?? "member").toLowerCase());

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    avatarCandidates[0] ?? null
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function saveProfile() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const payload: Record<string, any> = {
      full_name: fullName || null,
      email: email || null,
      status,
    };
    if (canAdmin) payload.role = role;

    const { error } = await s
      .from("members")
      .update(payload)
      .eq("id", member.id);

    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Profile updated.");
  }

  async function uploadAvatar(file: File) {
    if (!member.user_id) {
      setErr("This member is not linked to an auth user (user_id is null).");
      return;
    }
    setBusy(true);
    setMsg(null);
    setErr(null);

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${member.user_id}.${ext}`;

    // upsert to 'avatars' bucket
    const { error } = await s.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      const { data: pub } = s.storage.from("avatars").getPublicUrl(path);
      setAvatarPreview(pub?.publicUrl ?? null);
      setMsg("Avatar uploaded.");
    }
  }

  return (
    <div id={id} className="rounded-2xl border border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Edit profile</div>
        {(busy || msg || err) && (
          <div className="text-sm">
            {busy && <span className="text-neutral-400">Working…</span>}
            {msg && <span className="text-emerald-400">{msg}</span>}
            {err && <span className="text-red-400">{err}</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6">
        {/* Avatar */}
        <div>
          <div className="w-32 h-32 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900/60">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="avatar"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
                No photo
              </div>
            )}
          </div>
          {(isSelf || canAdmin) && (
            <label className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800 cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
              Upload photo
            </label>
          )}
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-neutral-500">Full name</span>
            <input
              className="mt-1 w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </label>

          <label className="block">
            <span className="text-xs text-neutral-500">Email</span>
            <input
              className="mt-1 w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </label>

          <label className="block">
            <span className="text-xs text-neutral-500">Status</span>
            <select
              className="mt-1 w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-neutral-500">Role</span>
            <select
              disabled={!canAdmin}
              className="mt-1 w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600 disabled:opacity-50"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">member</option>
              <option value="secretary">secretary</option>
              <option value="sysadmin">sysadmin</option>
            </select>
            {!canAdmin && (
              <div className="text-xs text-neutral-500 mt-1">
                Only admins can change roles.
              </div>
            )}
          </label>

          <div className="md:col-span-2 mt-2">
            <button
              onClick={saveProfile}
              disabled={busy}
              className="rounded-lg bg-amber-500/90 hover:bg-amber-500 text-black px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Avatars are served from the <code>avatars</code> bucket using file names{" "}
        <code>{`<user_id>.png|jpg|jpeg|webp`}</code>. Your RLS allows self-updates,
        with admin override for <code>sysadmin</code>/<code>secretary</code>.
      </p>
    </div>
  );
}
