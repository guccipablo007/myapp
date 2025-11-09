// src/components/KpiCard.tsx
"use client";

import Link from "next/link";
import { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;   // optional deep link
  tooltip?: string;
};

export default function KpiCard({ label, value, hint, href, tooltip }: KpiCardProps) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-black/30 p-5 hover:border-white/20 transition-colors"
      title={tooltip}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/70">{label}</p>
        {href ? (
          <Link
            href={href}
            className="text-xs rounded px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10"
          >
            View details
          </Link>
        ) : null}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {hint ? <p className="mt-1 text-xs text-white/60">{hint}</p> : null}
    </div>
  );
}
