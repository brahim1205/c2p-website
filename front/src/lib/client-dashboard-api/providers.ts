import { apiRequest } from '@/lib/api';
import type { ClientDashboardProviderRow, ClientFavoriteRow, ClientPrestataire, ClientDashboardUser } from './types';

const providerFallbackImage = '/images/brand/image1.jpeg';

export async function publishClientProviderDirectReview(params: {
  providerId: number;
  user: ClientDashboardUser;
  service: string;
  rating: number;
  comment: string;
}) {
  const { providerId, user, service, rating, comment } = params;
  await apiRequest(`/marketplace/client/providers/${encodeURIComponent(String(providerId))}/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      client_name: `${user.firstName} ${user.lastName}`,
      client_avatar: user.avatar ?? null,
      service,
      rating,
      comment,
    }),
  });
}

export async function fetchClientProvidersAndFavorites(userId?: string) {
  if (!userId) {
    const providers = await apiRequest<ClientDashboardProviderRow[]>('/marketplace/providers/public');
    return { providers: providers.map(mapProviderRowToPrestataire), favorites: [] as ClientFavoriteRow[] };
  }
  const snapshot = await apiRequest<{ providers: ClientDashboardProviderRow[]; favorites: ClientFavoriteRow[] }>('/marketplace/client/providers');

  return {
    providers: snapshot.providers.map(mapProviderRowToPrestataire),
    favorites: snapshot.favorites,
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
  void clientId;
  return apiRequest<ClientFavoriteRow>('/marketplace/client/favorites', {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      provider_id: providerId,
    }),
  });
}

export async function removeClientFavorite(favoriteId: string | number) {
  await apiRequest<ClientFavoriteRow>(`/marketplace/client/favorites/${encodeURIComponent(String(favoriteId))}`, {
    method: 'DELETE',
  });
}
