import { backendClient } from './backendClient';
import { apiRequest } from './api';
import { fetchUsers, revokeOtherAccountSessions, updateManagedUser, type AuditLogEntry } from './accountApi';
import { fetchFinanceCapabilities, type CommissionEntry, type EscrowCase, type FinanceCapabilitySnapshot, type PayoutRequest, type UserSubscription } from './saasApi';
import {
  notifyClientBookingAssignedByC2P,
  notifyProviderMissionAssignedByC2P,
} from '@/hooks/useCreateNotification';

type QueryResult<T> = { data: T | null; error: { message: string } | null };

async function expectData<T>(promise: PromiseLike<QueryResult<T>>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data as T;
}

export interface AdminAccreditation {
  id: number;
  provider_id?: number | null;
  user_id?: string | null;
  name: string;
  profession: string;
  experience: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  documents: string[];
  avatar: string;
  notes?: string;
  reject_reason?: string;
}

export interface AdminContentItem {
  id: number | string;
  source_table: string;
  source_id: number | string;
  title: string;
  type: string;
  author: string;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  date: string;
  views: number;
  category: string;
  description?: string;
}

export interface AdminCampaign {
  id: number;
  title: string;
  type: 'email' | 'sms' | 'push' | 'all';
  target: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  sentCount: number;
  openRate?: number | null;
  scheduledDate?: string | null;
  createdAt: string;
  content: string;
}

export interface AdminReport {
  id: number;
  reporter: string;
  reported: string;
  type: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  date: string;
  priority: 'high' | 'medium' | 'low';
  adminAction?: string | null;
}

export interface AdminSecurityAlert {
  id: number;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  ip?: string | null;
  user?: string | null;
  location?: string | null;
  timestamp: string;
  status: 'active' | 'reviewed' | 'pending';
}

export interface AdminBackup {
  id: number;
  type: string;
  date: string;
  size: string;
  status: string;
  location: string;
  retention_days?: number;
  provider?: string;
  automatic?: boolean;
}

export interface AdminCategory {
  id: number;
  name: string;
  type: 'service' | 'formation' | 'projet';
  count: number;
  active: boolean;
}

export interface AdminRule {
  id: string;
  label: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'percent' | 'toggle';
  description: string;
}

export interface AdminIntegration {
  id: number;
  name: string;
  icon: string;
  description: string;
  status: 'connected' | 'disconnected';
  lastSync?: string | null;
}

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

export interface AdminAnalyticsSnapshot {
  stats: { label: string; value: string; change: string; icon: string; color: string }[];
  moduleStats: { name: string; users: number; revenue: string; growth: string; color: string }[];
  topPrestataires: { name: string; profession: string; rating: number; services: number; revenue: string; avatar: string }[];
}

export interface AdminDashboardManagedUser {
  status: 'active' | 'pending' | 'suspended';
  role: string;
}

export interface AdminDashboardCourse {
  price: number;
  revenue?: number;
  status: string;
}

export interface AdminDashboardProviderOption {
  id: number;
  user_id?: string | null;
  name: string;
  category?: string | null;
  verified?: boolean | null;
}

export interface AdminDashboardMatchingCandidate {
  id: number;
  user_id?: string | null;
  name: string;
  score: number;
  reasons?: string[];
}

export interface AdminDashboardBooking {
  status: string;
  price: number | null;
  created_at?: string;
  updated_at?: string;
  id: number;
  client_id?: string | null;
  client_name?: string | null;
  provider_id?: number | null;
  requested_provider_id?: number | null;
  requested_provider_name?: string | null;
  service?: string | null;
  booking_date?: string | null;
  request_type?: string | null;
  assignment_status?: string | null;
  provider?: AdminDashboardProviderOption | null;
  requested_provider?: AdminDashboardProviderOption | null;
  platform_fee_amount?: number | null;
  provider_payout_amount?: number | null;
  matching_candidates?: AdminDashboardMatchingCandidate[];
}

export interface AdminDashboardProject {
  funding: number;
  status: string;
}

export interface AdminDashboardHistoryItem {
  id: number;
  project_title?: string | null;
  action: string;
  user: string;
  date: string;
}

export interface AdminDashboardSnapshot {
  users: AdminDashboardManagedUser[];
  courses: AdminDashboardCourse[];
  bookings: AdminDashboardBooking[];
  providers: AdminDashboardProviderOption[];
  projects: AdminDashboardProject[];
  history: AdminDashboardHistoryItem[];
  escrows: EscrowCase[];
  subscriptions: UserSubscription[];
  commissionTotal: number;
  providerHealth: {
    pending: number;
    failed: number;
    receiptsKo: number;
    jobsRunning: number;
    outboxDead: number;
    outboxFailed: number;
  };
}

export async function fetchAdminAccreditations() {
  return expectData<AdminAccreditation[]>(backendClient.from('admin_accreditations').select('*').order('date', { ascending: false }));
}

export async function updateAdminAccreditation(id: number, patch: Partial<AdminAccreditation>) {
  const row = await expectData<AdminAccreditation[]>(backendClient.from('admin_accreditations').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function fetchAdminContentItems() {
  return expectData<AdminContentItem[]>(backendClient.from('admin_content_items').select('*').order('date', { ascending: false }));
}

export async function updateAdminContentItem(id: number | string, patch: Partial<AdminContentItem>) {
  const row = await expectData<AdminContentItem[]>(backendClient.from('admin_content_items').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function deleteAdminContentItem(id: number | string) {
  return expectData<AdminContentItem[]>(backendClient.from('admin_content_items').delete().eq('id', id).select('*'));
}

export async function fetchAdminCampaigns() {
  return expectData<AdminCampaign[]>(backendClient.from('admin_campaigns').select('*').order('createdAt', { ascending: false }));
}

export async function createAdminCampaign(payload: Omit<AdminCampaign, 'id'>) {
  return expectData<AdminCampaign>(backendClient.from('admin_campaigns').insert(payload).select('*').single());
}

export async function updateAdminCampaign(id: number, patch: Partial<AdminCampaign>) {
  const row = await expectData<AdminCampaign[]>(backendClient.from('admin_campaigns').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function deleteAdminCampaign(id: number) {
  return expectData<AdminCampaign[]>(backendClient.from('admin_campaigns').delete().eq('id', id).select('*'));
}

export async function fetchAdminReports() {
  return expectData<AdminReport[]>(backendClient.from('admin_reports').select('*').order('date', { ascending: false }));
}

export async function updateAdminReport(id: number, patch: Partial<AdminReport>) {
  const row = await expectData<AdminReport[]>(backendClient.from('admin_reports').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function fetchAdminCategories() {
  return expectData<AdminCategory[]>(backendClient.from('admin_platform_categories').select('*').order('id', { ascending: true }));
}

export async function createAdminCategory(payload: Omit<AdminCategory, 'id' | 'count'> & { count?: number }) {
  return expectData<AdminCategory>(backendClient.from('admin_platform_categories').insert({ count: 0, ...payload }).select('*').single());
}

export async function updateAdminCategory(id: number, patch: Partial<AdminCategory>) {
  const row = await expectData<AdminCategory[]>(backendClient.from('admin_platform_categories').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function deleteAdminCategory(id: number) {
  return expectData<AdminCategory[]>(backendClient.from('admin_platform_categories').delete().eq('id', id).select('*'));
}

export async function fetchAdminRules() {
  return expectData<AdminRule[]>(backendClient.from('admin_platform_rules').select('*').order('id', { ascending: true }));
}

export async function updateAdminRule(id: string, patch: Partial<AdminRule>) {
  const row = await expectData<AdminRule[]>(backendClient.from('admin_platform_rules').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function fetchAdminIntegrations() {
  return expectData<AdminIntegration[]>(backendClient.from('admin_integrations').select('*').order('id', { ascending: true }));
}

export async function updateAdminIntegration(id: number, patch: Partial<AdminIntegration>) {
  const row = await expectData<AdminIntegration[]>(backendClient.from('admin_integrations').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function fetchAdminBackups() {
  return expectData<AdminBackup[]>(backendClient.from('admin_backups').select('*').order('date', { ascending: false }));
}

export async function createAdminBackup(payload: Omit<AdminBackup, 'id'>) {
  return expectData<AdminBackup>(backendClient.from('admin_backups').insert(payload).select('*').single());
}

export async function fetchAdminSecurityAlerts() {
  return expectData<AdminSecurityAlert[]>(backendClient.from('admin_security_alerts').select('*').order('timestamp', { ascending: false }));
}

export async function updateAdminSecurityAlert(id: number, patch: Partial<AdminSecurityAlert>) {
  const row = await expectData<AdminSecurityAlert[]>(backendClient.from('admin_security_alerts').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function fetchAdminAuditLogs() {
  return expectData<AuditLogEntry[]>(backendClient.from('admin_audit_logs').select('*').order('timestamp', { ascending: false }));
}

export async function createAdminAuditLog(payload: Omit<AuditLogEntry, 'id'> & { admin?: string; target?: string }) {
  return expectData<AuditLogEntry>(backendClient.from('admin_audit_logs').insert(payload).select('*').single());
}

export async function fetchAdminTransactions() {
  return apiRequest<AdminPaymentTransaction[]>('/payments/admin/transactions');
}

export async function fetchAdminFinanceOverview() {
  return apiRequest<AdminFinanceOverview>('/payments/admin/overview');
}

export async function fetchAdminDashboardSnapshot() {
  const [
    users,
    coursesRes,
    bookingsRes,
    providersRes,
    projectsRes,
    historyRes,
    financeOverview,
    providerTransactions,
    webhookReceipts,
    reconciliationJobs,
    outboxMetrics,
  ] = await Promise.all([
    fetchUsers(),
    backendClient.from('courses').select('*').order('updated_at', { ascending: false }),
    backendClient.from('bookings').select('*').order('created_at', { ascending: false }),
    backendClient.from('providers').select('id,name,user_id,category,verified').order('name', { ascending: true }),
    backendClient.from('projects').select('*').order('created_at', { ascending: false }),
    backendClient.from('project_history').select('*').order('date', { ascending: false }).limit(6),
    fetchAdminFinanceOverview(),
    fetchDexPayProviderTransactions(30),
    fetchDexPayWebhookReceipts(30),
    fetchDexPayReconciliationJobs(20),
    fetchOutboxMetrics(),
  ]);

  if (coursesRes.error) throw new Error(coursesRes.error.message);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (providersRes.error) throw new Error(providersRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  return {
    users: users as AdminDashboardManagedUser[],
    courses: (coursesRes.data as AdminDashboardCourse[]) || [],
    bookings: (bookingsRes.data as AdminDashboardBooking[]) || [],
    providers: (providersRes.data as AdminDashboardProviderOption[]) || [],
    projects: (projectsRes.data as AdminDashboardProject[]) || [],
    history: (historyRes.data as AdminDashboardHistoryItem[]) || [],
    escrows: financeOverview.escrowCases || [],
    subscriptions: financeOverview.subscriptions || [],
    commissionTotal: (financeOverview.commissionEntries || []).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    providerHealth: {
      pending: providerTransactions.filter((item) => ['initiated', 'pending_provider', 'processing'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
      failed: providerTransactions.filter((item) => ['failed', 'error', 'cancelled', 'canceled'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
      receiptsKo: webhookReceipts.filter((item) => ['failed', 'rejected'].includes(String(item.status).toLowerCase())).length,
      jobsRunning: reconciliationJobs.filter((item) => String(item.status).toLowerCase() === 'running').length,
      outboxDead: outboxMetrics.counts.dead,
      outboxFailed: outboxMetrics.counts.failed,
    },
  } satisfies AdminDashboardSnapshot;
}

export async function assignAdminBookingProvider(params: {
  booking: AdminDashboardBooking;
  provider: AdminDashboardProviderOption;
  adminUserId: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await backendClient
    .from<AdminDashboardBooking>('bookings')
    .update({
      provider_id: params.provider.id,
      requested_provider_id: params.booking.requested_provider_id ?? params.provider.id,
      requested_provider_name: params.booking.requested_provider_name ?? null,
      status: 'confirmed',
      assignment_status: 'assigned',
      assigned_by_c2p: params.adminUserId,
      assigned_at: now,
      updated_at: now,
    })
    .eq('id', params.booking.id)
    .single();

  if (error) throw new Error(error.message);

  await Promise.all([
    params.booking.client_id
      ? notifyClientBookingAssignedByC2P(
          params.booking.client_id,
          params.booking.service || 'Mission',
          params.provider.name,
        )
      : Promise.resolve(false),
    params.provider.user_id
      ? notifyProviderMissionAssignedByC2P(
          params.provider.user_id,
          params.booking.service || 'Mission',
        )
      : Promise.resolve(false),
  ]);

  return (data as AdminDashboardBooking | null) || {
    ...params.booking,
    provider_id: params.provider.id,
    provider: params.provider,
    status: 'confirmed',
    assignment_status: 'assigned',
    updated_at: now,
  };
}

export async function updateAdminEscrowStatus(id: string, status: 'released' | 'refunded') {
  return apiRequest<{ escrow: unknown }>(`/payments/admin/escrows/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function updateAdminPayoutStatus(id: string, status: 'approved' | 'paid' | 'rejected') {
  return apiRequest<{ request: unknown }>(`/payments/admin/payouts/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function updateAdminTransactionStatusCommand(id: string, status: 'completed' | 'pending' | 'failed') {
  return apiRequest<{ transaction: AdminPaymentTransaction }>(`/payments/admin/transactions/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function refundAdminTransaction(id: string) {
  return apiRequest<{ transaction: AdminPaymentTransaction }>(`/payments/admin/transactions/${encodeURIComponent(id)}/refund`, {
    method: 'POST',
  });
}

export async function fetchOutboxMetrics() {
  return apiRequest<OutboxMetrics>('/outbox/metrics');
}

export async function fetchOutboxDeadLetter(limit = 25) {
  return apiRequest<OutboxDeadLetterEvent[]>(`/outbox/dead-letter?limit=${encodeURIComponent(String(limit))}`);
}

export async function fetchOutboxDeliveries(limit = 50, channel?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (channel) query.set('channel', channel);
  return apiRequest<NotificationDeliveryRow[]>(`/outbox/deliveries?${query.toString()}`);
}

export async function fetchWebhookDispatchHistory(limit = 50, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set('status', status);
  return apiRequest<WebhookDispatchHistoryRow[]>(`/outbox/webhooks/history?${query.toString()}`);
}

export async function processOutboxNow(limit = 25) {
  return apiRequest<{ claimed: number; processed: number; failed: number; dead: number }>(`/outbox/process?limit=${encodeURIComponent(String(limit))}`, {
    method: 'POST',
  });
}

export async function requeueOutboxEvent(eventId: string, reason?: string) {
  return apiRequest<{ eventId: string; status: string }>(`/outbox/events/${encodeURIComponent(eventId)}/requeue`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function ignoreOutboxEvent(eventId: string, reason?: string) {
  return apiRequest<{ eventId: string; status: string }>(`/outbox/events/${encodeURIComponent(eventId)}/ignore`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function replayOutboxEvent(eventId: string, reason?: string) {
  return apiRequest<{ replayEventId: string; eventType: string }>(`/outbox/events/${encodeURIComponent(eventId)}/replay`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function reconcileDexPay(limit = 25, options?: { onlyPending?: boolean; providerReference?: string }) {
  return apiRequest<{ jobId: string; summary: Record<string, unknown> }>(`/payments/admin/providers/dexpay/reconcile`, {
    method: 'POST',
    body: JSON.stringify({
      limit,
      onlyPending: options?.onlyPending ?? true,
      providerReference: options?.providerReference,
    }),
  });
}

export async function fetchDexPayReconciliationJobs(limit = 50) {
  return apiRequest<DexPayReconciliationJob[]>(`/payments/admin/providers/dexpay/reconciliation-jobs?limit=${encodeURIComponent(String(limit))}`);
}

export async function fetchDexPayWebhookReceipts(limit = 50, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set('status', status);
  return apiRequest<DexPayWebhookReceipt[]>(`/payments/admin/providers/dexpay/webhook-receipts?${query.toString()}`);
}

export async function fetchDexPayProviderTransactions(limit = 50, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set('status', status);
  return apiRequest<DexPayProviderTransaction[]>(`/payments/admin/providers/dexpay/transactions?${query.toString()}`);
}

export async function fetchDexPayProviderTransactionCapabilities(providerReference: string) {
  return fetchFinanceCapabilities('provider_transaction', providerReference);
}

export async function fetchDexPayPaymentIntents(limit = 50, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set('status', status);
  return apiRequest<DexPayPaymentIntent[]>(`/payments/admin/providers/dexpay/intents?${query.toString()}`);
}

export async function fetchDexPayPaymentIntentCapabilities(intentId: string) {
  return fetchFinanceCapabilities('payment_intent', intentId);
}

export async function reprocessDexPayWebhookReceipt(receiptId: string, reason?: string) {
  return apiRequest<{ receiptId: string; providerReference: string; matched: boolean; status: string }>(
    `/payments/admin/providers/dexpay/webhook-receipts/${encodeURIComponent(receiptId)}/reprocess`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

export async function forceSyncDexPayProviderTransaction(providerReference: string, reason?: string) {
  return apiRequest<{ providerReference: string; matched: boolean; status: string; transactionId?: string | null }>(
    `/payments/admin/providers/dexpay/transactions/${encodeURIComponent(providerReference)}/force-sync`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

export async function fetchAdminAnalytics() {
  const [users, transactions, bookings, enrollments, providers] = await Promise.all([
    fetchUsers(),
    fetchAdminTransactions(),
    expectData<any[]>(backendClient.from('bookings').select('*')),
    expectData<any[]>(backendClient.from('course_enrollments').select('*')),
    expectData<any[]>(backendClient.from('providers').select('*')),
  ]);

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const totalRevenue = transactions
    .filter((transaction) => transaction.status === 'completed')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const successfulTransactions = transactions.filter((transaction) => transaction.status === 'completed').length;
  const avgRating = providers.length
    ? providers.reduce((sum, provider) => sum + Number(provider.rating || 0), 0) / providers.length
    : 0;

  const moduleStats = [
    {
      name: 'AlloPresta',
      users: bookings.length,
      revenue: `${bookings.reduce((sum, booking) => sum + Number(booking.price || 0), 0).toLocaleString('fr-FR')} FCFA`,
      growth: `+${Math.max(8, Math.round(bookings.length / 4))}%`,
      color: 'bg-[#5fa6f3]',
    },
    {
      name: 'Espace Numerique',
      users: enrollments.length,
      revenue: `${transactions.filter((item) => item.description.toLowerCase().includes('formation')).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('fr-FR')} FCFA`,
      growth: `+${Math.max(10, Math.round(enrollments.length / 3))}%`,
      color: 'bg-teal-600',
    },
    {
      name: 'ProjectCenter',
      users: users.filter((user) => user.role === 'porteur' || user.role === 'partenaire').length,
      revenue: `${transactions.filter((item) => item.description.toLowerCase().includes('agrolink') || item.description.toLowerCase().includes('dossier')).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('fr-FR')} FCFA`,
      growth: '+18%',
      color: 'bg-green-500',
    },
  ];

  const topPrestataires = providers
    .map((provider) => ({
      name: String(provider.name || ''),
      profession: String(provider.title || provider.category || ''),
      rating: Number(provider.rating || 0),
      services: Number(provider.completed_jobs || 0),
      revenue: `${Math.round(Number(provider.completed_jobs || 0) * Number(provider.price_per_hour || 0) * 0.35).toLocaleString('fr-FR')} FCFA`,
      avatar: String(provider.image || ''),
    }))
    .sort((left, right) => right.rating - left.rating)
    .slice(0, 5);

  return {
    stats: [
      { label: 'Utilisateurs actifs', value: activeUsers.toLocaleString('fr-FR'), change: `+${Math.max(6, Math.round(activeUsers / 80))}%`, icon: 'ri-user-line', color: 'bg-teal-500' },
      { label: 'Revenus totaux', value: `${(totalRevenue / 1000000).toFixed(1)}M FCFA`, change: '+8%', icon: 'ri-money-dollar-circle-line', color: 'bg-green-500' },
      { label: 'Transactions', value: successfulTransactions.toLocaleString('fr-FR'), change: `+${Math.max(12, Math.round(successfulTransactions / 20))}%`, icon: 'ri-exchange-line', color: 'bg-[#5fa6f3]' },
      { label: 'Taux de satisfaction', value: `${avgRating.toFixed(1)}/5`, change: '+0.2', icon: 'ri-star-line', color: 'bg-yellow-500' },
    ],
    moduleStats,
    topPrestataires,
  } satisfies AdminAnalyticsSnapshot;
}

export async function fetchAdminSecurityOverview() {
  const [users, alerts, backups, logs, rules] = await Promise.all([
    fetchUsers(),
    fetchAdminSecurityAlerts(),
    fetchAdminBackups(),
    fetchAdminAuditLogs(),
    fetchAdminRules(),
  ]);

  return {
    securityStats: {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status === 'active').length,
      suspendedAccounts: users.filter((user) => user.status === 'suspended').length,
      failedLogins: alerts.filter((alert) => alert.type === 'critical').length * 15,
      passwordResetProtected: users.filter((user) => Boolean(user.phone)).length,
      securityAlerts: alerts.filter((alert) => alert.status === 'active').length,
    },
    securityAlerts: alerts,
    auditLogs: logs,
    backups,
    rules,
    users,
  };
}

export async function markAlertReviewed(id: number) {
  return updateAdminSecurityAlert(id, { status: 'reviewed' });
}

export async function forceSuspendUser(userId: string) {
  const updated = await updateManagedUser(userId, { status: 'suspended' });
  await revokeOtherAccountSessions(userId);
  return updated;
}
