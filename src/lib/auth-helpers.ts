'use client';
import { supabase } from '@/lib/supabase';

export async function ensureUserProfile(userId: string, fullName?: string) {
  const sb = supabase();
  const { data: existing } = await sb
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    await sb.from('user_profiles').insert({
      user_id: userId,
      full_name: fullName || 'Member',
      role: 'member', // default; you can promote to sysadmin via SQL
    });
  }
}
