import { useState, useCallback, useEffect, useRef } from 'react';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from './useAuth';


export interface Attachment {
  name: string;
  size: string;
  type: string;
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

export function useBackendMessaging() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeRef = useRef<any>(null);

  // Fetch conversations from backend
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: convs, error: convError } = await backendClient
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (convError) {
        console.error('Error fetching conversations:', convError);
        setLoading(false);
        return;
      }

      const visibleConversations = (convs ?? []).filter((conversation: any) =>
        Array.isArray(conversation.participants)
          ? conversation.participants.map(String).includes(user.id)
          : true
      );

      // Fetch messages for all conversations
      const convIds = visibleConversations.map((c: any) => c.id);
      const messagesMap: Record<string, Message[]> = {};

      if (convIds.length > 0) {
        const { data: msgs } = await backendClient
          .from('messages')
          .select('*')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true });

        msgs?.forEach((m: any) => {
          const convId = String(m.conversation_id);
          if (!messagesMap[convId]) messagesMap[convId] = [];
          messagesMap[convId].push({
            id: String(m.id),
            conversationId: convId,
            content: m.content,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderAvatar: m.sender_avatar,
            timestamp: m.created_at,
            read: m.read,
            attachments: m.attachments || []
          });
        });
      }

      // Count unread per conversation
      const enrichedConvs: Conversation[] = visibleConversations.map((c: any) => {
        const convMessages = messagesMap[String(c.id)] ?? [];
        const lastMsg = convMessages[convMessages.length - 1];
        const unreadCount = convMessages.filter(
          (m: Message) => !m.read && m.senderId !== user.id
        ).length;

        return {
          id: String(c.id),
          name: c.name,
          avatar: c.avatar,
          role: c.role || 'Conversation',
          lastMessage: lastMsg?.content || 'Nouvelle conversation',
          lastMessageAt: lastMsg?.timestamp || c.updated_at || c.created_at,
          unreadCount,
          online: Math.random() > 0.5,
          type: c.type || 'individual',
          members: c.members,
          participants: c.participants || []
        };
      });

      setConversations(enrichedConvs);
      setMessages(messagesMap);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    realtimeRef.current = backendClient
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const newMsg: Message = {
            id: String(payload.new.id),
            conversationId: String(payload.new.conversation_id),
            content: payload.new.content,
            senderId: payload.new.sender_id,
            senderName: payload.new.sender_name,
            senderAvatar: payload.new.sender_avatar,
            timestamp: payload.new.created_at,
            read: payload.new.read,
            attachments: payload.new.attachments || []
          };

          setMessages(prev => {
            const convId = newMsg.conversationId;
            const existing = prev[convId] || [];
            // Avoid duplicates
            if (existing.find(m => m.id === newMsg.id)) return prev;
            return { ...prev, [convId]: [...existing, newMsg] };
          });

          setConversations(prev =>
            prev.map(c =>
              c.id === newMsg.conversationId
                ? {
                    ...c,
                    lastMessage: newMsg.content,
                    lastMessageAt: newMsg.timestamp,
                    unreadCount: newMsg.senderId !== user.id ? c.unreadCount + 1 : c.unreadCount
                  }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) {
        backendClient.removeChannel(realtimeRef.current);
      }
    };
  }, [user]);

  const getConversationMessages = useCallback((conversationId: string): Message[] => {
    return messages[conversationId] || [];
  }, [messages]);

  const sendMessage = useCallback(async (conversationId: string, content: string, attachments?: Attachment[]) => {
    if (!user || (!content.trim() && (!attachments || attachments.length === 0))) return;

    const senderName = `${user.firstName} ${user.lastName}`;

    // Optimistic insert into backend
    const { error } = await backendClient.from('messages').insert({
      conversation_id: conversationId,
      content: content.trim(),
      sender_id: user.id,
      sender_name: senderName,
      sender_avatar: user.avatar,
      read: true,
      attachments: attachments || []
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    // Update conversation updated_at
    await backendClient
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: content.trim(), lastMessageAt: new Date().toISOString() }
          : c
      )
    );
  }, [user]);

  const createConversation = useCallback(async (payload: CreateConversationPayload) => {
    if (!user) return null;

    const conversationPayload = {
      name: payload.name,
      role: payload.role,
      avatar: payload.avatar,
      participants: Array.from(new Set(payload.participants.map(String))),
      type: payload.type ?? 'individual',
      members: payload.members ?? payload.participants.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await backendClient
      .from('conversations')
      .insert(conversationPayload)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating conversation:', error);
      return null;
    }

    const createdConversation: Conversation = {
      id: String((data as any).id),
      name: (data as any).name,
      avatar: (data as any).avatar,
      role: (data as any).role || payload.role,
      lastMessage: 'Nouvelle conversation',
      lastMessageAt: (data as any).updated_at || new Date().toISOString(),
      unreadCount: 0,
      online: false,
      type: ((data as any).type || payload.type || 'individual') as Conversation['type'],
      members: (data as any).members ?? payload.members,
      participants: (data as any).participants || payload.participants,
    };

    setConversations((prev) => [createdConversation, ...prev.filter((item) => item.id !== createdConversation.id)]);
    setMessages((prev) => ({ ...prev, [createdConversation.id]: prev[createdConversation.id] || [] }));
    setActiveConversationId(createdConversation.id);
    return createdConversation;
  }, [user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    // Update unread messages in backend
    const { error } = await backendClient
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', user.id);

    if (error) {
      console.error('Error marking as read:', error);
      return;
    }

    setMessages(prev => {
      const convMessages = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: convMessages.map(m => ({ ...m, read: true }))
      };
    });

    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, [user]);

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
