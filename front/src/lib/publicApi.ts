import { apiRequest } from './api';
import type { PublicSubscriptionPlan } from './publicSubscriptions';

export async function fetchPublicSubscriptionPlans(role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiRequest<PublicSubscriptionPlan[]>(`/public/subscription-plans${query}`, {}, { retryOnAuth: false });
}

export interface PublicCertificateVerification {
  valid: boolean;
  certificateId: string;
  studentName?: string | null;
  courseName?: string | null;
  issuedAt?: string | null;
  completionDate?: string | null;
  issuer?: string | null;
}

export async function verifyPublicCertificate(certificateId: string) {
  return apiRequest<PublicCertificateVerification>(
    `/public/certificates/${encodeURIComponent(certificateId)}/verify`,
    {},
    { retryOnAuth: false },
  );
}
