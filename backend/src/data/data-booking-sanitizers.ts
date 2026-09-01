import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { findRow } from './data-app-store.js';
import { getProviderIdsForUser } from './data-actor-scope.js';
import { computeBookingFinancials } from './data-finance-context.js';
import {
  ensureFutureDateString,
  normalizeBookingRequestType,
  normalizeBookingStatus,
  requireNumberInRange,
  requireText,
  toNumber,
  trimText,
} from './data-normalizers.js';
import type { Row } from './mock-store.js';

export function sanitizeBookingCreateRecord(row: Row, user: AuthUser) {
  if (user.role !== 'client' || String(row.client_id ?? user.id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const bookingDate = requireText(row.booking_date, 'La date souhaitee est obligatoire.');
  ensureFutureDateString(bookingDate, 'La date souhaitee doit etre dans le futur.');
  const bookingTime = trimText(row.booking_time) ?? '09:00';
  const price = row.price === null || row.price === undefined ? null : requireNumberInRange(row.price, 0, 100_000_000, 'Le budget est invalide.');
  const requestedProviderId = trimText(row.requested_provider_id ?? row.provider_id);
  const requestedProvider = requestedProviderId ? findRow('providers', requestedProviderId) : null;
  const financials = computeBookingFinancials(price, trimText(requestedProvider?.user_id));

  return {
    ...row,
    client_id: user.id,
    client_name: `${user.firstName} ${user.lastName}`.trim(),
    client_email: user.email ?? trimText(row.client_email),
    provider_id: null,
    requested_provider_id: requestedProvider ? requestedProvider.id : requestedProviderId,
    requested_provider_name: requestedProvider?.name ?? null,
    requested_category: trimText(row.requested_category) ?? trimText(requestedProvider?.category),
    service: requireText(row.service, 'Le service souhaite est obligatoire.'),
    description: requireText(row.description, 'La description du besoin est obligatoire.'),
    address: requireText(row.address, 'L adresse ou le lieu d intervention est obligatoire.'),
    booking_date: bookingDate,
    booking_time: bookingTime,
    request_type: normalizeBookingRequestType(row.request_type),
    payment_method: trimText(row.payment_method) ?? 'wallet',
    payment_transaction_id: trimText(row.payment_transaction_id) ?? null,
    financial_operation_id: trimText(row.financial_operation_id) ?? null,
    status: 'pending',
    request_channel: 'c2p_managed',
    assignment_status: 'pending_review',
    assigned_by_c2p: null,
    assigned_at: null,
    wallet_flow: 'escrow',
    price,
    commission_rate: financials.commissionRate,
    platform_fee_amount: financials.platformFeeAmount,
    provider_payout_amount: financials.providerPayoutAmount,
  };
}

export function sanitizeBookingUpdateRecord(existingRow: Row, payload: Row, user: AuthUser) {
  const currentStatus = normalizeBookingStatus(existingRow.status, 'pending');
  const nextStatus = normalizeBookingStatus(payload.status, currentStatus);

  if (user.role === 'client') {
    if (String(existingRow.client_id) !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (nextStatus !== 'cancelled') {
      throw new UnauthorizedException('Le client ne peut qu annuler sa demande.');
    }
    if (!new Set(['pending', 'confirmed']).has(currentStatus)) {
      throw new BadRequestException('Cette demande ne peut plus etre annulee.');
    }
    return {
      status: 'cancelled',
      cancellation_reason: trimText(payload.cancellation_reason) ?? 'Annulation client',
      cancelled_at: new Date().toISOString(),
    };
  }

  if (user.role === 'prestataire') {
    const currentProviderId = String(existingRow.provider_id ?? '');
    const providerIds = getProviderIdsForUser(user.id);
    if (!providerIds.includes(currentProviderId)) {
      throw new UnauthorizedException('Acces refuse.');
    }

    const allowedTransitions = new Map<string, string[]>([
      ['confirmed', ['in_progress', 'declined']],
      ['in_progress', ['completed']],
      ['completed', []],
      ['declined', []],
      ['pending', []],
      ['cancelled', []],
    ]);

    const allowedNextStatuses = allowedTransitions.get(currentStatus) ?? [];
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException('Transition de mission invalide.');
    }

    return {
      status: nextStatus,
      provider_progress_note: trimText(payload.provider_progress_note) ?? trimText(existingRow.provider_progress_note),
    };
  }

  if (isAdminRole(user)) {
    const providerIdCandidate = payload.provider_id === null
      ? null
      : payload.provider_id !== undefined
        ? toNumber(payload.provider_id)
        : toNumber(existingRow.provider_id);

    if (payload.provider_id !== undefined && payload.provider_id !== null && providerIdCandidate === null) {
      throw new BadRequestException('Le prestataire assigne est invalide.');
    }

    const assignedProvider = providerIdCandidate !== null ? findRow('providers', providerIdCandidate) : null;
    if (providerIdCandidate !== null && !assignedProvider) {
      throw new BadRequestException('Le prestataire assigne est introuvable.');
    }

    const nextPrice = payload.price === undefined
      ? (existingRow.price === null || existingRow.price === undefined ? null : requireNumberInRange(existingRow.price, 0, 100_000_000, 'Le montant est invalide.'))
      : (payload.price === null ? null : requireNumberInRange(payload.price, 0, 100_000_000, 'Le montant est invalide.'));
    const financials = computeBookingFinancials(nextPrice, trimText(assignedProvider?.user_id) ?? trimText(findRow('providers', existingRow.provider_id)?.user_id));

    return {
      provider_id: assignedProvider?.id ?? null,
      requested_provider_id: payload.requested_provider_id ?? existingRow.requested_provider_id ?? null,
      requested_provider_name: payload.requested_provider_name ?? existingRow.requested_provider_name ?? null,
      status: nextStatus,
      assignment_status: assignedProvider ? 'assigned' : 'pending_review',
      assigned_by_c2p: assignedProvider ? user.id : null,
      assigned_at: assignedProvider ? (trimText(payload.assigned_at) ?? new Date().toISOString()) : null,
      c2p_note: trimText(payload.c2p_note) ?? trimText(existingRow.c2p_note),
      payment_method: trimText(payload.payment_method) ?? trimText(existingRow.payment_method) ?? 'wallet',
      price: nextPrice,
      commission_rate: financials.commissionRate,
      platform_fee_amount: financials.platformFeeAmount,
      provider_payout_amount: financials.providerPayoutAmount,
      wallet_flow: trimText(payload.wallet_flow) ?? trimText(existingRow.wallet_flow) ?? 'escrow',
      request_channel: trimText(payload.request_channel) ?? trimText(existingRow.request_channel) ?? 'c2p_managed',
    };
  }

  throw new UnauthorizedException('Acces refuse.');
}
