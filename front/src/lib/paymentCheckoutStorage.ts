import type { createClientManagedBooking } from '@/lib/clientDashboardApi';

export type PendingPrestationPayment = Parameters<typeof createClientManagedBooking>[0] & {
  returnTo?: string;
  label?: string;
};

const PRESTATION_PAYMENT_KEY = 'c2p_pending_prestation_payment';

export function savePendingPrestationPayment(payload: PendingPrestationPayment) {
  sessionStorage.setItem(PRESTATION_PAYMENT_KEY, JSON.stringify(payload));
}

export function readPendingPrestationPayment() {
  const raw = sessionStorage.getItem(PRESTATION_PAYMENT_KEY);
  return raw ? JSON.parse(raw) as PendingPrestationPayment : null;
}

export function clearPendingPrestationPayment() {
  sessionStorage.removeItem(PRESTATION_PAYMENT_KEY);
}
