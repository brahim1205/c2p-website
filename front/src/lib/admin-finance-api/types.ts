import type { CommissionEntry, EscrowCase, PayoutRequest, UserSubscription } from '../saasApi';

export interface AdminPaymentTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  date: string;
  reference?: string;
  financial_operation_id?: string | null;
  target_type?: 'formation' | 'abonnement' | 'prestation' | string | null;
  target_id?: string | null;
  return_to?: string | null;
  operation_kind?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdminFinanceOverview {
  transactions: AdminPaymentTransaction[];
  escrowCases: EscrowCase[];
  payoutRequests: PayoutRequest[];
  subscriptions: UserSubscription[];
  commissionEntries: CommissionEntry[];
  invoices?: Array<Record<string, unknown>>;
}

export interface OutboxMetrics {
  counts: {
    pending: number;
    processing: number;
    failed: number;
    dead: number;
    processed: number;
  };
  dueNow: number;
  oldestDueLagMs: number;
  oldestDueLagSeconds: number;
  maxAttemptCount: number;
  averageAttemptCount: number;
  supportedHandlers: string[];
  generatedAt: string;
}

export interface OutboxDeadLetterEvent {
  id: string;
  eventType: string;
  eventVersion: number;
  aggregateType?: string | null;
  aggregateId?: string | null;
  actorId?: string | null;
  correlationId?: string | null;
  financialOperationId?: string | null;
  idempotencyKey?: string | null;
  occurredAt: string;
  attemptCount: number;
  maxRetries: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryRow {
  id: string;
  deliveryKey: string;
  outboxEventId?: string | null;
  eventType: string;
  channel: string;
  recipientUserId?: string | null;
  recipientAddress?: string | null;
  provider?: string | null;
  providerMessageId?: string | null;
  status: string;
  attemptedAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDispatchHistoryRow {
  id: string;
  dispatchKey: string;
  outboxEventId?: string | null;
  eventType: string;
  targetUrl: string;
  method: string;
  status: string;
  responseStatus?: number | null;
  responseBody?: string | null;
  error?: string | null;
  attemptCount: number;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  correlationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DexPayWebhookReceipt {
  id: string;
  provider: string;
  providerEventId?: string | null;
  eventType?: string | null;
  status: string;
  idempotencyKey?: string | null;
  correlationId?: string | null;
  receivedAt: string;
  processedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface DexPayReconciliationJob {
  id: string;
  provider: string;
  scope?: string | null;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  summary?: Record<string, unknown> | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DexPayProviderTransaction {
  id: string;
  paymentIntentId?: string | null;
  provider: string;
  providerReference: string;
  providerStatus: string;
  lifecycleStatus?: string;
  direction?: string | null;
  amount?: number | null;
  currency?: string | null;
  confirmedAt?: string | null;
  failedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DexPayPaymentIntent {
  id: string;
  actorId?: string | null;
  userId?: string | null;
  provider: string;
  providerIntentRef?: string | null;
  contextType?: string | null;
  contextId?: string | null;
  amount: number;
  currency: string;
  status: string;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  financialOperationId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
