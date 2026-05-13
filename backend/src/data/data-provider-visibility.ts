import { randomBytes } from 'node:crypto';
import type { Row, Store } from './mock-store.js';

export type ProviderVisibilityTier = 'standard' | 'priority' | 'premium';
export type ProviderVisibilityRequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled';

export interface ProviderVisibilityContext {
  store: Store;
  findRow: (table: string, id: unknown) => Row | undefined;
  appendAppRows: (table: string, rows: Row[]) => Row[];
  patchAppRows: (table: string, predicate: (row: Row) => boolean, patch: Row | ((row: Row) => Row)) => Row[];
  mergeRowsToPersist: (target: Record<string, Row[]>, table: string, rows: Row[]) => void;
  collectRowsByIds: (table: string, ids: Array<string | number>) => Row[];
}

function trimText(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function toBool(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(base: string | Date | number, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function resolveProviderVisibilityTier(plan: Row | null | undefined): ProviderVisibilityTier {
  const matching = String(plan?.priority_matching ?? '').trim().toLowerCase();
  if (matching === 'high') return 'premium';
  if (matching === 'medium') return 'priority';
  return 'standard';
}

export function resolveProductVisibilityTier(product: Row | null | undefined): ProviderVisibilityTier {
  const tier = String(product?.tier ?? '').trim().toLowerCase();
  if (tier === 'premium') return 'premium';
  if (tier === 'priority') return 'priority';
  return resolveProviderVisibilityTier(product);
}

export function resolveProviderProfileLevel(plan: Row | null | undefined, fallbackVerified = false) {
  if (toBool(plan?.verified_badge) || fallbackVerified) return 'verified';
  if (Number(plan?.price_monthly ?? 0) > 0) return 'subscriber';
  return 'visitor';
}

export function resolveVisibilityPassLabel(tier: ProviderVisibilityTier) {
  if (tier === 'premium') return 'Billet premium';
  if (tier === 'priority') return 'Billet prioritaire';
  return 'Billet standard';
}

export function resolveMatchingPriority(plan: Row | null | undefined) {
  const matching = String(plan?.priority_matching ?? '').trim().toLowerCase();
  if (new Set(['low', 'medium', 'high']).has(matching)) {
    return matching;
  }
  return 'low';
}

export function syncProviderStateFromVisibilityProduct(
  userId: string,
  product: Row,
  rowsToPersist: Record<string, Row[]>,
  ctx: ProviderVisibilityContext,
) {
  const tier = resolveProductVisibilityTier(product);
  const patches = ctx.patchAppRows('providers', (row) => String(row.user_id ?? '') === String(userId), (row) => ({
    ...row,
    visibility_tier: tier,
    alerts_enabled: toBool(product.alerts_enabled, tier !== 'standard'),
  }));

  if (patches.length > 0) {
    ctx.mergeRowsToPersist(rowsToPersist, 'providers', ctx.collectRowsByIds('providers', patches.map((row) => row.id as string | number)));
  }

  return patches;
}

function buildVisibilityCode(tier: ProviderVisibilityTier) {
  const prefix = tier === 'premium' ? 'SPP' : tier === 'priority' ? 'SPR' : 'SPS';
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

export function shouldIssueProviderVisibilityPass(previous: Row | null | undefined, current: Row) {
  if (String(current.role ?? '') !== 'prestataire') return false;
  if (String(current.status ?? '') !== 'active') return false;
  if (!previous) return true;
  return String(previous.plan_id ?? '') !== String(current.plan_id ?? '')
    || String(previous.last_billed_at ?? '') !== String(current.last_billed_at ?? '');
}

export function syncProviderStateFromSubscription(
  subscription: Row,
  rowsToPersist: Record<string, Row[]>,
  ctx: ProviderVisibilityContext,
) {
  if (String(subscription.role ?? '') !== 'prestataire') return [];

  const plan = ctx.findRow('subscription_plans', subscription.plan_id);
  const tier = resolveProviderVisibilityTier(plan);
  const profileLevel = resolveProviderProfileLevel(plan);
  const verifiedFromPlan = toBool(plan?.verified_badge);
  const status = String(subscription.status ?? '');

  const patches = ctx.patchAppRows('providers', (row) => String(row.user_id ?? '') === String(subscription.user_id), (row) => {
    if (status === 'cancelled') {
      return {
        ...row,
        visibility_tier: 'standard',
        alerts_enabled: false,
        plan_name: null,
        subscription_status: 'cancelled',
        public_profile_level: verifiedFromPlan || toBool(row.verified) ? String(row.public_profile_level ?? 'verified') : 'visitor',
        identity_mode: toBool(row.verified) ? 'full_profile' : 'alias_only',
      };
    }

    return {
      ...row,
      visibility_tier: tier,
      alerts_enabled: tier !== 'standard',
      plan_name: trimText(subscription.plan_name),
      subscription_status: status || 'active',
      public_profile_level: profileLevel,
      identity_mode: profileLevel === 'verified' || toBool(row.verified) ? 'full_profile' : 'alias_only',
      verified_badge_enabled: verifiedFromPlan || toBool(row.verified_badge_enabled),
      verified: toBool(row.verified) || verifiedFromPlan,
    };
  });

  if (patches.length > 0) {
    ctx.mergeRowsToPersist(rowsToPersist, 'providers', ctx.collectRowsByIds('providers', patches.map((row) => row.id as string | number)));
  }

  return patches;
}

export function issueProviderVisibilityPass(
  previous: Row | null | undefined,
  subscription: Row,
  rowsToPersist: Record<string, Row[]>,
  ctx: ProviderVisibilityContext,
) {
  if (!shouldIssueProviderVisibilityPass(previous, subscription)) return null;

  const provider = (ctx.store.providers ?? []).find((row) => String(row.user_id ?? '') === String(subscription.user_id));
  if (!provider) return null;

  const plan = ctx.findRow('subscription_plans', subscription.plan_id);
  const tier = resolveProviderVisibilityTier(plan);
  const issuedAt = trimText(subscription.last_billed_at) ?? nowIso();
  const passId = `vispass-${Date.now()}-${randomBytes(3).toString('hex')}`;

  const superseded = ctx.patchAppRows(
    'provider_visibility_passes',
    (row) => String(row.user_id ?? '') === String(subscription.user_id) && String(row.status ?? '') === 'active',
    {
      status: 'superseded',
      superseded_at: issuedAt,
    },
  );
  if (superseded.length > 0) {
    ctx.mergeRowsToPersist(rowsToPersist, 'provider_visibility_passes', ctx.collectRowsByIds('provider_visibility_passes', superseded.map((row) => row.id as string | number)));
  }

  const created = {
    id: passId,
    provider_id: provider.id,
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    plan_id: subscription.plan_id,
    plan_name: subscription.plan_name,
    pass_tier: tier,
    pass_label: resolveVisibilityPassLabel(tier),
    code: buildVisibilityCode(tier),
    status: 'active',
    issued_at: issuedAt,
    expires_at: trimText(subscription.renews_at),
    alerts_enabled: tier !== 'standard',
    verification_eligible: toBool(plan?.verified_badge) || tier === 'premium',
    matching_priority: resolveMatchingPriority(plan),
  } satisfies Row;

  ctx.appendAppRows('provider_visibility_passes', [created]);
  ctx.mergeRowsToPersist(rowsToPersist, 'provider_visibility_passes', ctx.collectRowsByIds('provider_visibility_passes', [String(created.id)]));
  return created;
}

export function issueProviderVisibilityPassForProduct(
  params: {
    orderId: string;
    product: Row;
    providerId: string | number;
    userId: string;
    purchasedAt?: string | null;
  },
  rowsToPersist: Record<string, Row[]>,
  ctx: ProviderVisibilityContext,
) {
  const provider = ctx.findRow('providers', params.providerId);
  if (!provider) return null;

  const tier = resolveProductVisibilityTier(params.product);
  const issuedAt = trimText(params.purchasedAt) ?? nowIso();
  const durationDays = Number(params.product.duration_days ?? 30);
  const passId = `vispass-${Date.now()}-${randomBytes(3).toString('hex')}`;

  const superseded = ctx.patchAppRows(
    'provider_visibility_passes',
    (row) => String(row.user_id ?? '') === String(params.userId) && String(row.status ?? '') === 'active',
    {
      status: 'superseded',
      superseded_at: issuedAt,
    },
  );
  if (superseded.length > 0) {
    ctx.mergeRowsToPersist(rowsToPersist, 'provider_visibility_passes', ctx.collectRowsByIds('provider_visibility_passes', superseded.map((row) => row.id as string | number)));
  }

  const created = {
    id: passId,
    provider_id: provider.id,
    user_id: params.userId,
    order_id: params.orderId,
    product_id: params.product.id,
    product_name: params.product.name,
    source_type: 'provider_visibility_order',
    source_id: params.orderId,
    pass_tier: tier,
    pass_label: resolveVisibilityPassLabel(tier),
    code: buildVisibilityCode(tier),
    status: 'active',
    issued_at: issuedAt,
    expires_at: addDaysIso(issuedAt, Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 30),
    alerts_enabled: toBool(params.product.alerts_enabled, tier !== 'standard'),
    verification_eligible: toBool(params.product.verification_eligible, tier === 'premium'),
    matching_priority: resolveMatchingPriority(params.product),
  } satisfies Row;

  ctx.appendAppRows('provider_visibility_passes', [created]);
  ctx.mergeRowsToPersist(rowsToPersist, 'provider_visibility_passes', ctx.collectRowsByIds('provider_visibility_passes', [String(created.id)]));
  return created;
}

export function applyProviderVerificationDecision(
  requests: Row[],
  rowsToPersist: Record<string, Row[]>,
  ctx: ProviderVisibilityContext,
) {
  const approvedProviderIds: Array<string | number> = [];

  for (const request of requests) {
    if (String(request.status ?? '') !== 'approved') continue;
    const providerId = request.provider_id;
    if (providerId === undefined || providerId === null) continue;

    const patched = ctx.patchAppRows('providers', (row) => String(row.id) === String(providerId), {
      verified: true,
      verified_badge_enabled: true,
      public_profile_level: 'verified',
      identity_mode: 'full_profile',
    });
    if (patched.length > 0) {
      approvedProviderIds.push(providerId as string | number);
    }
  }

  if (approvedProviderIds.length > 0) {
    ctx.mergeRowsToPersist(rowsToPersist, 'providers', ctx.collectRowsByIds('providers', approvedProviderIds));
  }
}
