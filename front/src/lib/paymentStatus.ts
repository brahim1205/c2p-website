import type { FinanceCapabilitySnapshot } from './saasApi';

export type PaymentLifecycleStatus =
  | 'initiated'
  | 'pending_provider'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'reconciled';

export type PaymentCapabilityRole = 'self_service' | 'admin' | 'support';
export type PaymentCapabilityContext = 'transaction_list' | 'transaction_modal' | 'provider_console' | 'invoice_context';
export type PaymentCapabilityAction =
  | 'sync_provider'
  | 'force_sync_provider'
  | 'retry_transaction'
  | 'refund_transaction'
  | 'open_financial_context'
  | 'open_linked_invoices';

export type FinanceCapabilityAction =
  | PaymentCapabilityAction
  | 'view'
  | 'release_escrow'
  | 'refund_escrow'
  | 'approve_payout'
  | 'reject_payout'
  | 'cancel_payout'
  | 'mark_payout_paid'
  | 'renew_subscription'
  | 'cancel_subscription'
  | 'download_invoice'
  | 'open_linked_transactions'
  | 'mark_invoice_paid'
  | 'mark_invoice_cancelled';

export interface PaymentCapabilityRequest {
  status: PaymentLifecycleStatus;
  role: PaymentCapabilityRole;
  context: PaymentCapabilityContext;
  providerBacked?: boolean;
  transactionType?: string | null;
}

export interface PaymentUiCapabilities {
  readOnly: boolean;
  summary: string;
  actions: Record<PaymentCapabilityAction, boolean>;
}

const ACTION_SUMMARIES: Partial<Record<FinanceCapabilityAction, string>> = {
  sync_provider: 'Synchronisation utilisateur autorisée.',
  force_sync_provider: 'Resynchronisation opérateur autorisée.',
  retry_transaction: 'Relance opérateur autorisée.',
  refund_transaction: 'Remboursement encore autorisé.',
  release_escrow: 'Séquestre libérable.',
  refund_escrow: 'Séquestre remboursable.',
  approve_payout: 'Retrait approuvable.',
  mark_payout_paid: 'Retrait payable.',
  renew_subscription: 'Renouvellement autorisé.',
  cancel_subscription: 'Annulation autorisée.',
  mark_invoice_paid: 'Facture payable.',
  mark_invoice_cancelled: 'Facture annulable.',
  download_invoice: 'Document disponible.',
};

type TransactionLike = {
  type?: string | null;
  status?: string | null;
  provider_status?: string | null;
  settled_to_wallet?: boolean | null;
  lifecycle_status?: PaymentLifecycleStatus | null;
};

const includesAny = (value: string, needles: string[]) => needles.some((needle) => value.includes(needle));
const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

export function resolvePaymentLifecycleStatus(transaction: TransactionLike): PaymentLifecycleStatus {
  if (transaction.lifecycle_status) {
    return transaction.lifecycle_status;
  }

  const type = normalize(transaction.type);
  const status = normalize(transaction.status);
  const providerStatus = normalize(transaction.provider_status);
  const settledToWallet = Boolean(transaction.settled_to_wallet);

  if (type === 'refund' && status === 'completed') return 'refunded';
  if (settledToWallet && status === 'completed') return 'reconciled';
  if (status === 'failed' || status === 'cancelled' || includesAny(providerStatus, ['failed', 'error', 'rejected', 'cancelled', 'canceled', 'expired'])) return 'failed';
  if (status === 'completed' || includesAny(providerStatus, ['completed', 'success', 'confirmed', 'settled'])) return 'confirmed';
  if (includesAny(providerStatus, ['processing', 'in_progress', 'in progress', 'validating', 'confirming'])) return 'processing';
  if (providerStatus || status === 'pending') return 'pending_provider';
  return 'initiated';
}

export function getPaymentLifecycleLabel(status: PaymentLifecycleStatus) {
  const labels: Record<PaymentLifecycleStatus, string> = {
    initiated: 'Initié',
    pending_provider: 'En attente provider',
    processing: 'Traitement provider',
    confirmed: 'Confirmé',
    failed: 'Échoué',
    refunded: 'Remboursé',
    reconciled: 'Réconcilié',
  };
  return labels[status];
}

export function getPaymentLifecycleTone(status: PaymentLifecycleStatus) {
  const tones: Record<PaymentLifecycleStatus, string> = {
    initiated: 'bg-slate-100 text-slate-800',
    pending_provider: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
    reconciled: 'bg-teal-100 text-teal-800',
  };
  return tones[status];
}

function resolveFallbackPaymentUiCapabilities(request: PaymentCapabilityRequest): PaymentUiCapabilities {
  const providerBacked = Boolean(request.providerBacked);
  const normalizedType = normalize(request.transactionType);
  const readOnly = ['processing', 'refunded', 'reconciled'].includes(request.status);

  const actions: Record<PaymentCapabilityAction, boolean> = {
    sync_provider: false,
    force_sync_provider: false,
    retry_transaction: false,
    refund_transaction: false,
    open_financial_context: true,
    open_linked_invoices: true,
  };

  if (request.role === 'self_service') {
    actions.sync_provider = providerBacked && ['initiated', 'pending_provider', 'failed'].includes(request.status);
  }

  if (request.role === 'admin') {
    actions.force_sync_provider = providerBacked && ['initiated', 'pending_provider', 'failed'].includes(request.status);
    actions.retry_transaction = request.status === 'failed';
    actions.refund_transaction = normalizedType !== 'refund' && request.status === 'confirmed';
  }

  if (request.role === 'support') {
    actions.open_financial_context = true;
    actions.open_linked_invoices = true;
  }

  if (request.context === 'invoice_context') {
    actions.sync_provider = false;
    actions.force_sync_provider = false;
    actions.retry_transaction = false;
    actions.refund_transaction = false;
  }

  if (request.context === 'provider_console' && !providerBacked) {
    actions.sync_provider = false;
    actions.force_sync_provider = false;
  }

  if (request.context === 'transaction_list' && request.role === 'self_service') {
    actions.open_linked_invoices = false;
  }

  return {
    readOnly,
    summary: readOnly ? 'Lecture seule.' : 'Mode dégradé: décision UI locale temporaire.',
    actions,
  };
}

export function hasFinanceCapabilityAction(
  snapshot: FinanceCapabilitySnapshot | null | undefined,
  action: FinanceCapabilityAction,
) {
  return Boolean(snapshot?.allowedActions.includes(action));
}

function summarizeFinanceSnapshot(snapshot: FinanceCapabilitySnapshot) {
  const mutableLabel = snapshot.finality === 'terminal' ? 'Lecture seule.' : 'Actions pilotées par le backend.';
  const prioritizedActions: FinanceCapabilityAction[] = [
    'force_sync_provider',
    'sync_provider',
    'retry_transaction',
    'refund_transaction',
    'release_escrow',
    'refund_escrow',
    'approve_payout',
    'mark_payout_paid',
    'renew_subscription',
    'cancel_subscription',
    'mark_invoice_paid',
    'mark_invoice_cancelled',
    'download_invoice',
  ];

  for (const action of prioritizedActions) {
    if (snapshot.allowedActions.includes(action)) {
      return ACTION_SUMMARIES[action] || mutableLabel;
    }
  }

  return mutableLabel;
}

export function resolvePaymentUiCapabilitiesFromSnapshot(
  snapshot: FinanceCapabilitySnapshot | null | undefined,
  fallbackRequest: PaymentCapabilityRequest,
): PaymentUiCapabilities {
  if (!snapshot) {
    return resolveFallbackPaymentUiCapabilities(fallbackRequest);
  }

  return {
    readOnly: snapshot.finality === 'terminal',
    summary: summarizeFinanceSnapshot(snapshot),
    actions: {
      sync_provider: hasFinanceCapabilityAction(snapshot, 'sync_provider'),
      force_sync_provider: hasFinanceCapabilityAction(snapshot, 'force_sync_provider'),
      retry_transaction: hasFinanceCapabilityAction(snapshot, 'retry_transaction'),
      refund_transaction: hasFinanceCapabilityAction(snapshot, 'refund_transaction'),
      open_financial_context: hasFinanceCapabilityAction(snapshot, 'open_financial_context'),
      open_linked_invoices: hasFinanceCapabilityAction(snapshot, 'open_linked_invoices'),
    },
  };
}

export function getPayoutStatusLabel(status: string) {
  const normalized = normalize(status);
  if (normalized === 'paid') return 'Payé';
  if (normalized === 'approved') return 'Approuvé';
  if (normalized === 'rejected') return 'Rejeté';
  if (normalized === 'cancelled') return 'Annulé';
  return 'En traitement';
}

export function getPayoutStatusTone(status: string) {
  const normalized = normalize(status);
  if (normalized === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'approved') return 'bg-blue-100 text-blue-700';
  if (normalized === 'rejected') return 'bg-red-100 text-red-700';
  if (normalized === 'cancelled') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-700';
}

export function getEscrowStatusLabel(status: string) {
  const normalized = normalize(status);
  if (normalized === 'funded') return 'Financé';
  if (normalized === 'assigned') return 'Attribué';
  if (normalized === 'in_progress') return 'En cours';
  if (normalized === 'delivery_review') return 'En validation';
  if (normalized === 'released') return 'Libéré';
  if (normalized === 'refunded') return 'Remboursé';
  return status || 'Inconnu';
}

export function getEscrowStatusTone(status: string) {
  const normalized = normalize(status);
  if (normalized === 'released') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'refunded') return 'bg-purple-100 text-purple-700';
  if (['funded', 'assigned', 'in_progress', 'delivery_review'].includes(normalized)) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}
