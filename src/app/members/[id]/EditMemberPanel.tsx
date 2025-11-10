"use client";

import { useState } from "react";
import { supabase as supabaseMaybe } from "@/lib/supabase";

function sbClient() {
  const s: any = typeof supabaseMaybe === "function" ? (supabaseMaybe as any)() : (supabaseMaybe as any);
  return s;
}

type Props = {
  memberId: string;
  initial?: {
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
    status?: string | null;
  };
};

export default function EditMemberPanel({ memberId, initial }: Props) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState(initial?.role ?? "member");
  const [status, setStatus] = useState(initial?.status ?? "active");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Avatar preview url (public)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  async function saveProfile() {
    setErr(null);
    setMsg(null);
    setBusy(true);

    const sb = sbClient();
    const { error } = await sb
      .from("members")
      .update({
        full_name: fullName || null,
        email: email || null,
        role: role || null,
        status: status || null,
      })
      .eq("id", memberId);

    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      setMsg("Profile updated.");
    }
  }

  function extOf(file: File) {
    const m = /\.(png|jpg|jpeg|webp)$/i.exec(file.name);
    if (m) return m[1].toLowerCase();
    // fallbacks by mime
    if (file.type.includes("png")) return "png";
    if (file.type.includes("webp")) return "webp";
    return "jpg";
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      const sb = sbClient();
      const ext = extOf(file);
      const path = `${memberId}.${ext}`;

      // Upsert into "avatars" bucket
      const { error: upErr } = await sb.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      // Get a public URL (bucket should be public-read; if private, switch to signed URL)
      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      if (pub?.publicUrl) setAvatarUrl(pub.publicUrl);

      setMsg("Avatar uploaded.");
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
      // reset the input so the same file can be reselected if needed
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 p-4 space-y-4">
      <h3 className="text-lg font-semibold">Edit Member</h3>

      {err && (
        <div className="text-sm text-red-400 border border-red-900/40 bg-red-950/20 rounded-lg px-3 py-2">
          {err}
        </div>
      )}
      {msg && (
        <div className="text-sm text-emerald-400 border border-emerald-900/40 bg-emerald-950/20 rounded-lg px-3 py-2">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block mb-1 text-neutral-300">Full name</span>
          <input
            className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
            value={fullName}
            onChange={(e) => setFullName(e.currentTarget.value)}
            placeholder="John Doe"
          />
        </label>

        <label className="text-sm">
          <span className="block mb-1 text-neutral-300">Email</span>
          <input
            type="email"
            className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="john@example.com"
          />
        </label>

        <label className="text-sm">
          <span className="block mb-1 text-neutral-300">Role</span>
          <select
            className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
            value={role}
            onChange={(e) => setRole(e.currentTarget.value)}
          >
            <option value="member">Member</option>
            <option value="secretary">Secretary</option>
            <option value="sysadmin">SysAdmin</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block mb-1 text-neutral-300">Status</span>
          <select
            className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
            value={status}
            onChange={(e) => setStatus(e.currentTarget.value)}
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={saveProfile}
          disabled={busy}
          className="rounded-lg bg-amber-500/90 hover:bg-amber-500 text-black font-medium px-4 py-2 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>

        <label className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 hover:bg-neutral-800 cursor-pointer">
          <span>Upload avatar</span>
          <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </label>

        {avatarUrl ? (
          <a
            href={avatarUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-300 underline"
          >
            View current avatar
          </a>
        ) : null}
      </div>

      <p className="text-xs text-neutral-500">
        Avatars are stored in the <code>avatars</code> bucket with filename <code>{memberId}.png|jpg|webp</code>.
      </p>
    </div>
  );
}
