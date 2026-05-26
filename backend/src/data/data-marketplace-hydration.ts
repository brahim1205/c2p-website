import { findUserById } from '../auth/auth.store.js';
import { clone, findRow, store } from './data-app-store.js';
import { buildMatchingCandidates } from './data-booking-matching.js';
import {
  normalizeEscrowStatus,
  parseBoolean,
  trimText,
} from './data-normalizers.js';
import type { Row } from './mock-store.js';

export function hydrateMarketplaceRow(table: string, hydrated: Row) {
  if (table === 'providers') {
    const activeSubscription = hydrated.user_id
      ? (store.user_subscriptions ?? []).find(
        (entry) => String(entry.user_id) === String(hydrated.user_id) && String(entry.status) === 'active',
      )
      : null;
    const activePlan = activeSubscription ? findRow('subscription_plans', activeSubscription.plan_id) : null;
    hydrated.reviews = hydrated.reviews ?? hydrated.reviews_count ?? 0;
    hydrated.reviews_count = hydrated.reviews_count ?? hydrated.reviews ?? 0;
    hydrated.public_alias = trimText(hydrated.public_alias) ?? `Profil C2P #${String(hydrated.id ?? '').trim() || 'senprest'}`;
    hydrated.public_profile_level = trimText(hydrated.public_profile_level)
      ?? (parseBoolean(activePlan?.verified_badge) || parseBoolean(hydrated.verified) ? 'verified' : activeSubscription ? 'subscriber' : 'visitor');
    hydrated.identity_mode = trimText(hydrated.identity_mode) ?? (parseBoolean(hydrated.verified) ? 'full_profile' : 'alias_only');
    hydrated.visibility_tier = trimText(hydrated.visibility_tier)
      ?? (trimText(activePlan?.priority_matching) === 'high' ? 'premium' : trimText(activePlan?.priority_matching) === 'medium' ? 'priority' : 'standard');
    hydrated.operations_managed = parseBoolean(hydrated.operations_managed, true);
    hydrated.alerts_enabled = parseBoolean(hydrated.alerts_enabled, Boolean(activeSubscription));
    hydrated.plan_name = hydrated.plan_name ?? activeSubscription?.plan_name ?? activePlan?.name ?? null;
    hydrated.subscription_status = hydrated.subscription_status ?? activeSubscription?.status ?? null;
    hydrated.verified_badge_enabled = parseBoolean(hydrated.verified_badge_enabled, parseBoolean(activePlan?.verified_badge));
    hydrated.verified = parseBoolean(hydrated.verified, false) || parseBoolean(activePlan?.verified_badge);
    return hydrated;
  }

  if (table === 'bookings') {
    const provider = findRow('providers', hydrated.provider_id);
    if (provider) {
      hydrated.provider = {
        id: provider.id,
        name: provider.name,
        image: provider.image,
      };
    }
    const requestedProvider = findRow('providers', hydrated.requested_provider_id);
    if (requestedProvider) {
      hydrated.requested_provider = {
        id: requestedProvider.id,
        name: requestedProvider.name,
        image: requestedProvider.image,
      };
      hydrated.requested_provider_name = hydrated.requested_provider_name ?? requestedProvider.name;
    }
    hydrated.request_channel = hydrated.request_channel ?? 'c2p_managed';
    hydrated.assignment_status = hydrated.assignment_status ?? (hydrated.provider_id ? 'assigned' : 'pending_review');
    hydrated.wallet_flow = hydrated.wallet_flow ?? 'escrow';
    hydrated.matching_candidates = buildMatchingCandidates(hydrated);
    return hydrated;
  }

  if (table === 'client_favorites') {
    const provider = findRow('providers', hydrated.provider_id);
    hydrated.provider = provider ? clone(provider) : null;
    return hydrated;
  }

  if (table === 'provider_verification_requests') {
    const provider = findRow('providers', hydrated.provider_id);
    const reviewer = findUserById(String(hydrated.reviewed_by ?? ''));
    hydrated.provider_name = hydrated.provider_name ?? provider?.name ?? provider?.public_alias ?? null;
    hydrated.requested_level = hydrated.requested_level ?? 'verified';
    hydrated.status = hydrated.status ?? 'pending';
    hydrated.source = hydrated.source ?? 'self_service';
    hydrated.note = trimText(hydrated.note) ?? '';
    hydrated.admin_notes = trimText(hydrated.admin_notes);
    hydrated.reviewed_by_name = reviewer ? `${reviewer.firstName} ${reviewer.lastName}`.trim() : null;
    return hydrated;
  }

  if (table === 'escrow_cases') {
    const booking = findRow('bookings', hydrated.booking_id);
    const provider = findRow('providers', hydrated.provider_id);
    const client = findUserById(String(hydrated.client_id ?? booking?.client_id ?? ''));
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.booking = booking ? clone(booking) : null;
    hydrated.booking_title = hydrated.booking_title ?? booking?.service ?? hydrated.service ?? null;
    hydrated.client_name = hydrated.client_name ?? booking?.client_name ?? (client ? `${client.firstName} ${client.lastName}`.trim() : null);
    hydrated.provider_name = hydrated.provider_name ?? provider?.name ?? null;
    hydrated.provider_user_id = hydrated.provider_user_id ?? provider?.user_id ?? null;
    hydrated.status = normalizeEscrowStatus(hydrated.status, 'awaiting_funding');
    hydrated.last_event_at = hydrated.released_at ?? hydrated.refunded_at ?? hydrated.funded_at ?? booking?.updated_at ?? booking?.created_at ?? null;
    return hydrated;
  }

  return null;
}
