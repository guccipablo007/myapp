// src/lib/format.ts

/**
 * Format a number as currency.
 * Defaults to Central African CFA (XAF) used in Cameroon.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'XAF'
): string {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // Fallback if Intl/currency not available
    return `${n.toLocaleString()} ${currency}`;
  }
}

/** Small helpers if you need them later */
export function formatNumber(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat().format(n);
}
