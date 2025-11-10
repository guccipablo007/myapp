// src/components/TopBar.tsx
"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-[#0B0E16]/80 backdrop-blur border-b border-white/10">
      <div className="h-14 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Search className="h-4 w-4" />
          <span className="hidden sm:block">Quick search…</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="relative p-2 rounded hover:bg-white/10">
            <Bell className="h-5 w-5" />
          </Link>
          <div className="h-8 w-8 rounded-full bg-white/10" title="Profile" />
        </div>
      </div>
    </header>
  );
}
