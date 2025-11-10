"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 h-10 px-3 rounded-md text-sm ${
        active
          ? "bg-neutral-800 text-white"
          : "text-neutral-300 hover:bg-neutral-900/60"
      }`}
    >
      {icon ?? <span className="w-4 h-4 rounded-sm border border-neutral-600" />}
      <span>{label}</span>
    </Link>
  );
}

export default function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-neutral-900/70 bg-[#0A0E14] px-3 py-4">
      <div className="px-2 pb-4 text-sm font-semibold tracking-wide text-neutral-300">
        CAMSU Admin
      </div>

      <nav className="space-y-1">
        <NavItem href="/" label="Dashboard" />
        <NavItem href="/growth" label="Growth" />
        <NavItem href="/members" label="Members" />
        <NavItem href="/calendar" label="Calendar" />
        <NavItem href="/meetings" label="Meetings" />
        <NavItem href="/attachments" label="Attachments" />
        <NavItem href="/finances" label="Finances" />
        <NavItem href="/notifications" label="Notifications" />
        <NavItem href="/settings" label="Settings" />
      </nav>
    </aside>
  );
}
