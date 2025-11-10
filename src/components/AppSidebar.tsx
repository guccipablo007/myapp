'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // if you don't have this helper, replace cn(...) with template classNames

// Minimal icon set (stroke icons) – no external packages
function Icon({
  name,
  className,
}: {
  name:
    | 'dashboard'
    | 'growth'
    | 'members'
    | 'calendar'
    | 'minutes'
    | 'attachments'
    | 'notifications'
    | 'settings'
    | 'finances';
  className?: string;
}) {
  const common = 'w-5 h-5';
  const cls = `${common} ${className ?? ''}`;
  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18Z" />
        </svg>
      );
    case 'growth':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 21V10m6 11V3m6 18v-8m6 8v-4" />
        </svg>
      );
    case 'members':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 8v6m3-3h-6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'minutes':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h8M8 9h4" />
        </svg>
      );
    case 'attachments':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21.44 11.05 12 20.5a6 6 0 1 1-8.49-8.49L12 3.5a4 4 0 1 1 5.66 5.66L7.76 19.06" />
        </svg>
      );
    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.03 3.9l.06.06A1.65 1.65 0 0 0 8.9 4.29H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.11.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
    case 'finances':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7H14a3.5 3.5 0 0 1 0 7H7" />
        </svg>
      );
    default:
      return null;
  }
}

type Item = { href: string; label: string; icon: Parameters<typeof Icon>[0]['name'] };

const NAV: Item[] = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/growth', label: 'Growth', icon: 'growth' },
  { href: '/members', label: 'Members', icon: 'members' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/meetings', label: 'Meetings', icon: 'minutes' },
  { href: '/attachments', label: 'Attachments', icon: 'attachments' },
  { href: '/finances', label: 'Finances', icon: 'finances' },
  { href: '/notifications', label: 'Notifications', icon: 'notifications' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0E1020] border-r border-white/10">
      <div className="h-14 flex items-center px-4 text-white/90 font-semibold tracking-wide border-b border-white/10">
        CAMSU Admin
      </div>

      <nav className="py-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                active
                  ? 'text-white bg-white/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
