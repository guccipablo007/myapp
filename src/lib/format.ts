// src/lib/format.ts

/** Formats numbers with thousand separators (e.g., 12 345 → "12,345") */
export function formatNumber(value: number | string): string {
  const num = Number(value) || 0;
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** CFA or other currency formatting with fallback */
export function formatCurrency(value: number, currency: string = 'XAF'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    // If Intl can't render that currency in this runtime, fall back
    return `${(value || 0).toLocaleString()} ${currency}`;
  }
}

/** Alias kept for backward compatibility */
export const fmtCFA = (v: number) => formatCurrency(v, 'XAF');
