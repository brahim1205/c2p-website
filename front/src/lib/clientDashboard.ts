export type BookingRequestType = 'booking' | 'quote' | 'appointment';
export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'in_progress' | 'declined';
export type OrderStatus = 'pending_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export const REQUEST_TYPE_META: Record<BookingRequestType, { label: string; color: string; icon: string }> = {
  booking: { label: 'Réservation', color: 'bg-teal-100 text-teal-700', icon: 'ri-calendar-check-line' },
  quote: { label: 'Demande de devis', color: 'bg-amber-100 text-amber-700', icon: 'ri-file-paper-2-line' },
  appointment: { label: 'Rendez-vous', color: 'bg-blue-100 text-blue-700', icon: 'ri-calendar-event-line' },
};

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; color: string; icon: string }> = {
  confirmed: { label: 'Prestataire assigné', color: 'bg-green-100 text-green-700', icon: 'ri-user-received-2-line' },
  pending: { label: 'Analyse C2P', color: 'bg-orange-100 text-orange-700', icon: 'ri-shield-check-line' },
  completed: { label: 'Terminée', color: 'bg-teal-100 text-teal-700', icon: 'ri-check-double-line' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: 'ri-close-circle-line' },
  declined: { label: 'Non retenue', color: 'bg-rose-100 text-rose-700', icon: 'ri-forbid-line' },
  in_progress: { label: 'Mission en cours', color: 'bg-blue-100 text-blue-700', icon: 'ri-loader-4-line' },
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; step: number; icon: string }> = {
  pending_payment: { label: 'Paiement en attente', color: 'bg-orange-100 text-orange-700', step: 1, icon: 'ri-money-dollar-circle-line' },
  processing: { label: 'En préparation', color: 'bg-teal-100 text-teal-700', step: 2, icon: 'ri-box-3-line' },
  shipped: { label: 'Expédiée', color: 'bg-amber-100 text-amber-700', step: 3, icon: 'ri-truck-line' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700', step: 4, icon: 'ri-check-double-line' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', step: 0, icon: 'ri-close-circle-line' },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  yas: 'YAS',
  card: 'Carte bancaire',
  wallet: 'Portefeuille C2P',
  bank: 'Virement bancaire',
  cash: 'Paiement sur place',
};

export function getPaymentMethodLabel(method: string | null | undefined) {
  if (!method) return 'À définir';
  return PAYMENT_METHOD_LABELS[method] || method;
}
