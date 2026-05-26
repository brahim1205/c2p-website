import { useEffect, useState } from 'react';
import { fetchDexPayProviderTransactionCapabilities } from '@/lib/adminApi';
import {
  hasFinanceCapabilityAction,
  resolvePaymentLifecycleStatus,
  resolvePaymentUiCapabilitiesFromSnapshot,
  type PaymentLifecycleStatus,
} from '@/lib/paymentStatus';
import {
  fetchEscrowCapabilities,
  fetchPayoutCapabilities,
  fetchTransactionCapabilities,
  type FinanceCapabilitySnapshot,
} from '@/lib/saasApi';
import type {
  EscrowRow,
  PayoutRow,
  ProviderTransactionRow,
  TransactionRow,
} from './useAdminPaymentsData';

const providerLifecycleStatuses: PaymentLifecycleStatus[] = [
  'initiated',
  'pending_provider',
  'processing',
  'confirmed',
  'failed',
  'refunded',
  'reconciled',
];

function resolveProviderLifecycle(item: ProviderTransactionRow): PaymentLifecycleStatus {
  const lifecycle = String(item.lifecycleStatus || item.providerStatus).toLowerCase();
  return providerLifecycleStatuses.includes(lifecycle as PaymentLifecycleStatus)
    ? lifecycle as PaymentLifecycleStatus
    : 'processing';
}

interface AdminPaymentCapabilitiesInput {
  filteredTransactions: TransactionRow[];
  providerTransactions: ProviderTransactionRow[];
  pendingEscrows: EscrowRow[];
  pendingPayouts: PayoutRow[];
}

export function useAdminPaymentCapabilities({
  filteredTransactions,
  providerTransactions,
  pendingEscrows,
  pendingPayouts,
}: AdminPaymentCapabilitiesInput) {
  const [transactionCapabilities, setTransactionCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [providerTransactionCapabilities, setProviderTransactionCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [escrowCapabilities, setEscrowCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [payoutCapabilities, setPayoutCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});

  useEffect(() => {
    const missingTransactionIds = filteredTransactions
      .map((transaction) => String(transaction.id))
      .filter((id) => !transactionCapabilities[id]);
    const missingProviderReferences = providerTransactions
      .map((transaction) => transaction.providerReference)
      .filter((reference): reference is string => Boolean(reference) && !providerTransactionCapabilities[reference]);
    const missingEscrowIds = pendingEscrows
      .map((escrow) => String(escrow.id))
      .filter((id) => !escrowCapabilities[id]);
    const missingPayoutIds = pendingPayouts
      .map((request) => String(request.id))
      .filter((id) => !payoutCapabilities[id]);

    if (!missingTransactionIds.length && !missingProviderReferences.length && !missingEscrowIds.length && !missingPayoutIds.length) {
      return;
    }

    let cancelled = false;
    void Promise.allSettled([
      ...missingTransactionIds.map(async (id) => ({ kind: 'transaction' as const, id, snapshot: await fetchTransactionCapabilities(id) })),
      ...missingProviderReferences.map(async (reference) => ({ kind: 'provider' as const, id: reference, snapshot: await fetchDexPayProviderTransactionCapabilities(reference) })),
      ...missingEscrowIds.map(async (id) => ({ kind: 'escrow' as const, id, snapshot: await fetchEscrowCapabilities(id) })),
      ...missingPayoutIds.map(async (id) => ({ kind: 'payout' as const, id, snapshot: await fetchPayoutCapabilities(id) })),
    ]).then((results) => {
      if (cancelled) return;

      const nextTransactions: Record<string, FinanceCapabilitySnapshot> = {};
      const nextProviders: Record<string, FinanceCapabilitySnapshot> = {};
      const nextEscrows: Record<string, FinanceCapabilitySnapshot> = {};
      const nextPayouts: Record<string, FinanceCapabilitySnapshot> = {};

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { kind, id, snapshot } = result.value;
        if (kind === 'transaction') nextTransactions[id] = snapshot;
        if (kind === 'provider') nextProviders[id] = snapshot;
        if (kind === 'escrow') nextEscrows[id] = snapshot;
        if (kind === 'payout') nextPayouts[id] = snapshot;
      }

      if (Object.keys(nextTransactions).length) setTransactionCapabilities((current) => ({ ...current, ...nextTransactions }));
      if (Object.keys(nextProviders).length) setProviderTransactionCapabilities((current) => ({ ...current, ...nextProviders }));
      if (Object.keys(nextEscrows).length) setEscrowCapabilities((current) => ({ ...current, ...nextEscrows }));
      if (Object.keys(nextPayouts).length) setPayoutCapabilities((current) => ({ ...current, ...nextPayouts }));
    });

    return () => {
      cancelled = true;
    };
  }, [
    escrowCapabilities,
    filteredTransactions,
    payoutCapabilities,
    pendingEscrows,
    pendingPayouts,
    providerTransactionCapabilities,
    providerTransactions,
    transactionCapabilities,
  ]);

  const getTransactionCapabilitySnapshot = (transaction: TransactionRow) => transactionCapabilities[String(transaction.id)] ?? null;
  const getProviderTransactionCapabilitySnapshot = (item: ProviderTransactionRow) => providerTransactionCapabilities[item.providerReference] ?? null;
  const getEscrowCapabilitySnapshot = (escrow: EscrowRow) => escrowCapabilities[String(escrow.id)] ?? null;
  const getPayoutCapabilitySnapshot = (request: PayoutRow) => payoutCapabilities[String(request.id)] ?? null;

  const getTransactionCapabilities = (transaction: TransactionRow) => resolvePaymentUiCapabilitiesFromSnapshot(getTransactionCapabilitySnapshot(transaction), {
    status: resolvePaymentLifecycleStatus({
      type: transaction.type,
      status: transaction.status,
    }),
    role: 'admin',
    context: 'transaction_list',
    providerBacked: false,
    transactionType: transaction.type,
  });

  const getProviderTransactionCapabilities = (item: ProviderTransactionRow) => resolvePaymentUiCapabilitiesFromSnapshot(getProviderTransactionCapabilitySnapshot(item), {
    status: resolveProviderLifecycle(item),
    role: 'admin',
    context: 'provider_console',
    providerBacked: true,
  });

  const canReleaseEscrow = (escrow: EscrowRow) => {
    const snapshot = getEscrowCapabilitySnapshot(escrow);
    if (snapshot) return hasFinanceCapabilityAction(snapshot, 'release_escrow');
    return ['funded', 'assigned', 'in_progress', 'delivery_review'].includes(escrow.status);
  };

  const canRefundEscrow = (escrow: EscrowRow) => {
    const snapshot = getEscrowCapabilitySnapshot(escrow);
    if (snapshot) return hasFinanceCapabilityAction(snapshot, 'refund_escrow');
    return ['delivery_review', 'assigned', 'in_progress', 'funded'].includes(escrow.status);
  };

  const canApprovePayout = (request: PayoutRow) => {
    const snapshot = getPayoutCapabilitySnapshot(request);
    if (snapshot) return hasFinanceCapabilityAction(snapshot, 'approve_payout');
    return request.status === 'pending';
  };

  const canRejectPayout = (request: PayoutRow) => {
    const snapshot = getPayoutCapabilitySnapshot(request);
    if (snapshot) return hasFinanceCapabilityAction(snapshot, 'reject_payout');
    return ['pending', 'approved'].includes(request.status);
  };

  const canMarkPayoutPaid = (request: PayoutRow) => {
    const snapshot = getPayoutCapabilitySnapshot(request);
    if (snapshot) return hasFinanceCapabilityAction(snapshot, 'mark_payout_paid');
    return ['pending', 'approved'].includes(request.status);
  };

  return {
    getTransactionCapabilities,
    getProviderTransactionCapabilities,
    canReleaseEscrow,
    canRefundEscrow,
    canApprovePayout,
    canRejectPayout,
    canMarkPayoutPaid,
  };
}
