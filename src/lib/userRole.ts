// src/lib/userRole.ts
export type AppRole = 'sysadmin' | 'secretary' | 'member' | 'guest';

import { supabase as supabaseMaybe } from '@/lib/supabase';

function sb() {
  const maybe: any = supabaseMaybe as any;
  return typeof maybe === 'function' ? maybe() : maybe;
}

export async function getCurrentUserRole(): Promise<AppRole> {
  const s: any = sb();

  // 1) Prefer Postgres RPC if you have a function `public.current_role()`
  try {
    if (typeof s.rpc === 'function') {
      const { data, error } = await s.rpc('current_role');
      if (!error && typeof data === 'string') {
        const role = data.toLowerCase();
        if (role === 'sysadmin' || role === 'secretary' || role === 'member') return role as AppRole;
        return 'guest';
      }
    }
  } catch (_) {
    // fall through
  }

  // 2) Fallback: read from user_profiles table using the authenticated user
  try {
    if (s.auth?.getUser) {
      const { data: authData } = await s.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) {
        const { data, error } = await s
          .from('user_profiles')
          .select('role')
          .eq('user_id', uid)
          .limit(1)
          .maybeSingle();
        if (!error && data?.role) {
          const role = String(data.role).toLowerCase();
          if (role === 'sysadmin' || role === 'secretary' || role === 'member') return role as AppRole;
        }
      }
    }
  } catch (_) {
    // fall through
  }

  return 'guest';
}
