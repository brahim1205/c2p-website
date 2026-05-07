export function formatCurrency(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('fr-FR')} FCFA`;
}

export function formatShortCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M FCFA`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount >= 100000 ? 0 : 1)}K FCFA`;
  }
  return formatCurrency(amount);
}

export function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', options);
}

export function formatDateTime(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR', options);
}

export function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}
