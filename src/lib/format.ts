export const fmtCFA = (n: number | null | undefined) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(Number(n || 0));
