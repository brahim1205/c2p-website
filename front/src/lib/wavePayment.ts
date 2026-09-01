export const C2P_WAVE_PAYMENT_URL = 'https://pay.wave.com/m/M_sn_kUcGiCor22EL/c/sn/';

export function openC2PWavePayment() {
  window.open(C2P_WAVE_PAYMENT_URL, '_blank', 'noopener,noreferrer');
}
