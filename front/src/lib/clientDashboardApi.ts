import { backendClient } from '@/lib/backendClient';
import {
  notifyAdminClientReport,
  notifyClientReportReceipt,
  notifyProviderReviewPublished,
} from '@/hooks/useCreateNotification';
import type { BookingRequestType, BookingStatus, OrderStatus } from '@/lib/clientDashboard';

export interface ClientDashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
}

export interface ClientDashboardBooking {
  id: number;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  provider_id?: number | null;
  requested_provider_id?: number | null;
  requested_provider_name?: string | null;
  service: string;
  description?: string;
  booking_date: string;
  booking_time?: string;
  request_type?: BookingRequestType;
  status: BookingStatus;
  price?: number | null;
  payment_method?: string | null;
  address?: string;
  created_at?: string;
  provider?: ClientDashboardProvider | null;
  requested_provider?: ClientDashboardProvider | null;
}

export interface ClientDashboardOrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

export interface ClientDashboardOrderDownload {
  id: string;
  label: string;
  kind: string;
}

export interface ClientDashboardOrder {
  id: number;
  client_id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: ClientDashboardOrderItem[];
  tracking?: string | null;
  payment_method: string;
  downloads?: ClientDashboardOrderDownload[];
}

export interface ClientDashboardProviderRow {
  id: number;
  user_id?: string;
  name: string;
  title?: string | null;
  image?: string | null;
  services?: string[];
  category?: string | null;
  location?: string | null;
  city?: string | null;
  rating?: number | null;
  reviews?: number | null;
  reviews_count?: number | null;
  price_per_hour?: number | null;
  completed_jobs?: number | null;
  verified?: boolean | null;
  distance_km?: number | null;
  availability_status?: 'today' | 'tomorrow' | 'busy' | null;
  next_available_at?: string | null;
  payment_methods?: string[];
}

export interface ClientDashboardProvider {
  id: number;
  user_id?: string;
  name: string;
  image: string | null;
}

export interface ClientFavoriteRow {
  id: number | string;
  provider_id: number;
  provider?: {
    id: number;
    name: string;
    title: string;
    rating: number;
    image: string | null;
    distance_km?: number | null;
  } | null;
}

export interface ClientPrestataire {
  id: number;
  user_id?: string;
  name: string;
  title: string;
  avatar: string;
  service: string;
  services: string[];
  location: string;
  rating: number;
  reviews: number;
  pricePerHour: number | null;
  available: boolean;
  availabilityStatus: 'today' | 'tomorrow' | 'busy';
  nextAvailableAt: string | null;
  verified: boolean;
  categories: string[];
  experience: string;
  distanceKm: number | null;
  paymentMethods: string[];
}

export interface ClientIssueReportInput {
  user: ClientDashboardUser;
  targetId: string | number;
  targetTable: string;
  targetLabel: string;
  type: string;
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  adminMessage: string;
  userMessage: string;
  userLink: string;
}

const providerFallbackImage = '/images/brand/image1.jpeg';

function throwApiError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message || 'Backend request failed.');
  }
}

export async function fetchClientDashboardSnapshot(userId: string) {
  const [bookingsRes, ordersRes, favoritesRes] = await Promise.all([
    backendClient.from('bookings').select('*').eq('client_id', userId).order('created_at', { ascending: false }).limit(8),
    backendClient.from('client_orders').select('*').eq('client_id', userId).order('date', { ascending: false }).limit(8),
    backendClient.from('client_favorites').select('*').eq('client_id', userId).order('added_at', { ascending: false }).limit(4),
  ]);

  throwApiError(bookingsRes.error);
  throwApiError(ordersRes.error);
  throwApiError(favoritesRes.error);

  return {
    bookings: (bookingsRes.data as ClientDashboardBooking[]) || [],
    orders: (ordersRes.data as ClientDashboardOrder[]) || [],
    favorites: (favoritesRes.data as ClientFavoriteRow[]) || [],
  };
}

export async function fetchClientOrders(userId: string) {
  const { data, error } = await backendClient
    .from('client_orders')
    .select('*')
    .eq('client_id', userId)
    .order('date', { ascending: false });
  throwApiError(error);
  return (data as ClientDashboardOrder[]) || [];
}

export async function updateClientOrderStatus(orderId: number, status: OrderStatus) {
  const { error } = await backendClient.from('client_orders').update({ status }).eq('id', orderId);
  throwApiError(error);
}

export async function submitClientIssueReport(input: ClientIssueReportInput) {
  const { error } = await backendClient.from('admin_reports').insert({
    reported: input.targetLabel,
    target_id: String(input.targetId),
    target_table: input.targetTable,
    type: input.type,
    reason: input.reason,
    description: input.description,
    priority: input.priority,
  });
  throwApiError(error);

  await Promise.all([
    notifyAdminClientReport(input.adminMessage, input.user.avatar ?? undefined),
    notifyClientReportReceipt(input.user.id, input.userMessage, input.userLink),
  ]);
}

export async function fetchClientBookingsWithProviders(userId: string) {
  const { data: bookingData, error: bookingError } = await backendClient
    .from('bookings')
    .select('*')
    .eq('client_id', userId)
    .order('booking_date', { ascending: false });
  throwApiError(bookingError);

  const bookings = (bookingData || []) as ClientDashboardBooking[];
  const providerIds = [...new Set(
    bookings.flatMap((booking) => [booking.provider_id, booking.requested_provider_id])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
  )];

  const providerMap: Record<number, ClientDashboardProvider> = {};
  if (providerIds.length > 0) {
    const { data: providerData, error: providerError } = await backendClient
      .from('providers')
      .select('id,name,image,user_id')
      .in('id', providerIds);
    throwApiError(providerError);
    (providerData || []).forEach((provider: ClientDashboardProvider) => {
      providerMap[provider.id] = provider;
    });
  }

  return { bookings, providers: providerMap };
}

export async function cancelClientBooking(bookingId: number) {
  const { error } = await backendClient
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  throwApiError(error);
}

export async function publishClientProviderReview(params: {
  booking: ClientDashboardBooking;
  user: ClientDashboardUser;
  providerUserId?: string | null;
  rating: number;
  comment: string;
}) {
  const { booking, user, providerUserId, rating, comment } = params;
  const { error } = await backendClient.from('provider_reviews').insert({
    provider_id: booking.provider_id,
    client_id: user.id,
    client_name: `${user.firstName} ${user.lastName}`,
    rating,
    comment,
    service: booking.service,
    helpful: 0,
  });
  throwApiError(error);

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

export async function fetchClientProvidersAndFavorites(userId?: string) {
  const [providersRes, favoritesRes] = await Promise.all([
    backendClient.from<ClientDashboardProviderRow>('providers').select('*').order('rating', { ascending: false }),
    userId
      ? backendClient.from<ClientFavoriteRow>('client_favorites').select('*').eq('client_id', userId).order('added_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwApiError(providersRes.error);
  throwApiError(favoritesRes.error);

  return {
    providers: ((providersRes.data || []) as ClientDashboardProviderRow[]).map(mapProviderRowToPrestataire),
    favorites: (favoritesRes.data || []) as ClientFavoriteRow[],
  };
}

function mapProviderRowToPrestataire(provider: ClientDashboardProviderRow): ClientPrestataire {
  return {
    id: provider.id,
    user_id: provider.user_id,
    name: provider.name,
    title: provider.title || 'Prestataire C2P',
    avatar: provider.image || providerFallbackImage,
    service: Array.isArray(provider.services) && provider.services.length > 0 ? provider.services[0] : provider.title || 'Service',
    services: Array.isArray(provider.services) && provider.services.length > 0 ? provider.services : [provider.title || 'Service général'],
    location: provider.location || provider.city || 'Dakar',
    rating: Number(provider.rating || 0),
    reviews: Number(provider.reviews_count || provider.reviews || 0),
    pricePerHour: provider.price_per_hour ? Number(provider.price_per_hour) : null,
    available: provider.availability_status !== 'busy',
    availabilityStatus: provider.availability_status || 'today',
    nextAvailableAt: provider.next_available_at || null,
    verified: Boolean(provider.verified),
    categories: [
      provider.category ? String(provider.category) : null,
      ...(Array.isArray(provider.services) ? provider.services.slice(0, 2) : []),
    ].filter(Boolean) as string[],
    experience: `${Number(provider.completed_jobs || 0)} missions`,
    distanceKm: provider.distance_km ? Number(provider.distance_km) : null,
    paymentMethods: Array.isArray(provider.payment_methods) && provider.payment_methods.length > 0
      ? provider.payment_methods
      : ['wave', 'orange_money', 'card'],
  };
}

export async function addClientFavorite(clientId: string, providerId: number) {
  const response = await backendClient.from('client_favorites').insert({
    client_id: clientId,
    provider_id: providerId,
    added_at: new Date().toISOString(),
  });
  throwApiError(response.error);
  const created = response.data as ClientFavoriteRow | ClientFavoriteRow[] | null;
  return Array.isArray(created) ? (created[0] ?? null) : created;
}

export async function removeClientFavorite(favoriteId: string | number) {
  const response = await backendClient.from('client_favorites').delete().eq('id', favoriteId);
  throwApiError(response.error);
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
  const response = await backendClient.from('bookings').insert({
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
    created_at: new Date().toISOString(),
  });
  throwApiError(response.error);
}
