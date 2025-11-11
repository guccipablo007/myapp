'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import { User } from '@supabase/supabase-js';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const sb = supabase();
  const [ready, setReady] = useState(false);
  const [, setUser] = useState<User | null>(null);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
      if (!data.user) window.location.href = '/login';
    });
  }, [sb]);

  if (!ready) return <div className="p-4">Loading…</div>;
  return <>{children}</>;
}
