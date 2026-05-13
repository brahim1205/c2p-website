import { backendClient } from '@/lib/backendClient';
import { fetchProviderByUserId } from '@/lib/providerApi';
import { fetchFinanceSnapshot, type FinanceSnapshot } from '@/lib/saasApi';
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

function throwApiError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message || 'Backend request failed.');
  }
}

async function requireProvider(userId: string) {
  const provider = await fetchProviderByUserId(userId);
  if (!provider?.id) return null;
  return provider;
}

export async function fetchPrestataireDashboardSnapshot(user: PrestataireDashboardUser) {
  const provider = await requireProvider(user.id);
  if (!provider?.id) {
    return {
      provider: null,
      bookings: [] as PrestataireBooking[],
      reviews: [] as PrestataireReview[],
      finance: null as FinanceSnapshot | null,
      visibilityPass: null as PrestataireVisibilityPass | null,
      verificationRequest: null as PrestataireVerificationRequest | null,
    };
  }

  const [bookingsRes, reviewsRes, finance, visibilityPassRes, verificationRequestRes] = await Promise.all([
    backendClient.from('bookings').select('*').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(4),
    backendClient.from('provider_reviews').select('*').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(3),
    fetchFinanceSnapshot(user.id, user.role),
    backendClient.from('provider_visibility_passes').select('*').eq('user_id', user.id).order('issued_at', { ascending: false }).limit(1),
    backendClient.from('provider_verification_requests').select('*').eq('user_id', user.id).order('requested_at', { ascending: false }).limit(1),
  ]);

  throwApiError(bookingsRes.error);
  throwApiError(reviewsRes.error);
  throwApiError(visibilityPassRes.error);
  throwApiError(verificationRequestRes.error);

  return {
    provider: provider as PrestataireProvider,
    bookings: (bookingsRes.data as PrestataireBooking[]) || [],
    reviews: (reviewsRes.data as PrestataireReview[]) || [],
    finance,
    visibilityPass: ((visibilityPassRes.data as PrestataireVisibilityPass[] | null) || [])[0] ?? null,
    verificationRequest: ((verificationRequestRes.data as PrestataireVerificationRequest[] | null) || [])[0] ?? null,
  };
}

export async function requestPrestataireVerification(providerId: number, note?: string) {
  const { data, error } = await backendClient
    .from<PrestataireVerificationRequest>('provider_verification_requests')
    .insert({
      provider_id: providerId,
      note: note?.trim() || '',
    })
    .select('*')
    .single();

  throwApiError(error);
  return data;
}

export async function updatePrestataireBookingStatus(booking: PrestataireBooking, status: PrestataireBooking['status']) {
  const { error } = await backendClient
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', booking.id);
  throwApiError(error);

  await notifyBookingStatusChanged(booking.client_id, booking.service, status);
}

export async function fetchPrestataireBookings(userId: string) {
  const provider = await requireProvider(userId);
  if (!provider?.id) {
    return { providerId: null, bookings: [] as PrestataireBooking[] };
  }

  const { data, error } = await backendClient
    .from('bookings')
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });
  throwApiError(error);

  return {
    providerId: provider.id,
    bookings: (data as PrestataireBooking[]) || [],
  };
}

export function subscribePrestataireBookings(
  providerId: number,
  handlers: {
    onInsert?: (booking: PrestataireBooking) => void;
    onUpdate?: (booking: PrestataireBooking) => void;
  },
) {
  return backendClient
    .channel(`bookings-channel-${providerId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `provider_id=eq.${providerId}` }, (payload) => {
      handlers.onInsert?.(payload.new as PrestataireBooking);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `provider_id=eq.${providerId}` }, (payload) => {
      handlers.onUpdate?.(payload.new as PrestataireBooking);
    })
    .subscribe();
}

export async function fetchPrestataireReviews(userId: string) {
  const provider = await requireProvider(userId);
  if (!provider?.id) {
    return [] as PrestataireReview[];
  }

  const { data, error } = await backendClient
    .from('provider_reviews')
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });
  throwApiError(error);

  return ((data || []) as PrestataireReview[]).map((review) => ({
    ...review,
    date: review.created_at ? new Date(review.created_at).toISOString().split('T')[0] : '',
  }));
}

export async function replyPrestataireReview(review: PrestataireReview, replyText: string) {
  const response = replyText.trim();
  const { error } = await backendClient
    .from('provider_reviews')
    .update({ response })
    .eq('id', review.id);
  throwApiError(error);

  await notifyClientReviewReply(review.client_id, review.service);

  return response;
}

export async function incrementPrestataireReviewHelpful(reviewId: number, helpful: number) {
  const { error } = await backendClient
    .from('provider_reviews')
    .update({ helpful })
    .eq('id', reviewId);
  throwApiError(error);
}

export async function fetchPrestataireServices(userId: string) {
  const provider = await requireProvider(userId);
  if (!provider?.id) {
    return { providerId: null, services: [] as PrestataireService[] };
  }

  const { data, error } = await backendClient
    .from('provider_services')
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });
  throwApiError(error);

  return {
    providerId: provider.id,
    services: (data as PrestataireService[]) || [],
  };
}

export async function updatePrestataireServiceStatus(serviceId: number, status: string) {
  const { error } = await backendClient
    .from('provider_services')
    .update({ status })
    .eq('id', serviceId);
  throwApiError(error);
}

export async function deletePrestataireService(serviceId: number) {
  const { error } = await backendClient.from('provider_services').delete().eq('id', serviceId);
  throwApiError(error);
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
  const { data, error } = await backendClient
    .from('provider_services')
    .insert({
      provider_id: providerId,
      ...payload,
      bookings: 0,
      rating: 0,
    })
    .select('id')
    .single();
  throwApiError(error);
  return data;
}

export async function updatePrestataireService(serviceId: number, payload: Partial<Pick<PrestataireService, 'title' | 'description' | 'price' | 'location' | 'image'>>) {
  const { error } = await backendClient
    .from('provider_services')
    .update(payload)
    .eq('id', serviceId);
  throwApiError(error);
}
