'use client';

import { useMemo, useRef, useState } from 'react';
import { supabase as supabaseFactory } from '@/lib/supabase';

type Props = {
  folder?: string;        // e.g. "meetings/2025-01"
  show?: boolean;         // gate button by role
  onDone?: () => void;    // refresh list after upload
};

export default function UploadToAttachments({ folder = '', show = false, onDone }: Props) {
  const sb = useMemo(() => supabaseFactory(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!show) return null;

  const pickFile = () => inputRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setErr(null);

    try {
      const path = [folder.trim(), file.name].filter(Boolean).join('/');

      const { error } = await sb
        .storage
        .from('attachments')
        .upload(path, file, {
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (error) throw error;
      onDone?.();
    } catch (err) {
      let message = 'Upload failed';
      if (err instanceof Error) {
        message = err.message;
      }
      setErr(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={pickFile}
        disabled={busy}
        className="rounded bg-yellow-500/20 border border-yellow-500/40 px-3 py-1 text-sm hover:bg-yellow-500/30 disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Upload file'}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
      />

      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
