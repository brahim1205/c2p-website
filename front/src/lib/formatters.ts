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

/**
 * French pluralisation for UI labels written with `(s)`, `(x)` or `(es)` markers.
 *   plural(1, 'facture(s) liée(s)') -> '1 facture liée'
 *   plural(3, 'facture(s) liée(s)') -> '3 factures liées'
 *   plural(2, 'Projet(s) suivi(s)', { withCount: false }) -> 'Projets suivis'
 * In French, 0 and 1 take the singular.
 */
export function plural(count: number | null | undefined, phrase: string, options: { withCount?: boolean } = {}) {
  const value = Number.isFinite(Number(count)) ? Number(count) : 0;
  const many = Math.abs(value) >= 2;
  const words = phrase.replace(/\((s|x|es)\)/g, (_marker, suffix: string) => (many ? suffix : ''));
  return options.withCount === false ? words : `${formatCount(value)} ${words}`;
}

/** Formats an integer the French way: 1 235 (no-break space), not 1,235. */
export function formatCount(value: number) {
  // fr-FR groups with a narrow no-break space (U+202F), nearly invisible in bold Inter: use U+00A0.
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value).replace(/\u202f/g, '\u00a0');
}
