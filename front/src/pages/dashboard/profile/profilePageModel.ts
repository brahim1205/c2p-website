import type { ApprenantCertificate } from '@/lib/apprenantDashboardApi';
import type { AuthUser } from '@/lib/roles';
import type { CertificateData } from './components/CertificateViewer';
import type { ProfileCertificateEntry } from './components/ProfileCertificatesPanel';
import type { ProfileFormData } from './components/profileTypes';

export const PROFILE_TABS = [
  { id: 'personal', label: 'Informations personnelles' },
  { id: 'professional', label: 'Informations professionnelles' },
  { id: 'security', label: 'Sécurité' },
  { id: 'stats', label: 'Statistiques', icon: 'ri-bar-chart-box-line' },
  { id: 'badges', label: 'Badges', icon: 'ri-medal-line' },
  { id: 'levels', label: 'Niveaux', icon: 'ri-seedling-line' },
];

export function getProfileUserInitials(user: AuthUser | null | undefined) {
  return user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?';
}

export function mapProfileCertificates(certificates: ApprenantCertificate[]): ProfileCertificateEntry[] {
  // Only certificates actually delivered by C2P are documents (in-progress ones have no number).
  return certificates.filter((entry) => entry.status === 'issued' && (entry.certificate_number || entry.certificate_id)).map((entry) => ({
    courseId: entry.id,
    title: entry.course_name || entry.title || 'Formation',
    instructor: entry.instructor_name || 'Formateur C2P',
    issueDate: entry.issued_at || entry.completion_date || null,
    certificateId: String(entry.certificate_number || entry.certificate_id),
    duration: entry.course_duration ?? null,
    finalGrade: entry.final_grade ?? entry.grade ?? null,
  }));
}

export function buildProfileCertificateData(
  entry: ProfileCertificateEntry,
  user: AuthUser | null | undefined,
  formData: ProfileFormData,
): CertificateData {
  return {
    studentName: user ? `${user.firstName} ${user.lastName}` : `${formData.firstName} ${formData.lastName}`,
    courseTitle: entry.title,
    instructor: entry.instructor,
    date: entry.issueDate
      ? new Date(entry.issueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    certificateId: entry.certificateId,
    duration: entry.duration ?? null,
    finalGrade: entry.finalGrade ?? null,
  };
}
