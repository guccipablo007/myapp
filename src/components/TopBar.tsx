"use client";

import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-900/60 bg-[#0B0E16]/80 backdrop-blur">
      <div className="mx-auto flex h-14 items-center gap-3 px-5 md:px-7">
        <div className="flex-1 min-w-0">
          <input
            className="w-full max-w-xl h-9 rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 text-sm outline-none focus:border-neutral-600"
            placeholder="Search members, meetings, projects, announcements…"
          />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="hidden md:inline-block h-9 px-3 rounded-md border border-neutral-800 hover:bg-neutral-800 text-sm"
          >
            Notifications
          </Link>
          <LogoutButton after="/login" />
        </div>
      </div>
    </header>
  );
}
