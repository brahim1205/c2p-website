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

/** Revokes a certificate (kept on record with the reason; its public verification shows "revoked"). */
export async function deleteFormateurCertificate(certId: number, reason?: string) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  return apiRequest<FormateurCertificate>(`/learning/formateur/certificates/${encodeURIComponent(String(certId))}${query}`, {
    method: 'DELETE',
  });
}
