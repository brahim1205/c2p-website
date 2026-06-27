import type { BookingRequestType } from '@/lib/clientDashboard';
import type { ClientPrestataire as Prestataire } from '@/lib/clientDashboardApi';

export interface RequestFormState {
  requestType: BookingRequestType;
  service: string;
  date: string;
  time: string;
  budget: string;
  address: string;
  description: string;
  paymentMethod: string;
}

export const initialRequestForm: RequestFormState = {
  requestType: 'booking',
  service: '',
  date: '',
  time: '09:00',
  budget: '',
  address: '',
  description: '',
  paymentMethod: 'wave',
};

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function formatAvailability(provider: Prestataire) {
  if (provider.availabilityStatus === 'today') return 'Disponible aujourd’hui';
  if (provider.availabilityStatus === 'tomorrow') return 'Créneau demain';
  if (!provider.nextAvailableAt) return 'Indisponible';
  return `Prochain créneau ${new Date(provider.nextAvailableAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
}

export function buildSmartScore(provider: Prestataire, query: string) {
  if (!query.trim()) {
    return (provider.rating * 10) + provider.reviews - (provider.distanceKm ?? 20);
  }

  const text = normalize(query);
  let score = 0;
  if (normalize(provider.name).includes(text)) score += 8;
  if (normalize(provider.title).includes(text)) score += 5;
  if (normalize(provider.service).includes(text)) score += 6;
  if (normalize(provider.location).includes(text)) score += 4;
  if (provider.categories.some((category) => normalize(category).includes(text))) score += 4;
  if (provider.services.some((service) => normalize(service).includes(text))) score += 5;
  score += provider.rating;
  score -= (provider.distanceKm ?? 15) / 10;
  return score;
}

export function createRequestForm(provider: Prestataire, requestType: BookingRequestType): RequestFormState {
  return {
    requestType,
    service: provider.service || provider.services[0],
    date: '',
    time: '09:00',
    budget: provider.pricePerHour ? String(provider.pricePerHour) : '',
    address: '',
    description: '',
    paymentMethod: provider.paymentMethods[0] || 'wave',
  };
}
