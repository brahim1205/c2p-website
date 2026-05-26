import { apiRequest } from '@/lib/api';
import type { FormateurCertificate } from '../formateurDashboardTypes';

export async function fetchFormateurCertificates(userId: string) {
  void userId;
  return apiRequest<FormateurCertificate[]>('/learning/formateur/certificates');
}

export async function issueFormateurCertificate(cert: Pick<FormateurCertificate, 'id'>) {
  return apiRequest<{ certificateId: string; issuedAt: string }>(
    `/learning/formateur/certificates/${encodeURIComponent(String(cert.id))}/issue`,
    { method: 'PATCH' },
  );
}

export async function deleteFormateurCertificate(certId: number) {
  return apiRequest<FormateurCertificate>(`/learning/formateur/certificates/${encodeURIComponent(String(certId))}`, {
    method: 'DELETE',
  });
}
