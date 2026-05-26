export interface Certificate {
  id: number;
  student_name: string;
  student_avatar: string | null;
  course_id: number | null;
  course_name: string | null;
  completion_date: string | null;
  final_grade: number | null;
  status: string;
  certificate_id: string | null;
  issued_at: string | null;
  created_at: string;
}

export const certificateFilters = ['all', 'ready', 'issued', 'pending'] as const;
export type CertificateFilter = typeof certificateFilters[number];

export function formatCertificateGrade(value: number | null) {
  return value != null ? `${value}` : '-';
}

export function filterCertificates(certs: Certificate[], filter: CertificateFilter) {
  return filter === 'all' ? certs : certs.filter((cert) => cert.status === filter);
}

export function getCertificateStats(certs: Certificate[]) {
  const currentMonth = new Date().getMonth();
  return [
    { label: 'Total certificats', value: String(certs.length), icon: 'ri-award-line', color: 'bg-teal-500' },
    {
      label: 'Délivrés ce mois',
      value: String(certs.filter((cert) => cert.status === 'issued' && cert.issued_at && new Date(cert.issued_at).getMonth() === currentMonth).length),
      icon: 'ri-check-double-line',
      color: 'bg-green-500',
    },
    { label: 'En attente', value: String(certs.filter((cert) => cert.status === 'pending').length), icon: 'ri-time-line', color: 'bg-amber-500' },
    { label: 'Prêts à délivrer', value: String(certs.filter((cert) => cert.status === 'ready').length), icon: 'ri-file-check-line', color: 'bg-blue-500' },
  ];
}

export function getCertificateStatusMeta(status: string) {
  const styles: Record<string, string> = {
    ready: 'bg-green-100 text-green-700',
    issued: 'bg-teal-100 text-teal-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = {
    ready: 'Prêt à délivrer',
    issued: 'Délivré',
    pending: 'En attente',
  };
  return {
    label: labels[status] || status,
    style: styles[status] || 'bg-gray-100 text-gray-700',
  };
}

export function getCertificateFilterLabel(filter: CertificateFilter) {
  if (filter === 'all') return 'Tous';
  if (filter === 'ready') return 'Prêts';
  if (filter === 'issued') return 'Délivrés';
  return 'En attente';
}
