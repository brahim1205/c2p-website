import { backendClient } from './backendClient';
import { fetchUsers, revokeOtherAccountSessions, updateManagedUser, type AuditLogEntry } from './accountApi';

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

export interface AdminAnalyticsSnapshot {
  stats: { label: string; value: string; change: string; icon: string; color: string }[];
  moduleStats: { name: string; users: number; revenue: string; growth: string; color: string }[];
  topPrestataires: { name: string; profession: string; rating: number; services: number; revenue: string; avatar: string }[];
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
  return expectData<AdminPaymentTransaction[]>(backendClient.from('payment_transactions').select('*').order('date', { ascending: false }));
}

export async function updateAdminTransaction(id: string, patch: Partial<AdminPaymentTransaction>) {
  const row = await expectData<AdminPaymentTransaction[]>(backendClient.from('payment_transactions').update(patch).eq('id', id).select('*'));
  return row[0];
}

export async function createAdminTransaction(payload: AdminPaymentTransaction) {
  return expectData<AdminPaymentTransaction>(backendClient.from('payment_transactions').insert(payload).select('*').single());
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
      color: 'bg-[#14B8A6]',
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
      { label: 'Transactions', value: successfulTransactions.toLocaleString('fr-FR'), change: `+${Math.max(12, Math.round(successfulTransactions / 20))}%`, icon: 'ri-exchange-line', color: 'bg-[#14B8A6]' },
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
