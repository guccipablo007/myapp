'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase as supabaseFactory } from '@/lib/supabase';
import UploadToAttachments from '@/components/UploadToAttachments';

// ====== Toggle this depending on your bucket visibility ======
// true  -> generate short-lived signed URLs (best for PRIVATE buckets)
// false -> use public URLs (only if your bucket is public)
const USE_SIGNED_URLS = true;

type FileRow = {
  name: string;
  id?: string | null;
  updated_at?: string | null;
  metadata?: unknown;
};

export default function AttachmentsPage() {
  const sb = useMemo(() => supabaseFactory(), []);
  const [folder, setFolder] = useState('');
  const [rows, setRows] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(false); // sysadmin/secretary
  const [roleLabel, setRoleLabel] = useState<string>('GUEST');

  // ---- Determine if current user may write (sysadmin/secretary) ----
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: sess } = await sb.auth.getSession();
        const uid = sess?.session?.user?.id;

        if (!uid) {
          if (alive) {
            setCanWrite(false);
            setRoleLabel('guest');
          }
          return;
        }

        // If you keep roles in public.user_profiles(user_id, role)
        const { data: prof } = await sb
          .from('user_profiles')
          .select('role')
          .eq('user_id', uid)
          .maybeSingle();

        const role = prof?.role ?? 'member';
        const allowed = ['sysadmin', 'secretary'].includes(role);
        if (alive) {
          setCanWrite(allowed);
          setRoleLabel(role);
        }
      } catch {
        if (alive) {
          setCanWrite(false);
          setRoleLabel('guest');
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [sb]);

  // ---- List files in current folder ----
  const listFiles = async () => {
    setLoading(true);
    setErr(null);
    try {
      const path = folder.trim();

      const { data, error } = await sb.storage.from('attachments').list(path || '', {
        limit: 100,
        sortBy: { column: 'updated_at', order: 'desc' },
      });

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      let message = 'Failed to list files';
      if (e instanceof Error) {
        message = e.message;
      }
      setErr(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  // ---- Download (signed or public) ----
  const handleDownload = async (name: string) => {
    try {
      const path = [folder.trim(), name].filter(Boolean).join('/');

      if (USE_SIGNED_URLS) {
        const { data, error } = await sb
          .storage
          .from('attachments')
          .createSignedUrl(path, 60); // 60s

        if (error) throw error;
        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
      } else {
        const { data } = sb.storage.from('attachments').getPublicUrl(path);
        if (data?.publicUrl) window.open(data.publicUrl, '_blank');
      }
    } catch (e) {
      let message = 'Download failed';
      if (e instanceof Error) {
        message = e.message;
      }
      setErr(message);
    }
  };

  // ---- Delete (only for sysadmin/secretary) ----
  const handleDelete = async (name: string) => {
    if (!canWrite) return;
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const path = [folder.trim(), name].filter(Boolean).join('/');
      const { error } = await sb.storage.from('attachments').remove([path]);
      if (error) throw error;
      await listFiles();
    } catch (e) {
      let message = 'Delete failed';
      if (e instanceof Error) {
        message = e.message;
      }
      setErr(message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Attachments</h1>
        <div className="text-sm opacity-70">Role: {roleLabel}</div>
      </div>

      <p className="opacity-70">
        View &amp; download files. {canWrite ? 'You can also upload and delete.' : 'You have read-only access.'}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="Folder (optional), e.g. meetings/2025-01"
          className="w-full sm:w-[420px] rounded border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <UploadToAttachments folder={folder} show={canWrite} onDone={listFiles} />
      </div>

      {err && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Error: {err}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/40">
            <tr className="text-left">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Path</th>
              <th className="px-4 py-2">Updated</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan={4}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 opacity-70" colSpan={4}>
                  No files in this folder.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const path = [folder.trim(), r.name].filter(Boolean).join('/');
                return (
                  <tr key={path} className="border-t border-zinc-800/60">
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{path}</td>
                    <td className="px-4 py-2">{r.updated_at ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(r.name)}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800/60"
                        >
                          Download
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => handleDelete(r.name)}
                            className="rounded border border-red-600/50 px-2 py-1 text-xs text-red-300 hover:bg-red-600/10"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
