// src/app/members/ClientAvatar.tsx
"use client";

import { useState, useMemo } from "react";

/**
 * Tries a list of image URLs in order. If all fail, shows initials.
 */
export default function ClientAvatar({
  candidates,
  fallbackName,
  size = 36,
}: {
  candidates: string[];
  fallbackName?: string | null;
  size?: number;
}) {
  const initials = useMemo(() => {
    const f = fallbackName ?? "";
    const ini =
      f
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "M";
    return ini;
  }, [fallbackName]);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx];

  if (!src) {
    return (
      <div
        className="rounded-full bg-neutral-800 text-neutral-200 grid place-items-center text-xs font-semibold"
        style={{ width: size, height: size }}
        title={fallbackName ?? "Member"}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={fallbackName ?? "avatar"}
      onError={() => setIdx((i) => (i + 1 < candidates.length ? i + 1 : i + 1))}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
