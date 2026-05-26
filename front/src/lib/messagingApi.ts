import { apiRequest } from './api';
import type { Attachment, Conversation, Message } from '@/hooks/useBackendMessaging';

export interface CreateConversationInput {
  name: string;
  role: string;
  avatar?: string;
  participants: string[];
  type?: 'individual' | 'group';
  members?: number;
}

export function fetchConversations(summaryOnly = false) {
  return apiRequest<Conversation[]>(`/messaging/conversations?summaryOnly=${summaryOnly ? 'true' : 'false'}`);
}

export function fetchConversationMessages(conversationId: string) {
  return apiRequest<Message[]>(`/messaging/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export function createConversation(input: CreateConversationInput) {
  return apiRequest<Conversation>('/messaging/conversations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function sendConversationMessage(conversationId: string, content: string, attachments?: Attachment[]) {
  return apiRequest<Message>(`/messaging/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, attachments: attachments ?? [] }),
  });
}

export function markConversationRead(conversationId: string) {
  return apiRequest<Message[]>(`/messaging/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: 'PATCH',
  });
}
