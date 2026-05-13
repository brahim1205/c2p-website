import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  resolvePaymentLifecycleStatus,
  type PaymentLifecycleStatus,
} from './payment-status.resolver.js';

export type FinanceTransitionGraphKind =
  | 'transaction'
  | 'escrow'
  | 'payout'
  | 'subscription'
  | 'invoice'
  | 'provider_transaction'
  | 'payment_intent';

export const TRANSACTION_STATE_GRAPH: Record<PaymentLifecycleStatus, string[]> = {
  initiated: ['pending_provider', 'failed'],
  pending_provider: ['processing', 'confirmed', 'failed'],
  processing: ['confirmed', 'failed'],
  confirmed: ['refunded', 'reconciled'],
  failed: ['pending_provider'],
  refunded: [],
  reconciled: [],
};

export const ESCROW_STATE_GRAPH: Record<string, string[]> = {
  awaiting_funding: ['funded', 'refunded'],
  funded: ['assigned', 'released', 'refunded'],
  assigned: ['in_progress', 'released', 'refunded'],
  in_progress: ['delivery_review', 'released', 'refunded'],
  delivery_review: ['released', 'refunded'],
  released: [],
  refunded: [],
};

export const PAYOUT_STATE_GRAPH: Record<string, string[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: [],
  cancelled: [],
};

export const SUBSCRIPTION_STATE_GRAPH: Record<string, string[]> = {
  trialing: ['active', 'cancelled', 'expired'],
  active: ['active', 'past_due', 'cancelled', 'expired'],
  past_due: ['active', 'cancelled', 'expired'],
  expired: ['active'],
  cancelled: [],
};

export const INVOICE_STATE_GRAPH: Record<string, string[]> = {
  pending: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

export const PAYMENT_INTENT_STATE_GRAPH: Record<string, string[]> = {
  initiated: ['pending_provider', 'confirmed', 'failed', 'cancelled'],
  pending_provider: ['processing', 'confirmed', 'failed', 'cancelled'],
  processing: ['confirmed', 'failed', 'cancelled'],
  confirmed: [],
  failed: [],
  cancelled: [],
  expired: [],
};

export const FINANCE_TRANSITION_GRAPHS: Record<FinanceTransitionGraphKind, Record<string, string[]>> = {
  transaction: TRANSACTION_STATE_GRAPH,
  provider_transaction: TRANSACTION_STATE_GRAPH,
  escrow: ESCROW_STATE_GRAPH,
  payout: PAYOUT_STATE_GRAPH,
  subscription: SUBSCRIPTION_STATE_GRAPH,
  invoice: INVOICE_STATE_GRAPH,
  payment_intent: PAYMENT_INTENT_STATE_GRAPH,
};

export type FinanceTransitionDecision =
  | 'bootstrap'
  | 'noop'
  | 'advance'
  | 'advance_reachable'
  | 'preserve_regression'
  | 'preserve_terminal'
  | 'preserve_conflict';

export interface FinanceTransitionResolution {
  decision: FinanceTransitionDecision;
  previousState: string;
  attemptedState: string;
  nextState: string;
  changed: boolean;
  reachableForward: boolean;
  reachableBackward: boolean;
  terminalState: boolean;
  conflict: boolean;
}

function normalizeState(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function resolveGraph(kind: FinanceTransitionGraphKind | Record<string, string[]>) {
  return typeof kind === 'string' ? FINANCE_TRANSITION_GRAPHS[kind] : kind;
}

function isKnownState(graph: Record<string, string[]>, state: string) {
  return state.length > 0 && Object.prototype.hasOwnProperty.call(graph, state);
}

export function isTerminalFinanceState(
  kind: FinanceTransitionGraphKind | Record<string, string[]>,
  state: string,
) {
  const graph = resolveGraph(kind);
  return (graph[normalizeState(state)] ?? []).length === 0;
}

export function canReachFinanceState(
  kind: FinanceTransitionGraphKind | Record<string, string[]>,
  fromState: string,
  targetState: string,
  visited = new Set<string>(),
): boolean {
  const graph = resolveGraph(kind);
  const from = normalizeState(fromState);
  const target = normalizeState(targetState);
  if (!isKnownState(graph, from) || !isKnownState(graph, target)) {
    return false;
  }
  if (from === target) {
    return true;
  }
  if (visited.has(from)) {
    return false;
  }
  visited.add(from);
  return (graph[from] ?? []).some((candidate) => canReachFinanceState(graph, candidate, target, visited));
}

export function getFinanceTerminalStates(kind: FinanceTransitionGraphKind | Record<string, string[]>) {
  const graph = resolveGraph(kind);
  return Object.entries(graph)
    .filter(([, transitions]) => transitions.length === 0)
    .map(([state]) => state);
}

export function assertFinanceTransition(
  kind: FinanceTransitionGraphKind,
  currentState: unknown,
  nextState: unknown,
  message?: string,
) {
  const graph = resolveGraph(kind);
  const current = normalizeState(currentState);
  const next = normalizeState(nextState);
  if (!isKnownState(graph, current)) {
    throw new BadRequestException(message ?? `Etat ${String(currentState)} inconnu pour ${kind}.`);
  }
  if (!isKnownState(graph, next)) {
    throw new BadRequestException(message ?? `Transition vers ${String(nextState)} inconnue pour ${kind}.`);
  }
  if (current === next) {
    return;
  }
  if ((graph[current] ?? []).includes(next)) {
    return;
  }
  throw new ConflictException(
    message ?? `Transition ${current} -> ${next} interdite pour ${kind}.`,
  );
}

export function resolveMonotonicFinanceTransition(
  kind: FinanceTransitionGraphKind,
  currentState: unknown,
  attemptedState: unknown,
): FinanceTransitionResolution {
  const graph = resolveGraph(kind);
  const current = normalizeState(currentState);
  const attempted = normalizeState(attemptedState);

  if (!isKnownState(graph, attempted)) {
    throw new BadRequestException(`Etat cible ${String(attemptedState)} inconnu pour ${kind}.`);
  }

  if (!isKnownState(graph, current)) {
    return {
      decision: 'bootstrap',
      previousState: current,
      attemptedState: attempted,
      nextState: attempted,
      changed: current !== attempted,
      reachableForward: false,
      reachableBackward: false,
      terminalState: isTerminalFinanceState(graph, attempted),
      conflict: false,
    };
  }

  if (current === attempted) {
    return {
      decision: 'noop',
      previousState: current,
      attemptedState: attempted,
      nextState: current,
      changed: false,
      reachableForward: true,
      reachableBackward: true,
      terminalState: isTerminalFinanceState(graph, current),
      conflict: false,
    };
  }

  const directAdvance = (graph[current] ?? []).includes(attempted);
  const reachableForward = canReachFinanceState(graph, current, attempted);
  const reachableBackward = canReachFinanceState(graph, attempted, current);
  const currentTerminal = isTerminalFinanceState(graph, current);
  const attemptedTerminal = isTerminalFinanceState(graph, attempted);

  if (directAdvance) {
    return {
      decision: 'advance',
      previousState: current,
      attemptedState: attempted,
      nextState: attempted,
      changed: true,
      reachableForward: true,
      reachableBackward,
      terminalState: attemptedTerminal,
      conflict: false,
    };
  }

  if (reachableForward && !reachableBackward) {
    return {
      decision: 'advance_reachable',
      previousState: current,
      attemptedState: attempted,
      nextState: attempted,
      changed: true,
      reachableForward: true,
      reachableBackward: false,
      terminalState: attemptedTerminal,
      conflict: false,
    };
  }

  if (currentTerminal) {
    return {
      decision: 'preserve_terminal',
      previousState: current,
      attemptedState: attempted,
      nextState: current,
      changed: false,
      reachableForward,
      reachableBackward,
      terminalState: true,
      conflict: attemptedTerminal && attempted !== current,
    };
  }

  if (reachableBackward && !reachableForward) {
    return {
      decision: 'preserve_regression',
      previousState: current,
      attemptedState: attempted,
      nextState: current,
      changed: false,
      reachableForward: false,
      reachableBackward: true,
      terminalState: currentTerminal,
      conflict: false,
    };
  }

  return {
    decision: 'preserve_conflict',
    previousState: current,
    attemptedState: attempted,
    nextState: current,
    changed: false,
    reachableForward,
    reachableBackward,
    terminalState: currentTerminal,
    conflict: true,
  };
}

export function assertRefundAmountInvariant(input: {
  requestedAmount: number;
  settledAmount: number;
  alreadyRefundedAmount?: number;
}) {
  const requestedAmount = Number(input.requestedAmount ?? 0);
  const settledAmount = Number(input.settledAmount ?? 0);
  const alreadyRefundedAmount = Number(input.alreadyRefundedAmount ?? 0);

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new BadRequestException('Montant de remboursement invalide.');
  }

  if (!Number.isFinite(settledAmount) || settledAmount <= 0) {
    throw new ConflictException('Aucun montant réglé ne peut être remboursé.');
  }

  if (requestedAmount + alreadyRefundedAmount > settledAmount) {
    throw new ConflictException('Le remboursement dépasse le montant réglé.');
  }
}

export function assertPositivePayoutInvariant(input: {
  amount: number;
  currentStatus: string;
  targetStatus: string;
}) {
  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Montant de retrait invalide.');
  }

  assertFinanceTransition('payout', input.currentStatus, input.targetStatus);
}

export function normalizePaymentIntentState(value: unknown) {
  const normalized = normalizeState(value);
  if (['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'cancelled', 'expired'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'completed' || normalized === 'settled') return 'confirmed';
  if (normalized === 'pending') return 'pending_provider';
  return 'initiated';
}

export function resolveProviderLifecycleState(input: {
  type?: string | null;
  status?: string | null;
  providerStatus?: string | null;
  settledToWallet?: boolean | null;
}) {
  const normalizedStatus = normalizeState(input.status);
  if (['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'refunded', 'reconciled'].includes(normalizedStatus)) {
    return normalizedStatus as PaymentLifecycleStatus;
  }
  const normalizedProviderStatus = normalizeState(input.providerStatus);
  if (['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'refunded', 'reconciled'].includes(normalizedProviderStatus)) {
    return normalizedProviderStatus as PaymentLifecycleStatus;
  }
  return resolvePaymentLifecycleStatus(input);
}

export function mapLifecycleStatusToTransactionStatus(state: PaymentLifecycleStatus | string) {
  switch (state) {
    case 'failed':
      return 'failed';
    case 'initiated':
    case 'pending_provider':
    case 'processing':
      return 'pending';
    case 'confirmed':
    case 'reconciled':
    case 'refunded':
      return 'completed';
    default:
      return 'pending';
  }
}
