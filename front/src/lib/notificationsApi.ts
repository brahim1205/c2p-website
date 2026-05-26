import { apiRequest } from './api';
import type { NotificationType } from '@/hooks/useNotifications';

export interface NotificationRecord {
  id: string | number;
  user_id: string;
  type?: NotificationType | string;
  title?: string;
  message?: string;
  created_at?: string;
  updated_at?: string;
  is_read?: boolean;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function fetchMyNotifications(limit = 30) {
  return apiRequest<NotificationRecord[]>(`/notifications/me?limit=${encodeURIComponent(String(limit))}`);
}

export function createNotificationRecord(payload: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
}) {
  return apiRequest<NotificationRecord>('/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function markNotificationRead(id: string) {
  return apiRequest<NotificationRecord>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return apiRequest<NotificationRecord[]>('/notifications/read-all', {
    method: 'PATCH',
  });
}

export function deleteNotificationRecord(id: string) {
  return apiRequest<NotificationRecord>(`/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function clearMyNotifications() {
  return apiRequest<{ deleted: number }>('/notifications', {
    method: 'DELETE',
  });
}

export function fetchProviderNotificationRecipient(providerId: number | string) {
  return apiRequest<{ userId: string | null }>(`/notifications/provider-recipients/${encodeURIComponent(String(providerId))}`);
}
