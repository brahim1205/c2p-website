import { apiRequest } from '@/lib/api';
import type {
  ClientDashboardProviderRow,
  ClientDashboardProviderServiceItem,
  ClientFavoriteRow,
  ClientPrestataire,
  ClientDashboardUser,
} from './types';

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
    return { providers: providers.flatMap(mapProviderRowToServiceCards), favorites: [] as ClientFavoriteRow[] };
  }
  const snapshot = await apiRequest<{ providers: ClientDashboardProviderRow[]; favorites: ClientFavoriteRow[] }>('/marketplace/client/providers');

  return {
    providers: snapshot.providers.flatMap(mapProviderRowToServiceCards),
    favorites: snapshot.favorites,
  };
}

function mapProviderRowToServiceCards(provider: ClientDashboardProviderRow): ClientPrestataire[] {
  const base = mapProviderRowToPrestataire(provider);
  const serviceItems = Array.isArray(provider.service_items) ? provider.service_items : [];
  const detailedTitles = new Set(
    serviceItems
      .map((service) => String(service.title ?? '').trim().toLowerCase())
      .filter(Boolean),
  );
  const fallbackItems: ClientDashboardProviderServiceItem[] = base.services
    .filter((title) => !detailedTitles.has(title.trim().toLowerCase()))
    .map((title, index) => ({ id: `fallback-${index}`, title }));
  const items = [...serviceItems, ...fallbackItems];

  if (items.length === 0) return [base];

  return items.map((service, index) => {
    const title = String(service.title || base.service || base.title || 'Service professionnel');
    const servicePrice = service.price ?? null;
    const serviceCategory = service.category || provider.category || null;
    return {
      ...base,
      resultKey: `${provider.id}-${String(service.id ?? index)}-${title}`,
      service: title,
      services: [title, ...base.services.filter((entry) => entry !== title)],
      avatar: service.image || base.avatar,
      location: service.location || base.location,
      pricePerHour: priceToNumber(servicePrice) ?? base.pricePerHour,
      categories: [
        serviceCategory ? String(serviceCategory) : null,
        provider.category ? String(provider.category) : null,
        title,
      ].filter(Boolean) as string[],
      serviceDescription: service.description ?? null,
      servicePriceLabel: servicePrice,
      serviceCategory,
    };
  });
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

function priceToNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s|\u202f|\u00a0/g, '').replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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
