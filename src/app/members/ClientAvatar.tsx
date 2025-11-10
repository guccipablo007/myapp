"use client";

import * as React from "react";

type Props = {
  /** Ordered list of possible public avatar URLs (we’ll try each until one loads) */
  candidates: string[];
  /** Fallback name used to draw initials if no image loads */
  fallbackName: string;
  /** Size in pixels (both width & height) */
  size?: number;
  className?: string;
};

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function ClientAvatar({
  candidates,
  fallbackName,
  size = 40,
  className = "",
}: Props) {
  const [idx, setIdx] = React.useState(0);
  const urls = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const url = urls[idx];

  // When current URL fails, advance to next
  const onError = () => {
    if (idx < urls.length - 1) setIdx(idx + 1);
  };

  const diameter = `${size}px`;

  // If we still have a URL to try, show it
  if (url) {
    return (
      <img
        src={url}
        alt={fallbackName || "avatar"}
        width={size}
        height={size}
        onError={onError}
        className={`rounded-full object-cover border border-neutral-800 ${className}`}
        style={{ width: diameter, height: diameter }}
      />
    );
  }

  // Fallback: initials
  return (
    <div
      className={`rounded-full grid place-items-center bg-neutral-900/60 border border-neutral-800 ${className}`}
      style={{ width: diameter, height: diameter }}
      title={fallbackName}
    >
      <span className="text-xs text-neutral-300">{initials(fallbackName)}</span>
    </div>
  );
}
