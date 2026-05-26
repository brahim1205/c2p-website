import { notifyProviderReviewPublished } from '@/hooks/useCreateNotification';
import { apiRequest } from '@/lib/api';
import type { BookingRequestType } from '@/lib/clientDashboard';
import type { ClientDashboardBooking, ClientDashboardProvider, ClientDashboardUser } from './types';

export async function fetchClientBookingsWithProviders(userId: string) {
  void userId;
  return apiRequest<{ bookings: ClientDashboardBooking[]; providers: Record<number, ClientDashboardProvider> }>('/marketplace/client/bookings');
}

export async function cancelClientBooking(bookingId: number) {
  await apiRequest<ClientDashboardBooking>(`/marketplace/client/bookings/${encodeURIComponent(String(bookingId))}/cancel`, {
    method: 'PATCH',
  });
}

export async function publishClientProviderReview(params: {
  booking: ClientDashboardBooking;
  user: ClientDashboardUser;
  providerUserId?: string | null;
  rating: number;
  comment: string;
}) {
  const { booking, user, providerUserId, rating, comment } = params;
  await apiRequest('/marketplace/client/reviews', {
    method: 'POST',
    body: JSON.stringify({
      booking_id: booking.id,
      client_name: `${user.firstName} ${user.lastName}`,
      client_avatar: user.avatar ?? null,
      rating,
      comment,
      service: booking.service,
    }),
  });

  if (providerUserId) {
    await notifyProviderReviewPublished(
      providerUserId,
      `${user.firstName} ${user.lastName}`,
      booking.service,
      rating,
      user.avatar ?? undefined,
    );
  }
}

export async function createClientManagedBooking(params: {
  user: ClientDashboardUser;
  requestedProviderId: number;
  service: string;
  description: string;
  bookingDate: string;
  bookingTime: string;
  paymentMethod: string;
  address: string;
  requestType: BookingRequestType;
  price: number | null;
}) {
  const { user, requestedProviderId, service, description, bookingDate, bookingTime, paymentMethod, address, requestType, price } = params;
  await apiRequest<ClientDashboardBooking>('/marketplace/client/bookings', {
    method: 'POST',
    body: JSON.stringify({
      client_id: user.id,
      client_name: `${user.firstName} ${user.lastName}`,
      client_email: user.email,
      requested_provider_id: requestedProviderId,
      provider_id: null,
      service,
      description,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: 'pending',
      request_type: requestType,
      price,
      payment_method: paymentMethod,
      address,
      request_channel: 'c2p_managed',
      wallet_flow: 'escrow',
    }),
  });
}
