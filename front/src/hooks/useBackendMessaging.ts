import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryKeys } from '@/lib/queryKeys';
import {
  createConversation as createConversationRecord,
  fetchConversationMessages,
  fetchConversations,
  markConversationRead,
  sendConversationMessage,
} from '@/lib/messagingApi';


export interface Attachment {
  name: string;
  size: string;
  type: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadId?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  read: boolean;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  online: boolean;
  type: 'individual' | 'group';
  members?: number;
  participants: string[];
}

interface CreateConversationPayload {
  name: string;
  role: string;
  avatar?: string;
  participants: string[];
  type?: 'individual' | 'group';
  members?: number;
}

interface UseBackendMessagingOptions {
  summaryOnly?: boolean;
}

interface MessagingSnapshot {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
}

function moveConversationToTop(
  conversations: Conversation[],
  conversationId: string,
  update: (conversation: Conversation) => Conversation,
) {
  const current = conversations.find((conversation) => conversation.id === conversationId);
  if (!current) return conversations;

  return [
    update(current),
    ...conversations.filter((conversation) => conversation.id !== conversationId),
  ];
}

function isIgnorableTransportError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message) : '';
  const code = 'code' in error ? String(error.code) : '';
  return code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT' || message === 'Failed to fetch';
}

export function useBackendMessaging(options: UseBackendMessagingOptions = {}) {
  const { summaryOnly = false } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const messagingQueryKey = useMemo(() => queryKeys.messaging.conversations(user?.id, summaryOnly), [summaryOnly, user?.id]);
  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: messagingQueryKey,
    queryFn: async () => {
      const convs = await fetchConversations(summaryOnly);
      const messagesMap: Record<string, Message[]> = {};

      if (!summaryOnly) {
        await Promise.all(
          convs.map(async (conversation) => {
            messagesMap[conversation.id] = await fetchConversationMessages(conversation.id);
          }),
        );
      }

      return {
        conversations: convs,
        messages: messagesMap,
      } satisfies MessagingSnapshot;
    },
    enabled: Boolean(user),
    refetchInterval: 20000,
    retry: (failureCount, queryError) => !isIgnorableTransportError(queryError) && failureCount < 2,
  });

  const conversations = useMemo(() => data?.conversations || [], [data?.conversations]);
  const messages = useMemo(() => data?.messages || {}, [data?.messages]);

  const updateMessagingCache = useCallback((updater: (current: MessagingSnapshot) => MessagingSnapshot) => {
    queryClient.setQueryData<MessagingSnapshot>(messagingQueryKey, (current) => updater(current || { conversations: [], messages: {} }));
  }, [messagingQueryKey, queryClient]);

  const getConversationMessages = useCallback((conversationId: string): Message[] => {
    return messages[conversationId] || [];
  }, [messages]);

  const sendMessage = useCallback(async (conversationId: string, content: string, attachments?: Attachment[]) => {
    if (!user || (!content.trim() && (!attachments || attachments.length === 0))) return;

    try {
      const createdMessage = await sendConversationMessage(conversationId, content.trim(), attachments);
      updateMessagingCache((current) => {
        const existing = current.messages[conversationId] || [];
        const nextMessages = existing.find((message) => message.id === createdMessage.id)
          ? existing
          : [...existing, createdMessage];
        return {
          conversations: moveConversationToTop(current.conversations, conversationId, (conversation) => ({
            ...conversation,
            lastMessage: createdMessage.content || (createdMessage.attachments?.length ? 'Pièce jointe' : 'Nouveau message'),
            lastMessageAt: createdMessage.timestamp,
          })),
          messages: {
            ...current.messages,
            [conversationId]: nextMessages,
          },
        };
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return;
    }
  }, [updateMessagingCache, user]);

  const createConversation = useCallback(async (payload: CreateConversationPayload) => {
    if (!user) return null;

    try {
      const createdConversation = await createConversationRecord({
        ...payload,
        participants: Array.from(new Set(payload.participants.map(String))),
        type: payload.type ?? 'individual',
        members: payload.members ?? payload.participants.length,
      });
      updateMessagingCache((current) => ({
        conversations: [createdConversation, ...current.conversations.filter((item) => item.id !== createdConversation.id)],
        messages: {
          ...current.messages,
          [createdConversation.id]: current.messages[createdConversation.id] || [],
        },
      }));
      setActiveConversationId(createdConversation.id);
      return createdConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [updateMessagingCache, user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      await markConversationRead(conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
      return;
    }

    updateMessagingCache((current) => {
      const convMessages = current.messages[conversationId] || [];
      return {
        conversations: current.conversations.map((conversation) => (
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
        )),
        messages: {
          ...current.messages,
          [conversationId]: convMessages.map((message) => ({ ...message, read: true })),
        },
      };
    });
  }, [updateMessagingCache, user]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    getConversationMessages,
    sendMessage,
    createConversation,
    markAsRead,
    totalUnread,
    loading
  };
}
