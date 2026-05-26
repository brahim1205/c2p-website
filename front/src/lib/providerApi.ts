import { apiRequest } from './api';
import type { AuthUser } from './roles';

export type ProviderViewerAccessTier = 'visitor' | 'subscriber' | 'verified';
export type ProviderProfileLevel = 'visitor' | 'subscriber' | 'verified';

export interface ProviderRecord {
  id: number;
  user_id?: string;
  name: string;
  public_alias?: string | null;
  title?: string | null;
  category?: string | null;
  bio?: string | null;
  city?: string | null;
  location?: string | null;
  rating?: number;
  reviews?: number;
  reviews_count?: number;
  price_per_hour?: number;
  verified?: boolean;
  verified_badge_enabled?: boolean;
  image?: string | null;
  services?: string[];
  languages?: string[];
  completed_jobs?: number;
  response_time?: string | null;
  created_at?: string;
  public_profile_level?: string | null;
  identity_mode?: string | null;
  visibility_tier?: string | null;
  operations_managed?: boolean | null;
  alerts_enabled?: boolean | null;
  plan_name?: string | null;
  subscription_status?: string | null;
}

export interface ProviderReviewRecord {
  id: number;
  provider_id: number;
  client_id?: string | null;
  client_name: string;
  client_avatar?: string | null;
  rating: number;
  comment: string;
  service: string;
  helpful?: number;
  created_at: string;
}

export interface ProviderCatalogRecord extends ProviderRecord {
  public_alias: string;
  reviews: number;
  reviews_count: number;
  rating: number;
  price_per_hour: number;
  verified: boolean;
  verified_badge_enabled: boolean;
  image: string | null;
  services: string[];
  languages: string[];
  completed_jobs: number;
  response_time: string | null;
  public_profile_level: ProviderProfileLevel;
  identity_mode: 'alias_only' | 'full_profile';
  visibility_tier: 'standard' | 'priority' | 'premium';
  operations_managed: boolean;
  alerts_enabled: boolean;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeProviderProfileLevel(value: unknown): ProviderProfileLevel {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'verified') return 'verified';
  if (normalized === 'subscriber') return 'subscriber';
  return 'visitor';
}

export function normalizeViewerAccessTier(user: AuthUser | null | undefined): ProviderViewerAccessTier {
  if (!user) return 'visitor';
  if (user.role === 'admin' || user.expertVerified) return 'verified';
  return 'subscriber';
}

export function normalizeProviderCatalogRecord(provider: ProviderRecord | Record<string, unknown>): ProviderCatalogRecord {
  const raw = provider as Record<string, unknown>;
  const identityMode = String(provider.identity_mode ?? '').trim().toLowerCase() === 'full_profile' ? 'full_profile' : 'alias_only';
  const visibilityTierRaw = String(provider.visibility_tier ?? '').trim().toLowerCase();
  const visibilityTier = visibilityTierRaw === 'premium'
    ? 'premium'
    : visibilityTierRaw === 'priority'
      ? 'priority'
      : 'standard';

  const verifiedBadgeEnabled = Boolean(provider.verified_badge_enabled);

  return {
    id: toNumber(provider.id),
    user_id: typeof provider.user_id === 'string' ? provider.user_id : undefined,
    name: String(provider.name ?? raw.full_name ?? 'Prestataire C2P'),
    public_alias: String(provider.public_alias ?? provider.name ?? `Profil C2P #${String(provider.id ?? '').trim() || 'senprest'}`),
    title: typeof provider.title === 'string' ? provider.title : null,
    category: typeof provider.category === 'string' ? provider.category : null,
    bio: typeof provider.bio === 'string' ? provider.bio : null,
    city: typeof provider.city === 'string' ? provider.city : null,
    location: typeof provider.location === 'string' ? provider.location : null,
    rating: toNumber(provider.rating, 0),
    reviews: toNumber(provider.reviews ?? provider.reviews_count, 0),
    reviews_count: toNumber(provider.reviews_count ?? provider.reviews, 0),
    price_per_hour: toNumber(provider.price_per_hour ?? raw.price ?? raw.hourly_rate ?? raw.hourlyRate, 0),
    verified: Boolean(provider.verified) || verifiedBadgeEnabled,
    verified_badge_enabled: verifiedBadgeEnabled,
    image: typeof provider.image === 'string' ? provider.image : null,
    services: toStringArray(provider.services),
    languages: toStringArray(provider.languages),
    completed_jobs: toNumber(provider.completed_jobs ?? raw.completedJobs ?? raw.jobs, 0),
    response_time: typeof provider.response_time === 'string' ? provider.response_time : null,
    created_at: typeof provider.created_at === 'string' ? provider.created_at : undefined,
    public_profile_level: normalizeProviderProfileLevel(provider.public_profile_level),
    identity_mode: identityMode,
    visibility_tier: visibilityTier,
    operations_managed: Boolean(provider.operations_managed ?? true),
    alerts_enabled: Boolean(provider.alerts_enabled),
    plan_name: typeof provider.plan_name === 'string' ? provider.plan_name : null,
    subscription_status: typeof provider.subscription_status === 'string' ? provider.subscription_status : null,
  };
}

const TIER_ORDER: Record<ProviderViewerAccessTier | ProviderProfileLevel, number> = {
  visitor: 0,
  subscriber: 1,
  verified: 2,
};

export function canAccessProviderProfile(
  viewerTier: ProviderViewerAccessTier,
  requiredTier: ProviderProfileLevel,
) {
  return TIER_ORDER[viewerTier] >= TIER_ORDER[requiredTier];
}

export function getProviderTierLabel(level: ProviderProfileLevel) {
  switch (level) {
    case 'verified':
      return 'Réservé vérifié';
    case 'subscriber':
      return 'Réservé abonné';
    default:
      return 'Ouvert visiteurs';
  }
}

export function getProviderTierMessage(level: ProviderProfileLevel) {
  switch (level) {
    case 'verified':
      return 'Le détail complet est réservé aux comptes vérifiés par C2P.';
    case 'subscriber':
      return 'Le détail complet est réservé aux membres connectés à l’écosystème C2P.';
    default:
      return 'Le profil peut être consulté librement avant mise en relation par C2P.';
  }
}

export function getProviderVisibilityLabel(tier: ProviderCatalogRecord['visibility_tier']) {
  switch (tier) {
    case 'premium':
      return 'Visibilité premium';
    case 'priority':
      return 'Visibilité prioritaire';
    default:
      return 'Visibilité standard';
  }
}

export function getProviderVisibilityPassLabel(tier: ProviderCatalogRecord['visibility_tier']) {
  switch (tier) {
    case 'premium':
      return 'Billet premium';
    case 'priority':
      return 'Billet prioritaire';
    default:
      return 'Billet standard';
  }
}

export function getProviderVisibilityPassHint(tier: ProviderCatalogRecord['visibility_tier']) {
  switch (tier) {
    case 'premium':
      return 'Badge vérifié, remontée prioritaire et traitement premium par C2P.';
    case 'priority':
      return 'Alertes ciblées et remontée renforcée dans les flux SenPresta.';
    default:
      return 'Présence standard dans SenPresta avec mise en relation pilotée par C2P.';
  }
}

export function getProviderDisplayName(
  provider: Pick<ProviderCatalogRecord, 'name' | 'public_alias' | 'identity_mode' | 'public_profile_level'>,
  viewerTier: ProviderViewerAccessTier,
) {
  if (provider.identity_mode === 'full_profile' && canAccessProviderProfile(viewerTier, provider.public_profile_level)) {
    return provider.name;
  }
  return provider.public_alias;
}

export async function fetchProviderByUserId(userId: string) {
  return apiRequest<ProviderRecord | null>(`/marketplace/providers/by-user/${encodeURIComponent(userId)}`);
}

export async function fetchPublicProviders() {
  const data = await apiRequest<ProviderRecord[]>('/marketplace/providers/public');
  return data.map(normalizeProviderCatalogRecord);
}

export async function fetchPublicProvider(id: number) {
  const data = await apiRequest<ProviderRecord | null>(`/marketplace/providers/public/${encodeURIComponent(String(id))}`);
  return data ? normalizeProviderCatalogRecord(data) : null;
}

export async function fetchPublicProviderReviews(id: number) {
  return apiRequest<ProviderReviewRecord[]>(`/marketplace/providers/public/${encodeURIComponent(String(id))}/reviews`);
}
