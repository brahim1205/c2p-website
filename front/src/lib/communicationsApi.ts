import { apiRequest } from './api';

export async function fetchSmsGatewayStatus() {
  return apiRequest<{
    provider: 'disabled' | 'mock' | 'sendtext';
    configured: boolean;
    baseUrl?: string;
    sendPath?: string;
    senderId?: string;
  }>('/communications/sms/status');
}

export async function dispatchSmsCampaign(payload: {
  title: string;
  type: 'email' | 'sms' | 'push' | 'all';
  target: string;
  content: string;
}) {
  return apiRequest<{
    dispatched: number;
    failed: number;
    recipients: number;
    skipped?: boolean;
  }>('/communications/campaigns/dispatch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
