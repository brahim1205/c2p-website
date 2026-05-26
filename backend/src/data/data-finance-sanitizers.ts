import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { findUserById, isAdminRole, type AuthUser } from '../auth/auth.store.js';
import type { Row } from './mock-store.js';
import { clone, findRow, store } from './data-app-store.js';
import {
  parseBoolean,
  requireIdentifier,
  requireNumberInRange,
  requireNumberOrFallback,
  requireText,
  trimText,
} from './data-normalizers.js';

function addDaysIso(base: string | Date | number, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getWalletAccountRow(userId: string) {
  return (store.wallet_accounts ?? []).find((row) => String(row.user_id) === String(userId)) ?? null;
}

function getPendingPayoutReservations(userId: string) {
  return (store.payout_requests ?? [])
    .filter((request) => (
      String(request.user_id) === String(userId)
      && new Set(['pending', 'approved']).has(String(request.status))
    ))
    .reduce((sum, request) => sum + Math.max(0, requireNumberOrFallback(request.amount, 0)), 0);
}

function getWalletAvailableBalance(userId: string) {
  const wallet = getWalletAccountRow(userId);
  const balance = requireNumberOrFallback(wallet?.balance, 0);
  return Math.max(0, balance - getPendingPayoutReservations(userId));
}

function findSubscriptionPlan(planId: unknown) {
  const parsedPlanId = requireIdentifier(planId, 'Le plan d abonnement est invalide.');
  const plan = findRow('subscription_plans', parsedPlanId);
  if (!plan) {
    throw new BadRequestException('Le plan d abonnement est introuvable.');
  }
  return { plan, parsedPlanId };
}

export function sanitizePayoutAccountRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('payout_accounts', normalized.id) : null;
  const targetUserId = isAdminRole(user)
    ? requireIdentifier(normalized.user_id ?? existing?.user_id, 'Le titulaire du compte de retrait est invalide.')
    : user.id;

  if (!isAdminRole(user) && existing && String(existing.user_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  normalized.user_id = targetUserId;
  normalized.method = trimText(normalized.method) ?? 'bank';
  if (!new Set(['bank', 'paypal', 'orange_money', 'wave', 'free_money', 'mtn_money']).has(String(normalized.method))) {
    throw new BadRequestException('La methode de retrait est invalide.');
  }

  normalized.account_name = requireText(normalized.account_name, 'Le nom du beneficiaire est obligatoire.');
  normalized.account_identifier = requireText(normalized.account_identifier, 'La reference du compte est obligatoire.');
  normalized.label = requireText(normalized.label, 'Le libelle du compte est obligatoire.');
  normalized.is_default = parseBoolean(normalized.is_default, false);
  normalized.status = trimText(normalized.status) ?? 'active';
  if (!new Set(['active', 'archived']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut du compte de retrait est invalide.');
  }

  return normalized;
}

export function sanitizePayoutRequestRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('payout_requests', normalized.id) : null;
  const targetUserId = isAdminRole(user)
    ? requireIdentifier(normalized.user_id ?? existing?.user_id, 'Le titulaire de la demande est invalide.')
    : user.id;

  if (!isAdminRole(user) && existing && String(existing.user_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  normalized.user_id = targetUserId;
  const accountId = requireIdentifier(normalized.account_id ?? existing?.account_id, 'Le compte de retrait est obligatoire.');
  const account = findRow('payout_accounts', accountId);
  if (!account || String(account.user_id) !== String(targetUserId)) {
    throw new BadRequestException('Le compte de retrait est introuvable.');
  }

  normalized.account_id = accountId;
  normalized.method = String(account.method);
  normalized.account_label = account.label ?? null;
  normalized.account_identifier = account.account_identifier ?? null;
  normalized.amount = requireNumberInRange(normalized.amount, 1000, 1000000000, 'Le montant du retrait est invalide.');
  if (!existing && !isAdminRole(user) && requireNumberOrFallback(normalized.amount, 0) > getWalletAvailableBalance(targetUserId)) {
    throw new BadRequestException('Le montant demande depasse le solde disponible pour retrait.');
  }
  normalized.currency = trimText(normalized.currency) ?? 'XAF';
  normalized.note = trimText(normalized.note) ?? '';
  const currentStatus = trimText(existing?.status) ?? 'pending';
  const nextStatus = trimText(normalized.status) ?? currentStatus;

  if (!new Set(['pending', 'approved', 'paid', 'rejected', 'cancelled']).has(nextStatus)) {
    throw new BadRequestException('Le statut de la demande de retrait est invalide.');
  }

  if (!isAdminRole(user)) {
    if (!existing) {
      normalized.status = 'pending';
      normalized.processed_at = null;
    } else if (currentStatus === 'pending' && nextStatus === 'cancelled') {
      normalized.status = 'cancelled';
      normalized.processed_at = existing.processed_at ?? null;
    } else {
      normalized.status = currentStatus;
      normalized.processed_at = existing.processed_at ?? null;
    }
  } else {
    normalized.status = nextStatus;
    normalized.processed_at = nextStatus === 'paid' || nextStatus === 'rejected' ? new Date().toISOString() : (existing?.processed_at ?? null);
  }

  normalized.requested_at = existing?.requested_at ?? new Date().toISOString();
  return normalized;
}

export function sanitizeUserSubscriptionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('user_subscriptions', normalized.id) : null;
  const targetUserId = isAdminRole(user)
    ? requireIdentifier(normalized.user_id ?? existing?.user_id, 'Le titulaire de l abonnement est invalide.')
    : user.id;

  if (!isAdminRole(user) && existing && String(existing.user_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const targetUser = findUserById(String(targetUserId)) ?? findRow('auth_users', targetUserId);
  if (!targetUser) {
    throw new BadRequestException('Le titulaire de l abonnement est introuvable.');
  }
  if (!new Set(['prestataire', 'formateur', 'porteur', 'partenaire']).has(String(targetUser.role))) {
    throw new BadRequestException('Ce role ne peut pas souscrire a un abonnement SaaS.');
  }

  const { plan, parsedPlanId } = findSubscriptionPlan(normalized.plan_id ?? existing?.plan_id);
  if (!Boolean(plan.active ?? true)) {
    throw new BadRequestException('Ce plan d abonnement n est plus disponible.');
  }

  if (!isAdminRole(user) && String(plan.role) !== targetUser.role) {
    throw new UnauthorizedException('Ce plan ne correspond pas a votre role.');
  }

  const nowIso = new Date().toISOString();
  const renewNow = parseBoolean(normalized.renew_now, false);
  const planChanged = existing ? String(existing.plan_id) !== parsedPlanId : true;
  const allowedStatuses = new Set(['trialing', 'active', 'past_due', 'expired', 'cancelled']);
  const requestedStatus = trimText(normalized.status) ?? trimText(existing?.status) ?? 'active';
  const requiresCharge = !isAdminRole(user) && requestedStatus !== 'cancelled' && requestedStatus !== 'trialing' && (!existing || renewNow || planChanged);
  if (!allowedStatuses.has(requestedStatus)) {
    throw new BadRequestException('Le statut de l abonnement est invalide.');
  }

  normalized.user_id = targetUserId;
  normalized.role = String(plan.role);
  normalized.plan_id = parsedPlanId;
  normalized.plan_name = String(plan.name);
  normalized.currency = String(plan.currency ?? 'XAF');
  normalized.amount = requireNumberOrFallback(plan.price_monthly, 0);
  normalized.commission_rate = requireNumberOrFallback(plan.commission_rate, 0);
  normalized.auto_renew = parseBoolean(normalized.auto_renew, existing ? Boolean(existing.auto_renew) : true);
  if (requiresCharge && requireNumberOrFallback(normalized.amount, 0) > getWalletAvailableBalance(targetUserId)) {
    throw new BadRequestException('Solde insuffisant pour activer ou renouveler cet abonnement.');
  }

  if (isAdminRole(user)) {
    normalized.status = requestedStatus;
    normalized.started_at = trimText(normalized.started_at) ?? trimText(existing?.started_at) ?? nowIso;
    normalized.renews_at = trimText(normalized.renews_at) ?? trimText(existing?.renews_at) ?? addDaysIso(nowIso, 30);
    normalized.last_billed_at = trimText(normalized.last_billed_at) ?? trimText(existing?.last_billed_at) ?? nowIso;
  } else if (requestedStatus === 'cancelled') {
    normalized.status = 'cancelled';
    normalized.started_at = trimText(existing?.started_at) ?? nowIso;
    normalized.renews_at = trimText(existing?.renews_at) ?? addDaysIso(nowIso, 30);
    normalized.last_billed_at = trimText(existing?.last_billed_at) ?? nowIso;
  } else if (requestedStatus === 'trialing') {
    const trialDays = Math.max(1, Math.min(30, Number(normalized.trial_days ?? 14) || 14));
    normalized.status = 'trialing';
    normalized.auto_renew = false;
    normalized.started_at = trimText(existing?.started_at) ?? nowIso;
    normalized.renews_at = addDaysIso(nowIso, trialDays);
    normalized.last_billed_at = trimText(existing?.last_billed_at) ?? null;
  } else {
    const billingAnchor = existing && !planChanged && !renewNow && trimText(existing.renews_at)
      ? String(existing.renews_at)
      : nowIso;
    normalized.status = 'active';
    normalized.started_at = trimText(existing?.started_at) ?? nowIso;
    normalized.renews_at = addDaysIso(billingAnchor, 30);
    normalized.last_billed_at = nowIso;
  }

  delete normalized.renew_now;
  delete normalized.trial_days;
  return normalized;
}
