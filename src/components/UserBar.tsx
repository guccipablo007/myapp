'use client';
import { useEffect, useState, KeyboardEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';

type Profile = {
  full_name: string;
  role: string;
};

export default function UserBar() {
  const sb = supabase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false); // mobile collapse

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getUser();
      setUser(data.user ?? null);
      if (data.user) {
        const { data: p } = await sb
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();
        setProfile(p ?? null);
      }
    })();
  }, [sb]);

  async function logout() {
    await sb.auth.signOut();
    window.location.href = '/login';
  }

  function toggleMobile() {
    setOpen((v) => !v);
  }
  function keyToggle(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMobile();
    }
  }

  return (
    <footer className="fixed bottom-0 inset-x-0 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur">
      {/* bar (div, not button) */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleMobile}
        onKeyDown={keyToggle}
        className={`w-full px-3 py-2 text-sm flex items-center justify-between md:cursor-default
                    hover:bg-yellow-500/10 hover:text-yellow-400
                    ${open ? 'border-l-2 border-yellow-400' : ''}`}
        title="Tap to expand on mobile"
      >
        <div className="flex items-center gap-2">
          <Image src="/avatar.png" alt="User avatar" width={28} height={28} className="w-7 h-7 rounded-full border border-zinc-700" />
          {user ? (
            <>
              <div className="font-medium">{profile?.full_name || user.email}</div>
              {profile?.role && (
                <span className="ml-2 px-2 py-0.5 rounded border border-zinc-700 text-xs">
                  {profile.role}
                </span>
              )}
            </>
          ) : (
            <div className="text-zinc-400">Guest</div>
          )}
        </div>

        {/* chevron (mobile only) */}
        <span className="md:hidden text-zinc-400">{open ? '▾' : '▸'}</span>

        {/* desktop actions always visible */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-yellow-500/10 hover:text-yellow-400"
            >
              Logout
            </button>
          ) : (
            <a
              href="/login"
              className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-yellow-500/10 hover:text-yellow-400"
            >
              Login
            </a>
          )}
        </div>
      </div>

      {/* mobile expanded actions */}
      {open && (
        <div className="md:hidden px-3 pb-3">
          {user ? (
            <button
              onClick={logout}
              className="w-full px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10 hover:text-yellow-400"
            >
              Logout
            </button>
          ) : (
            <a
              href="/login"
              className="block w-full text-center px-3 py-2 rounded border border-zinc-700 hover:bg-yellow-500/10 hover:text-yellow-400"
            >
              Login
            </a>
          )}
        </div>
      )}
    </footer>
  );
}
