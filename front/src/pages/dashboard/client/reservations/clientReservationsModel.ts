import { REQUEST_TYPE_META, getPaymentMethodLabel, type BookingStatus } from '@/lib/clientDashboard';
import type {
  ClientDashboardBooking as Booking,
  ClientDashboardProvider as Provider,
} from '@/lib/clientDashboardApi';

export type { Booking, Provider };

export interface ReportForm {
  bookingId: number | null;
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export type ReservationStatusFilter = 'all' | BookingStatus;

export const EMPTY_REPORT_FORM: ReportForm = {
  bookingId: null,
  reason: '',
  description: '',
  priority: 'medium',
};

export const CLIENT_RESERVATION_STATUS_FILTERS = [
  'all',
  'confirmed',
  'pending',
  'in_progress',
  'completed',
  'declined',
  'cancelled',
] as const;

export function getRequestedProvider(booking: Booking, providers: Record<number, Provider>) {
  if (booking.requested_provider_id) {
    return providers[booking.requested_provider_id] || booking.requested_provider || null;
  }

  return booking.requested_provider || null;
}

export function getAssignedProvider(booking: Booking, providers: Record<number, Provider>) {
  if (booking.provider_id) {
    return providers[booking.provider_id] || booking.provider || null;
  }

  return booking.provider || null;
}

export function getBookingProviderLabel(booking: Booking, providers: Record<number, Provider>) {
  const assignedProvider = getAssignedProvider(booking, providers);
  if (assignedProvider?.name) {
    return assignedProvider.name;
  }

  const requestedProvider = getRequestedProvider(booking, providers);
  if (requestedProvider?.name || booking.requested_provider_name) {
    return `${requestedProvider?.name || booking.requested_provider_name} · demande transmise à C2P`;
  }

  return 'Assignation en cours par C2P';
}

export function getBookingProviderImage(booking: Booking, providers: Record<number, Provider>) {
  return getAssignedProvider(booking, providers)?.image || getRequestedProvider(booking, providers)?.image || null;
}

export function getBookingPriceLabel(booking: Booking) {
  return booking.price ? `${Number(booking.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis';
}

export function buildBookingSummaryLines(booking: Booking, providers: Record<number, Provider>) {
  const assignedProvider = getAssignedProvider(booking, providers);
  const requestedProvider = getRequestedProvider(booking, providers);
  const providerName = assignedProvider?.name
    || requestedProvider?.name
    || booking.requested_provider_name
    || 'Assignation C2P en cours';

  return [
    `Traitement : ${providerName}`,
    `Type : ${REQUEST_TYPE_META[booking.request_type || 'booking'].label}`,
    `Service : ${booking.service}`,
    `Date : ${booking.booking_date} à ${booking.booking_time}`,
    `Adresse : ${booking.address || 'Non précisée'}`,
    `Paiement : ${getPaymentMethodLabel(booking.payment_method)}`,
    `Montant : ${getBookingPriceLabel(booking)}`,
    '',
    'Besoin client :',
    booking.description || 'Aucun détail complémentaire.',
  ];
}
