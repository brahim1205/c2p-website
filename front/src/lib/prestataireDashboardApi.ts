import { apiRequest } from '@/lib/api';
import { fetchFinanceSnapshot } from '@/lib/saasApi';
import {
  notifyBookingStatusChanged,
  notifyClientReviewReply,
} from '@/hooks/useCreateNotification';

export interface PrestataireDashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  role: string;
}

export interface PrestataireProvider {
  id: number;
  user_id?: string;
  rating: number;
  reviews_count: number;
  completed_jobs: number;
  public_profile_level?: string | null;
  visibility_tier?: string | null;
  plan_name?: string | null;
  subscription_status?: string | null;
  verified?: boolean;
  alerts_enabled?: boolean | null;
}

export interface PrestataireVisibilityPass {
  id: string;
  provider_id: number;
  user_id: string;
  plan_id?: string | null;
  plan_name?: string | null;
  pass_tier: 'standard' | 'priority' | 'premium';
  pass_label: string;
  code: string;
  status: 'active' | 'superseded' | 'expired' | 'cancelled';
  issued_at: string;
  expires_at: string | null;
  alerts_enabled: boolean;
  verification_eligible: boolean;
  matching_priority: 'low' | 'medium' | 'high';
}

export interface PrestataireVerificationRequest {
  id: string;
  provider_id: number;
  user_id: string;
  requested_level: 'verified';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by?: string | null;
  note?: string | null;
  admin_notes?: string | null;
}

export interface PrestataireBooking {
  id: number;
  client_id: string;
  client_name: string;
  client_email?: string | null;
  provider_id?: number | null;
  service: string;
  description?: string | null;
  booking_date: string;
  booking_time: string;
  request_type?: 'booking' | 'quote' | 'appointment';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'declined';
  price: number | null;
  address?: string | null;
  created_at: string;
}

export interface PrestataireReview {
  id: number;
  provider_id: number;
  client_id: string;
  client_name: string;
  client_avatar: string | null;
  service: string;
  rating: number;
  comment: string;
  date: string;
  response: string | null;
  helpful: number;
  created_at: string;
}

export interface PrestataireService {
  id: number;
  title: string;
  category: string;
  description: string;
  price: string;
  price_type: string;
  status: string;
  bookings: number;
  rating: number;
  image: string;
  location: string;
  created_at: string;
}

export async function fetchPrestataireDashboardSnapshot(user: PrestataireDashboardUser) {
  const [snapshot, finance] = await Promise.all([
    apiRequest<{
      provider: PrestataireProvider | null;
      bookings: PrestataireBooking[];
      reviews: PrestataireReview[];
      visibilityPass: PrestataireVisibilityPass | null;
      verificationRequest: PrestataireVerificationRequest | null;
    }>('/marketplace/prestataire/dashboard'),
    fetchFinanceSnapshot(user.id, user.role),
  ]);

  return {
    provider: snapshot.provider,
    bookings: snapshot.bookings,
    reviews: snapshot.reviews,
    finance,
    visibilityPass: snapshot.visibilityPass,
    verificationRequest: snapshot.verificationRequest,
  };
}

export async function requestPrestataireVerification(providerId: number, note?: string) {
  return apiRequest<PrestataireVerificationRequest>('/marketplace/prestataire/verification-requests', {
    method: 'POST',
    body: JSON.stringify({ provider_id: providerId, note: note?.trim() || '' }),
  });
}

export async function updatePrestataireBookingStatus(booking: PrestataireBooking, status: PrestataireBooking['status']) {
  await apiRequest<PrestataireBooking>(`/marketplace/prestataire/bookings/${encodeURIComponent(String(booking.id))}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  await notifyBookingStatusChanged(booking.client_id, booking.service, status);
}

export async function fetchPrestataireBookings(userId: string) {
  void userId;
  return apiRequest<{ providerId: number | null; bookings: PrestataireBooking[] }>('/marketplace/prestataire/bookings');
}

export function subscribePrestataireBookings(
  providerId: number,
  handlers: {
    onInsert?: (booking: PrestataireBooking) => void;
    onUpdate?: (booking: PrestataireBooking) => void;
  },
) {
  void providerId;
  void handlers;
  return { unsubscribe: () => undefined };
}

export async function fetchPrestataireReviews(userId: string) {
  void userId;
  const data = await apiRequest<PrestataireReview[]>('/marketplace/prestataire/reviews');
  return data.map((review) => ({
    ...review,
    date: review.created_at ? new Date(review.created_at).toISOString().split('T')[0] : '',
  }));
}

export async function replyPrestataireReview(review: PrestataireReview, replyText: string) {
  const response = replyText.trim();
  await apiRequest<PrestataireReview>(`/marketplace/prestataire/reviews/${encodeURIComponent(String(review.id))}/reply`, {
    method: 'PATCH',
    body: JSON.stringify({ response }),
  });

  await notifyClientReviewReply(review.client_id, review.service);

  return response;
}

export async function incrementPrestataireReviewHelpful(reviewId: number, helpful: number) {
  await apiRequest<PrestataireReview>(`/marketplace/prestataire/reviews/${encodeURIComponent(String(reviewId))}/helpful`, {
    method: 'PATCH',
    body: JSON.stringify({ helpful }),
  });
}

export async function fetchPrestataireServices(userId: string) {
  void userId;
  return apiRequest<{ providerId: number | null; services: PrestataireService[] }>('/marketplace/prestataire/services');
}

export async function updatePrestataireServiceStatus(serviceId: number, status: string) {
  await apiRequest<PrestataireService>(`/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deletePrestataireService(serviceId: number) {
  await apiRequest<PrestataireService>(`/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}`, {
    method: 'DELETE',
  });
}

export async function createPrestataireService(providerId: number, payload: {
  title: string;
  category: string;
  description: string;
  price: string;
  price_type: string;
  status: string;
  image: string;
  location: string;
}) {
  void providerId;
  return apiRequest<PrestataireService>('/marketplace/prestataire/services', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePrestataireService(serviceId: number, payload: Partial<Pick<PrestataireService, 'title' | 'description' | 'price' | 'location' | 'image'>>) {
  await apiRequest<PrestataireService>(`/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
