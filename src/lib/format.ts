// src/lib/format.ts

/**
 * Format a number as Central African Francs (FCFA) with no decimals.
 * Falls back gracefully if input is null/undefined/NaN.
 */
export function formatCurrency(n: number | null | undefined): string {
  const value = Number(n || 0);
  // Locale + currency picked to render "FCFA" style
  const s = new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);

  // Some environments put currency after number or with non-breaking spaces.
  // Normalize to "FCFA 12 345" (FCFA first).
  const normalized = s
    .replace(/\u00A0/g, ' ')        // NBSP -> space
    .replace(/FCFA\s?/i, '')        // remove existing FCFA if trailing
    .trim();

  return `FCFA ${normalized}`;
}

/**
 * Simple number formatter for counts (no decimals).
 */
export function formatNumber(n: number | null | undefined): string {
  const value = Number(n || 0);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

/**
 * Backward-compat alias so legacy imports keep working:
 *   import { fmtCFA } from '@/lib/format'
 */
export const fmtCFA = formatCurrency;
