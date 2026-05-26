export type ProjectTab = 'overview' | 'ecosystem' | 'funding' | 'updates';

export const PROJECT_DETAIL_TABS: Array<{ id: ProjectTab; label: string }> = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'ecosystem', label: 'Réseau' },
  { id: 'funding', label: 'Financement' },
  { id: 'updates', label: 'Actualités' },
];

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatCompactCurrency(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M FCFA`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k FCFA`;
  }
  return `${amount} FCFA`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Non renseigné';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getStatusMeta(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('incubation')) {
    return { label: 'Incubation', className: 'border-[#27346b]/20 bg-[#ffffff] text-[#27346b]' };
  }
  if (normalized.includes('acceleration') || normalized.includes('croissance')) {
    return { label: 'Accélération', className: 'border-[#dbad29]/20 bg-[#fff4ec] text-[#d0b55e]' };
  }
  if (normalized.includes('term')) {
    return { label: 'Terminé', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }
  return { label: 'Pré-incubation', className: 'border-[#5fa6f3] bg-white text-[#27346b]' };
}

export function getMilestoneMeta(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') {
    return { label: 'Terminé', dot: 'bg-emerald-500', tone: 'text-emerald-700' };
  }
  if (normalized === 'in_progress') {
    return { label: 'En cours', dot: 'bg-[#dbad29]', tone: 'text-[#d0b55e]' };
  }
  return { label: 'A venir', dot: 'bg-[#27346b]', tone: 'text-[#27346b]' };
}

export function getDocumentIcon(type: string | null | undefined) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('excel')) return 'ri-file-excel-line';
  if (normalized.includes('powerpoint') || normalized.includes('ppt')) return 'ri-slideshow-line';
  if (normalized.includes('word')) return 'ri-file-word-line';
  if (normalized.includes('fig')) return 'ri-shapes-line';
  return 'ri-file-text-line';
}

export function getPartnershipMeta(type: string | null | undefined) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('mentor')) {
    return { icon: 'ri-user-star-line', label: 'Mentorat', tone: 'bg-[#ffffff] text-[#27346b]' };
  }
  if (normalized.includes('finan')) {
    return { icon: 'ri-bank-card-line', label: 'Financement', tone: 'bg-[#fff4ec] text-[#d0b55e]' };
  }
  if (normalized.includes('tech')) {
    return { icon: 'ri-cpu-line', label: 'Technique', tone: 'bg-[#f8f7ff] text-[#27346b]' };
  }
  return { icon: 'ri-links-line', label: 'Partenariat', tone: 'bg-[#f8f7ff] text-[#27346b]' };
}
