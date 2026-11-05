import type { CertificateRequirements } from '@/lib/apprenantDashboardApi';
import type { CertificateData } from '@/pages/dashboard/profile/components/certificateViewerTypes';

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
  certificate_number?: string | null;
  instructor_name?: string | null;
  course_duration?: string | null;
  requirements?: CertificateRequirements | null;
}

/** "2/3 étapes" for an in-progress certificate. */
export function certificateProgressLabel(cert: Certificate) {
  const requirements = cert.requirements;
  if (!requirements) return null;
  const done = (requirements.lessons.completed ? 1 : 0) + requirements.exams.filter((exam) => exam.status === 'passed').length;
  return `${done}/${1 + requirements.exams.length} étapes`;
}

export const certificateFilters = ['all', 'in_progress', 'issued'] as const;
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
    { label: 'En cours', value: String(certs.filter((cert) => cert.status !== 'issued').length), icon: 'ri-time-line', color: 'bg-amber-500' },
    { label: 'Délivrés au total', value: String(certs.filter((cert) => cert.status === 'issued').length), icon: 'ri-award-fill', color: 'bg-blue-500' },
  ];
}

export function getCertificateStatusMeta(status: string) {
  const styles: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-700',
    issued: 'bg-teal-100 text-teal-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = {
    in_progress: 'En cours',
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
  if (filter === 'issued') return 'Délivrés';
  return 'En cours';
}

/** Data printed on the certificate document. */
export function toCertificateData(cert: Certificate): CertificateData {
  return {
    studentName: cert.student_name,
    courseTitle: cert.course_name || 'Formation C2P',
    instructor: cert.instructor_name || 'Formateur C2P',
    date: new Date(cert.issued_at || cert.completion_date || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    certificateId: String(cert.certificate_number || cert.certificate_id || cert.id),
    duration: cert.course_duration ?? null,
    finalGrade: cert.final_grade ?? null,
  };
}
