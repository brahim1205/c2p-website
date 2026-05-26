import { normalizeText, store } from './data-app-store.js';
import {
  requireNumberOrFallback,
  trimText,
} from './data-normalizers.js';
import type { Row } from './mock-store.js';

export function buildMatchingCandidates(booking: Row) {
  const requestedCategory = normalizeText(booking.requested_category);
  const requestedProviderId = trimText(booking.requested_provider_id);
  const requestedService = normalizeText(booking.service);

  return (store.providers ?? [])
    .map((provider) => {
      let score = 0;
      const reasons: string[] = [];

      if (requestedProviderId && String(provider.id) === requestedProviderId) {
        score += 40;
        reasons.push('Prestataire prefere par le client');
      }
      if (requestedCategory && normalizeText(provider.category) === requestedCategory) {
        score += 25;
        reasons.push('Categorie parfaitement alignee');
      }
      const services = Array.isArray(provider.services) ? provider.services.map((entry) => normalizeText(entry)) : [];
      if (requestedService && services.some((entry) => entry.includes(requestedService) || requestedService.includes(entry))) {
        score += 22;
        reasons.push('Service deja maitrise');
      }
      if (Boolean(provider.verified)) {
        score += 8;
        reasons.push('Profil verifie');
      }
      const rating = requireNumberOrFallback(provider.rating, 0);
      score += Math.round(rating * 3);
      if (rating >= 4.6) {
        reasons.push('Tres bonne note client');
      }
      const completedJobs = requireNumberOrFallback(provider.completed_jobs, 0);
      score += Math.min(15, Math.round(completedJobs / 15));
      const distanceKm = requireNumberOrFallback(provider.distance_km, 99);
      score += Math.max(0, 10 - Math.round(distanceKm));
      if (distanceKm <= 5) {
        reasons.push('Proximite logistique');
      }
      const availability = String(provider.availability_status ?? '');
      if (availability === 'today') {
        score += 8;
        reasons.push('Disponible rapidement');
      } else if (availability === 'tomorrow') {
        score += 4;
      }

      return {
        id: provider.id,
        user_id: provider.user_id ?? null,
        name: provider.name,
        category: provider.category ?? null,
        verified: Boolean(provider.verified),
        rating,
        distance_km: distanceKm,
        availability_status: availability || null,
        completed_jobs: completedJobs,
        score,
        reasons: reasons.slice(0, 3),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}
