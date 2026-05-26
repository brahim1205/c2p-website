import { apiRequest } from './api';
import type { AuditLogEntry } from './accountApi';

async function listAdminResource<T>(resource: string) {
  return apiRequest<T[]>(`/admin/resources/${encodeURIComponent(resource)}`);
}

async function createAdminResource<T>(resource: string, payload: unknown) {
  return apiRequest<T>(`/admin/resources/${encodeURIComponent(resource)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateAdminResource<T>(resource: string, id: string | number, payload: unknown) {
  return apiRequest<T>(`/admin/resources/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function deleteAdminResource<T>(resource: string, id: string | number) {
  return apiRequest<T[]>(`/admin/resources/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
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

export interface AdminFeatureFlag {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  scope: 'access' | 'finance' | 'marketplace' | 'provider' | 'system' | string;
  risk: 'low' | 'medium' | 'high' | 'critical' | string;
  updated_at?: string | null;
  updated_by?: string | null;
}

export async function fetchAdminAccreditations() {
  return listAdminResource<AdminAccreditation>('accreditations');
}

export async function updateAdminAccreditation(id: number, patch: Partial<AdminAccreditation>) {
  return updateAdminResource<AdminAccreditation>('accreditations', id, patch);
}

export async function fetchAdminContentItems() {
  return listAdminResource<AdminContentItem>('content');
}

export async function updateAdminContentItem(id: number | string, patch: Partial<AdminContentItem>) {
  return updateAdminResource<AdminContentItem>('content', id, patch);
}

export async function deleteAdminContentItem(id: number | string) {
  return deleteAdminResource<AdminContentItem>('content', id);
}

export async function fetchAdminCampaigns() {
  return listAdminResource<AdminCampaign>('campaigns');
}

export async function createAdminCampaign(payload: Omit<AdminCampaign, 'id'>) {
  return createAdminResource<AdminCampaign>('campaigns', payload);
}

export async function updateAdminCampaign(id: number, patch: Partial<AdminCampaign>) {
  return updateAdminResource<AdminCampaign>('campaigns', id, patch);
}

export async function deleteAdminCampaign(id: number) {
  return deleteAdminResource<AdminCampaign>('campaigns', id);
}

export async function fetchAdminReports() {
  return listAdminResource<AdminReport>('reports');
}

export async function updateAdminReport(id: number, patch: Partial<AdminReport>) {
  return updateAdminResource<AdminReport>('reports', id, patch);
}

export async function fetchAdminCategories() {
  return listAdminResource<AdminCategory>('categories');
}

export async function createAdminCategory(payload: Omit<AdminCategory, 'id' | 'count'> & { count?: number }) {
  return createAdminResource<AdminCategory>('categories', { count: 0, ...payload });
}

export async function updateAdminCategory(id: number, patch: Partial<AdminCategory>) {
  return updateAdminResource<AdminCategory>('categories', id, patch);
}

export async function deleteAdminCategory(id: number) {
  return deleteAdminResource<AdminCategory>('categories', id);
}

export async function fetchAdminRules() {
  return listAdminResource<AdminRule>('rules');
}

export async function updateAdminRule(id: string, patch: Partial<AdminRule>) {
  return updateAdminResource<AdminRule>('rules', id, patch);
}

export async function fetchAdminFeatureFlags() {
  return listAdminResource<AdminFeatureFlag>('featureFlags');
}

export async function updateAdminFeatureFlag(id: string, patch: Partial<AdminFeatureFlag>) {
  const row = await updateAdminResource<AdminFeatureFlag>('featureFlags', id, patch);
  if (id === 'maintenance_mode' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('c2p:maintenance-updated', { detail: row }));
  }
  return row;
}

export async function fetchAdminIntegrations() {
  return listAdminResource<AdminIntegration>('integrations');
}

export async function updateAdminIntegration(id: number, patch: Partial<AdminIntegration>) {
  return updateAdminResource<AdminIntegration>('integrations', id, patch);
}

export async function fetchAdminBackups() {
  return listAdminResource<AdminBackup>('backups');
}

export async function createAdminBackup(payload: Omit<AdminBackup, 'id'>) {
  return createAdminResource<AdminBackup>('backups', payload);
}

export async function fetchAdminSecurityAlerts() {
  return listAdminResource<AdminSecurityAlert>('securityAlerts');
}

export async function updateAdminSecurityAlert(id: number, patch: Partial<AdminSecurityAlert>) {
  return updateAdminResource<AdminSecurityAlert>('securityAlerts', id, patch);
}

export async function fetchAdminAuditLogs() {
  return listAdminResource<AuditLogEntry>('auditLogs');
}

export async function createAdminAuditLog(payload: Omit<AuditLogEntry, 'id'> & { admin?: string; target?: string }) {
  return createAdminResource<AuditLogEntry>('auditLogs', payload);
}
