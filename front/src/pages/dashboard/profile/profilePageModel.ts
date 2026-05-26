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
  return certificates.map((entry) => ({
    courseId: entry.id,
    title: entry.course_name || entry.title || 'Formation',
    instructor: 'C2P Academy',
    issueDate: entry.issued_at || entry.completion_date || null,
    certificateId: entry.certificate_id || entry.certificate_number || `C2P-CERT-${entry.id}`,
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
  };
}
