import { useQuery } from '@tanstack/react-query';
import { fetchCertificateBranding } from '@/lib/certificateVerification';
import { queryKeys } from '@/lib/queryKeys';

/** C2P stamp and management signature (rarely changes: cached for 10 minutes). */
export function useCertificateBranding() {
  return useQuery({
    queryKey: queryKeys.certificates.branding(),
    queryFn: fetchCertificateBranding,
    staleTime: 10 * 60 * 1000,
  }).data ?? null;
}
