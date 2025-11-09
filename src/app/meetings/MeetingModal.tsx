'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase as supabaseFactory } from '@/lib/supabase';
import UploadToAttachments from '@/components/UploadToAttachments';

type MeetingRow = {
  id: number;
  title: string | null;
  date: string | null;
  recorded_by?: string | null;
};

type FileRow = {
  name: string;
  updated_at?: string | null;
};

export default function MeetingModal({
  meeting,
  onClose,
  canWrite,
  useSignedUrls = true,
}: {
  meeting: MeetingRow;
  onClose: () => void;
  canWrite: boolean;
  useSignedUrls?: boolean;
}) {
  const sb = useMemo(() => supabaseFactory(), []);
  const folder = `meetings/${meeting.id}`;

  const [rows, setRows] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const listFiles = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await sb.storage
        .from('attachments')
        .list(folder, {
          limit: 100,
          sortBy: { column: 'updated_at', order: 'desc' },
        });

      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to list files');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const download = async (name: string) => {
    try {
      const path = `${folder}/${name}`;
      if (useSignedUrls) {
        const { data, error } = await sb
          .storage
          .from('attachments')
          .createSignedUrl(path, 60);
        if (error) throw error;
        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
      } else {
        const { data } = sb.storage.from('attachments').getPublicUrl(path);
        if (data?.publicUrl) window.open(data.publicUrl, '_blank');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Download failed');
    }
  };

  const remove = async (name: string) => {
    if (!canWrite) return;
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const path = `${folder}/${name}`;
      const { error } = await sb.storage.from('attachments').remove([path]);
      if (error) throw error;
      await listFiles();
    } catch (e: any) {
      setErr(e?.message ?? 'Delete failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {meeting.title ?? 'Untitled'} <span className="opacity-60">— {meeting.date ?? '—'}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-800/60"
          >
            Close
          </button>
        </div>

        <div className="text-sm opacity-70">
          Folder: <span className="font-mono">{folder}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="opacity-70 text-sm">
            {canWrite
              ? 'You can upload and delete files for this meeting.'
              : 'Read-only access.'}
          </div>
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
                <th className="px-4 py-2">Updated</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6" colSpan={3}>Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 opacity-70" colSpan={3}>No files yet.</td>
                </tr>
              ) : (
                rows.map((f) => (
                  <tr key={f.name} className="border-t border-zinc-800/60">
                    <td className="px-4 py-2">{f.name}</td>
                    <td className="px-4 py-2">{f.updated_at ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => download(f.name)}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800/60"
                        >
                          Download
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => remove(f.name)}
                            className="rounded border border-red-600/50 px-2 py-1 text-xs text-red-300 hover:bg-red-600/10"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
