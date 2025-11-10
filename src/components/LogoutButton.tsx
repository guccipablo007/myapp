"use client";

import { useRouter } from "next/navigation";
import { supabase as supabaseMaybe } from "@/lib/supabase";

/** Works whether you export a factory or a ready-made client */
function sb() {
  // @ts-expect-error tolerate both shapes
  return typeof supabaseMaybe === "function" ? supabaseMaybe() : supabaseMaybe;
}

type Props = {
  className?: string;
  label?: string;
  /** where to go after logout */
  after?: string; // default /login
};

export default function LogoutButton({
  className = "",
  label = "Logout",
  after = "/login",
}: Props) {
  const router = useRouter();

  const go = (href: string) => {
    // Try client navigation, then hard nav as fallback
    try {
      router.replace(href);
      // In case app/router hydration blocks it, force after a tick:
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== href) {
          window.location.assign(href);
        }
      }, 150);
    } catch {
      if (typeof window !== "undefined") window.location.assign(href);
    }
  };

  const onLogout = async () => {
    const s = sb();
    try {
      await s.auth.signOut();
    } catch {
      /* ignore; still navigate */
    }
    go(after);
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      className={
        className ||
        "h-9 px-3 rounded-md border border-neutral-700 hover:bg-neutral-800 text-sm"
      }
    >
      {label}
    </button>
  );
}
