import { apiRequest } from './api';

export interface PublicContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'handled';
  handledAt: string | null;
}

export async function fetchSmsGatewayStatus() {
  return apiRequest<{
    provider: 'disabled' | 'mock' | 'sendtext';
    configured: boolean;
    baseUrl?: string;
    sendPath?: string;
    senderId?: string;
  }>('/communications/sms/status');
}

export async function fetchEmailGatewayStatus() {
  return apiRequest<{
    provider: 'disabled' | 'mock' | 'resend';
    configured: boolean;
    from?: string;
    replyTo?: string;
  }>('/communications/email/status');
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
    channels: {
      email: { attempted: number; delivered: number; failed: number; skipped: number; provider: string };
      sms: { attempted: number; delivered: number; failed: number; skipped: number; provider: string };
      push: { attempted: number; delivered: number; failed: number; skipped: number; provider: string };
    };
  }>('/communications/campaigns/dispatch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPublicContactSubmissions() {
  return apiRequest<PublicContactSubmission[]>('/public/contact-submissions');
}

export async function markPublicContactSubmissionHandled(id: string) {
  return apiRequest<PublicContactSubmission>(`/public/contact-submissions/${encodeURIComponent(id)}/handled`, {
    method: 'PATCH',
  });
}
