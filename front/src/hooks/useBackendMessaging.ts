import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const CONVERSATIONS_REFRESH_MS = 10_000;
const THREAD_REFRESH_MS = 4_000;

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

const retryUnlessOffline = (failureCount: number, error: unknown) => !isIgnorableTransportError(error) && failureCount < 2;

/**
 * Inbox data. The conversation list is shared by every caller (layouts, pages)
 * and polled only while the tab is visible; messages are loaded for the open
 * conversation alone, which is refreshed more often.
 */
export function useBackendMessaging(options: UseBackendMessagingOptions = {}) {
  const { summaryOnly = false } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const conversationsKey = useMemo(() => queryKeys.messaging.conversations(user?.id), [user?.id]);
  const threadKey = useCallback((conversationId: string) => queryKeys.messaging.thread(user?.id, conversationId), [user?.id]);

  const conversationsQuery = useQuery({
    queryKey: conversationsKey,
    queryFn: () => fetchConversations(true),
    enabled: Boolean(user),
    refetchInterval: CONVERSATIONS_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: retryUnlessOffline,
  });

  const threadQuery = useQuery({
    queryKey: threadKey(activeConversationId ?? ''),
    queryFn: () => fetchConversationMessages(activeConversationId as string),
    enabled: Boolean(user) && !summaryOnly && Boolean(activeConversationId),
    refetchInterval: THREAD_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: retryUnlessOffline,
  });

  const conversations = useMemo(() => conversationsQuery.data || [], [conversationsQuery.data]);
  const activeMessages = useMemo(() => threadQuery.data || [], [threadQuery.data]);
  const messages = useMemo<Record<string, Message[]>>(
    () => (activeConversationId ? { [activeConversationId]: activeMessages } : {}),
    [activeConversationId, activeMessages],
  );

  const updateConversations = useCallback((updater: (current: Conversation[]) => Conversation[]) => {
    queryClient.setQueryData<Conversation[]>(conversationsKey, (current) => updater(current || []));
  }, [conversationsKey, queryClient]);

  const updateThread = useCallback((conversationId: string, updater: (current: Message[]) => Message[]) => {
    queryClient.setQueryData<Message[]>(threadKey(conversationId), (current) => updater(current || []));
  }, [queryClient, threadKey]);

  const getConversationMessages = useCallback((conversationId: string): Message[] => {
    if (conversationId === activeConversationId) return activeMessages;
    return queryClient.getQueryData<Message[]>(threadKey(conversationId)) || [];
  }, [activeConversationId, activeMessages, queryClient, threadKey]);

  /** Throws when the message could not be sent, so the composer can keep the text. */
  const sendMessage = useCallback(async (conversationId: string, content: string, attachments?: Attachment[]) => {
    if (!user || (!content.trim() && (!attachments || attachments.length === 0))) return;

    const createdMessage = await sendConversationMessage(conversationId, content.trim(), attachments);
    updateThread(conversationId, (existing) => (
      existing.some((message) => message.id === createdMessage.id) ? existing : [...existing, createdMessage]
    ));
    updateConversations((current) => moveConversationToTop(current, conversationId, (conversation) => ({
      ...conversation,
      lastMessage: createdMessage.content || (createdMessage.attachments?.length ? 'Pièce jointe' : 'Nouveau message'),
      lastMessageAt: createdMessage.timestamp,
    })));
  }, [updateConversations, updateThread, user]);

  const createConversation = useCallback(async (payload: CreateConversationPayload) => {
    if (!user) return null;

    try {
      const createdConversation = await createConversationRecord({
        ...payload,
        participants: Array.from(new Set(payload.participants.map(String))),
        type: payload.type ?? 'individual',
        members: payload.members ?? payload.participants.length,
      });
      // The API returns the existing thread when the two people already talk.
      updateConversations((current) => [
        createdConversation,
        ...current.filter((item) => item.id !== createdConversation.id),
      ]);
      setActiveConversationId(createdConversation.id);
      return createdConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [updateConversations, user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      await markConversationRead(conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
      return;
    }

    updateConversations((current) => current.map((conversation) => (
      conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
    )));
    updateThread(conversationId, (current) => current.map((message) => ({ ...message, read: true })));
    // The server also cleared this thread's notifications: refresh the bell.
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
  }, [queryClient, updateConversations, updateThread, user]);

  // Messages that arrive while the conversation is open are read right away.
  const markingRef = useRef(false);
  useEffect(() => {
    if (summaryOnly || !activeConversationId || !user || markingRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const hasUnread = activeMessages.some((message) => !message.read && message.senderId !== String(user.id));
    if (!hasUnread) return;
    markingRef.current = true;
    void markAsRead(activeConversationId).finally(() => {
      markingRef.current = false;
    });
  }, [activeConversationId, activeMessages, markAsRead, summaryOnly, user]);

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
    loading: conversationsQuery.isLoading,
  };
}
