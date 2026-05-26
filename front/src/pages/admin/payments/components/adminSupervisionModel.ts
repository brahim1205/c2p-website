import type { ReactNode } from 'react';
import type {
  DexPayPaymentIntent,
  DexPayReconciliationJob,
  DexPayWebhookReceipt,
  NotificationDeliveryRow,
  OutboxDeadLetterEvent,
  OutboxMetrics,
  WebhookDispatchHistoryRow,
} from '@/lib/adminApi';
import type { DexPayStatus } from '@/lib/paymentsApi';

export interface ProviderTransactionSignalRow {
  id: string | number;
  providerReference: string;
  linkedUser: string;
  direction?: string | null;
  lifecycleStatus?: string | null;
  providerStatus?: string | null;
  amount?: number | string | null;
  currency?: string | null;
}

export type PaymentIntentSignalRow = DexPayPaymentIntent & { linkedUser: string };

export interface ProviderCapabilitySummary {
  summary: string;
  actions: {
    force_sync_provider?: boolean;
  };
}

export interface ProviderHealth {
  pendingTransactions: number;
  failedTransactions: number;
  failedReceipts: number;
  activeJobs: number;
}

export interface RuntimeBadge {
  label: string;
  tone: string;
}

export interface AdminSupervisionPanelsProps<TProviderTransaction extends ProviderTransactionSignalRow> {
  outboxMetrics: OutboxMetrics | null;
  deadLetterRows: OutboxDeadLetterEvent[];
  deliveryRows: NotificationDeliveryRow[];
  webhookDispatchRows: WebhookDispatchHistoryRow[];
  providerWebhookReceipts: DexPayWebhookReceipt[];
  reconciliationJobs: DexPayReconciliationJob[];
  providerTransactions: TProviderTransaction[];
  paymentIntents: PaymentIntentSignalRow[];
  dexPayStatus: DexPayStatus | null;
  providerHealth: ProviderHealth;
  providerRuntimeBadge: RuntimeBadge;
  processingOutbox: boolean;
  reconcilingProvider: boolean;
  operatorBusyKey: string | null;
  getProviderTransactionCapabilities: (transaction: TProviderTransaction) => ProviderCapabilitySummary;
  renderProviderStatusBadge: (status?: string | null) => ReactNode;
  onProcessOutbox: () => void;
  onReconcileProvider: () => void;
  onRequeueOutboxEvent: (eventId: string) => void;
  onIgnoreOutboxEvent: (eventId: string) => void;
  onReplayOutboxEvent: (eventId: string) => void;
  onReprocessWebhookReceipt: (receiptId: string) => void;
  onForceSyncProviderTransaction: (providerReference: string) => void;
}
