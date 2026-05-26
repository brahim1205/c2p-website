import { apiRequest } from '../api';
import type { NotificationDeliveryRow, OutboxDeadLetterEvent, OutboxMetrics, WebhookDispatchHistoryRow } from './types';

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
