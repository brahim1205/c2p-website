import { apiRequest } from './api';
import { fetchUsers, revokeOtherAccountSessions, updateManagedUser } from './accountApi';
import type { EscrowCase, UserSubscription } from './saasApi';
import {
  fetchAdminAuditLogs,
  fetchAdminBackups,
  fetchAdminRules,
  fetchAdminSecurityAlerts,
  updateAdminSecurityAlert,
} from './adminResourceApi';
import {
  fetchAdminFinanceOverview,
  fetchAdminTransactions,
  fetchDexPayProviderTransactions,
  fetchDexPayReconciliationJobs,
  fetchDexPayWebhookReceipts,
  fetchOutboxMetrics,
} from './adminFinanceApi';
import {
  notifyClientBookingAssignedByC2P,
  notifyProviderMissionAssignedByC2P,
} from '@/hooks/useCreateNotification';

export * from './admin-api/analytics';
export * from './adminResourceApi';
export * from './adminFinanceApi';

export interface AdminDashboardManagedUser {
  status: 'active' | 'pending' | 'suspended';
  role: string;
}

export interface AdminDashboardCourse {
  id?: string | number;
  price: number;
  revenue?: number;
  status: string;
}

export interface AdminDashboardService {
  id: string | number;
  status?: string;
  provider_id?: string | number | null;
  title?: string | null;
}

export interface AdminDashboardContentItem {
  id: string | number;
  source_table?: string | null;
  source_id?: string | number | null;
  title?: string | null;
  type?: string | null;
  status: string;
}

export interface AdminDashboardCertificate {
  id: string | number;
  status?: string;
  issued_at?: string | null;
  certificate_number?: string | null;
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
  services: AdminDashboardService[];
  contentItems: AdminDashboardContentItem[];
  certificates: AdminDashboardCertificate[];
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

interface AdminProjectDashboardSummary {
  projects: AdminDashboardProject[];
  history: AdminDashboardHistoryItem[];
}

interface AdminDashboardData {
  courses: AdminDashboardCourse[];
  bookings: AdminDashboardBooking[];
  providers: AdminDashboardProviderOption[];
  services: AdminDashboardService[];
  contentItems: AdminDashboardContentItem[];
  certificates: AdminDashboardCertificate[];
}

async function fetchAdminProjectDashboardSummary() {
  return apiRequest<AdminProjectDashboardSummary>('/project-center/admin/dashboard-summary');
}

async function fetchAdminDashboardData() {
  return apiRequest<AdminDashboardData>('/admin/dashboard-data');
}

export async function fetchAdminDashboardSnapshot(options: { includeSensitiveSupervision?: boolean } = {}) {
  const includeSensitiveSupervision = options.includeSensitiveSupervision === true;
  const [
    users,
    dashboardData,
    projectDashboard,
    financeOverview,
    providerTransactions,
    webhookReceipts,
    reconciliationJobs,
    outboxMetrics,
  ] = await Promise.all([
    fetchUsers(),
    fetchAdminDashboardData(),
    fetchAdminProjectDashboardSummary(),
    fetchAdminFinanceOverview(),
    includeSensitiveSupervision ? fetchDexPayProviderTransactions(30) : Promise.resolve([]),
    includeSensitiveSupervision ? fetchDexPayWebhookReceipts(30) : Promise.resolve([]),
    includeSensitiveSupervision ? fetchDexPayReconciliationJobs(20) : Promise.resolve([]),
    includeSensitiveSupervision ? fetchOutboxMetrics() : Promise.resolve(null),
  ]);

  return {
    users: users as AdminDashboardManagedUser[],
    courses: dashboardData.courses || [],
    bookings: dashboardData.bookings || [],
    providers: dashboardData.providers || [],
    services: dashboardData.services || [],
    contentItems: dashboardData.contentItems || [],
    certificates: dashboardData.certificates || [],
    projects: projectDashboard.projects || [],
    history: projectDashboard.history || [],
    escrows: financeOverview.escrowCases || [],
    subscriptions: financeOverview.subscriptions || [],
    commissionTotal: (financeOverview.commissionEntries || []).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    providerHealth: {
      pending: providerTransactions.filter((item) => ['initiated', 'pending_provider', 'processing'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
      failed: providerTransactions.filter((item) => ['failed', 'error', 'cancelled', 'canceled'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
      receiptsKo: webhookReceipts.filter((item) => ['failed', 'rejected'].includes(String(item.status).toLowerCase())).length,
      jobsRunning: reconciliationJobs.filter((item) => String(item.status).toLowerCase() === 'running').length,
      outboxDead: outboxMetrics?.counts.dead ?? 0,
      outboxFailed: outboxMetrics?.counts.failed ?? 0,
    },
  } satisfies AdminDashboardSnapshot;
}

export async function assignAdminBookingProvider(params: {
  booking: AdminDashboardBooking;
  provider: AdminDashboardProviderOption;
  adminUserId: string;
}) {
  const updated = await apiRequest<AdminDashboardBooking>(`/admin/bookings/${encodeURIComponent(String(params.booking.id))}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({
      provider_id: params.provider.id,
      admin_user_id: params.adminUserId,
    }),
  });

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

  return updated;
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
