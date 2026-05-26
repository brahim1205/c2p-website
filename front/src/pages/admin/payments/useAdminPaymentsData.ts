import { useQuery } from '@tanstack/react-query';
import {
  fetchAdminFinanceOverview,
  fetchDexPayPaymentIntents,
  fetchDexPayProviderTransactions,
  fetchDexPayReconciliationJobs,
  fetchDexPayWebhookReceipts,
  fetchOutboxDeadLetter,
  fetchOutboxDeliveries,
  fetchOutboxMetrics,
  fetchWebhookDispatchHistory,
  type AdminPaymentTransaction,
  type DexPayPaymentIntent,
  type DexPayProviderTransaction,
  type DexPayReconciliationJob,
  type DexPayWebhookReceipt,
  type NotificationDeliveryRow,
  type OutboxDeadLetterEvent,
  type OutboxMetrics,
  type WebhookDispatchHistoryRow,
} from '@/lib/adminApi';
import { fetchUsers } from '@/lib/accountApi';
import { fetchDexPayStatus, type DexPayStatus } from '@/lib/paymentsApi';
import { queryKeys } from '@/lib/queryKeys';
import type {
  CommissionEntry,
  EscrowCase,
  PayoutRequest,
  UserSubscription,
} from '@/lib/saasApi';

export type TransactionRow = AdminPaymentTransaction & { user: string; email: string; fee: number; net: number };
export type EscrowRow = EscrowCase & { client: string; provider: string };
export type PayoutRow = PayoutRequest & { user: string; email: string };
export type SubscriptionRow = UserSubscription & { user: string; email: string };
export type ProviderTransactionRow = DexPayProviderTransaction & { linkedUser: string };
export type PaymentIntentRow = DexPayPaymentIntent & { linkedUser: string };

export interface AdminPaymentsSnapshot {
  transactions: TransactionRow[];
  escrowRows: EscrowRow[];
  payoutRows: PayoutRow[];
  subscriptionRows: SubscriptionRow[];
  commissionRows: CommissionEntry[];
  outboxMetrics: OutboxMetrics | null;
  deadLetterRows: OutboxDeadLetterEvent[];
  deliveryRows: NotificationDeliveryRow[];
  webhookDispatchRows: WebhookDispatchHistoryRow[];
  providerWebhookReceipts: DexPayWebhookReceipt[];
  reconciliationJobs: DexPayReconciliationJob[];
  providerTransactions: ProviderTransactionRow[];
  paymentIntents: PaymentIntentRow[];
  dexPayStatus: DexPayStatus | null;
}

export function useAdminPaymentsData(isSuperAdmin: boolean) {
  const paymentsKey = queryKeys.admin.payments(isSuperAdmin ? 'superadmin' : 'admin');

  const paymentsQuery = useQuery({
    queryKey: paymentsKey,
    queryFn: async (): Promise<AdminPaymentsSnapshot> => {
      const [overview, users, sensitive] = await Promise.all([
        fetchAdminFinanceOverview(),
        fetchUsers(),
        isSuperAdmin
          ? Promise.all([
              fetchOutboxMetrics(),
              fetchOutboxDeadLetter(10),
              fetchOutboxDeliveries(12),
              fetchWebhookDispatchHistory(10),
              fetchDexPayWebhookReceipts(10),
              fetchDexPayReconciliationJobs(8),
              fetchDexPayProviderTransactions(10),
              fetchDexPayPaymentIntents(10),
              fetchDexPayStatus().catch(() => null),
            ]).then(([
              metrics,
              deadLetters,
              deliveries,
              webhookHistory,
              receipts,
              jobs,
              providerTxs,
              intents,
              dexPayRuntime,
            ]) => ({ metrics, deadLetters, deliveries, webhookHistory, receipts, jobs, providerTxs, intents, dexPayRuntime }))
          : Promise.resolve({
              metrics: null as OutboxMetrics | null,
              deadLetters: [] as OutboxDeadLetterEvent[],
              deliveries: [] as NotificationDeliveryRow[],
              webhookHistory: [] as WebhookDispatchHistoryRow[],
              receipts: [] as DexPayWebhookReceipt[],
              jobs: [] as DexPayReconciliationJob[],
              providerTxs: [] as DexPayProviderTransaction[],
              intents: [] as DexPayPaymentIntent[],
              dexPayRuntime: null as DexPayStatus | null,
          }),
      ]);

      const usersById = new Map(users.map((item) => [item.id, item]));
      const {
        metrics,
        deadLetters,
        deliveries,
        webhookHistory,
        receipts,
        jobs,
        providerTxs,
        intents,
        dexPayRuntime,
      } = sensitive;

      return {
        transactions: overview.transactions.map((item) => {
          const linkedUser = usersById.get(item.user_id);
          const fee = Math.round(Number(item.amount || 0) * 0.03);
          return {
            ...item,
            user: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.user_id,
            email: linkedUser?.email || '-',
            fee,
            net: Math.max(0, Number(item.amount || 0) - fee),
          };
        }),
        escrowRows: (overview.escrowCases || []).map((item) => ({
          ...item,
          client: item.client_name || usersById.get(item.client_id)?.firstName || item.client_id,
          provider: item.provider_name || (item.provider_user_id ? `${usersById.get(item.provider_user_id)?.firstName || ''} ${usersById.get(item.provider_user_id)?.lastName || ''}`.trim() : 'Non assigne'),
        })),
        payoutRows: (overview.payoutRequests || []).map((item) => {
          const linkedUser = usersById.get(item.user_id);
          return {
            ...item,
            user: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.user_id,
            email: linkedUser?.email || '-',
          };
        }),
        subscriptionRows: (overview.subscriptions || []).map((item) => {
          const linkedUser = usersById.get(item.user_id);
          return {
            ...item,
            user: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.user_id,
            email: linkedUser?.email || '-',
          };
        }),
        commissionRows: overview.commissionEntries || [],
        outboxMetrics: metrics,
        deadLetterRows: deadLetters,
        deliveryRows: deliveries,
        webhookDispatchRows: webhookHistory,
        providerWebhookReceipts: receipts,
        reconciliationJobs: jobs,
        providerTransactions: providerTxs.map((item) => {
          const metadataUserId = typeof item.metadata?.user_id === 'string' ? item.metadata.user_id : undefined;
          const linkedUser = metadataUserId ? usersById.get(metadataUserId) : undefined;
          return {
            ...item,
            linkedUser: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.paymentIntentId || '-',
          };
        }),
        paymentIntents: intents.map((item) => {
          const linkedUser = item.userId ? usersById.get(item.userId) : undefined;
          return {
            ...item,
            linkedUser: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.userId || '-',
          };
        }),
        dexPayStatus: dexPayRuntime,
      };
    },
  });

  return { paymentsKey, paymentsQuery };
}
