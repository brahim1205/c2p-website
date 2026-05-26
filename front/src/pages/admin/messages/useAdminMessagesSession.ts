import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDirectoryUsers } from '@/lib/accountApi';
import {
  fetchPublicContactSubmissions,
  markPublicContactSubmissionHandled,
  type PublicContactSubmission,
} from '@/lib/communicationsApi';
import { ROLE_LABELS } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { useToast } from '@/hooks/useToast';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminMessagesTabKey, DirectoryEntry } from './adminMessagesModel';

export function useAdminMessagesSession() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const messaging = useBackendMessaging();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    getConversationMessages,
    sendMessage,
    markAsRead,
    totalUnread,
    loading,
  } = messaging;

  const [activeTab, setActiveTab] = useState<AdminMessagesTabKey>('internal');
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const directoryQuery = useQuery({
    queryKey: queryKeys.admin.messageDirectory(),
    queryFn: async (): Promise<DirectoryEntry[]> => {
      const users = await fetchDirectoryUsers();
      return users.map((entry) => ({
        id: entry.id,
        firstName: entry.firstName,
        lastName: entry.lastName,
        role: entry.role,
        avatar: entry.avatar,
      }));
    },
  });

  const publicRequestsQuery = useQuery({
    queryKey: queryKeys.admin.messages(),
    queryFn: () => fetchPublicContactSubmissions(),
  });

  useEffect(() => {
    if (directoryQuery.isError) {
      console.error(directoryQuery.error);
    }
  }, [directoryQuery.error, directoryQuery.isError]);

  useEffect(() => {
    if (publicRequestsQuery.isSuccess) {
      window.dispatchEvent(new CustomEvent('c2p:admin-support-updated'));
    }
  }, [publicRequestsQuery.isSuccess]);

  useEffect(() => {
    if (publicRequestsQuery.isError) {
      console.error(publicRequestsQuery.error);
      error('Erreur', 'Impossible de charger les demandes support.');
    }
  }, [error, publicRequestsQuery.error, publicRequestsQuery.isError]);

  const directoryUsers = useMemo(() => directoryQuery.data ?? [], [directoryQuery.data]);
  const publicRequests = useMemo(() => publicRequestsQuery.data ?? [], [publicRequestsQuery.data]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, setActiveConversationId]);

  useEffect(() => {
    if (activeConversationId) {
      void markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  const directoryMap = useMemo(
    () => new Map(directoryUsers.map((entry) => [entry.id, entry])),
    [directoryUsers],
  );

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const participantId = conversation.participants.find((id) => id !== user?.id);
      const counterpart = participantId ? directoryMap.get(participantId) : null;
      const label = counterpart
        ? `${counterpart.firstName} ${counterpart.lastName} ${ROLE_LABELS[counterpart.role as keyof typeof ROLE_LABELS] ?? counterpart.role}`
        : `${conversation.name} ${conversation.role}`;
      return query ? label.toLowerCase().includes(query) : true;
    });
  }, [conversations, directoryMap, searchQuery, user?.id]);

  const currentConversation = filteredConversations.find((item) => item.id === activeConversationId)
    ?? conversations.find((item) => item.id === activeConversationId)
    ?? null;
  const currentMessages = currentConversation ? getConversationMessages(currentConversation.id) : [];
  const openPublicRequests = publicRequests.filter((item) => item.status === 'new').length;

  const conversationDisplay = useCallback((conversation: typeof conversations[number]) => {
    const participantId = conversation.participants.find((id) => id !== user?.id);
    const counterpart = participantId ? directoryMap.get(participantId) : null;

    if (!counterpart) {
      return {
        name: conversation.name,
        role: conversation.role,
        avatar: conversation.avatar,
      };
    }

    return {
      name: `${counterpart.firstName} ${counterpart.lastName}`,
      role: ROLE_LABELS[counterpart.role as keyof typeof ROLE_LABELS] ?? counterpart.role,
      avatar: counterpart.avatar,
    };
  }, [directoryMap, user?.id]);

  const handleReply = async () => {
    if (!currentConversation || !replyText.trim()) return;
    await sendMessage(currentConversation.id, replyText.trim());
    setReplyText('');
    success('Reponse envoyee', 'Le message a ete transmis.');
  };

  const handleMarkHandled = async (submission: PublicContactSubmission) => {
    try {
      const updated = await markPublicContactSubmissionHandled(submission.id);
      queryClient.setQueryData<PublicContactSubmission[]>(queryKeys.admin.messages(), (current) => (
        current ?? publicRequests
      ).map((item) => (item.id === updated.id ? updated : item)));
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.messages() });
      window.dispatchEvent(new CustomEvent('c2p:admin-support-updated'));
      success('Demande traitee', `${submission.firstName} ${submission.lastName}`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre la demande a jour.');
    }
  };

  return {
    user,
    activeTab,
    setActiveTab,
    replyText,
    setReplyText,
    searchQuery,
    setSearchQuery,
    conversations,
    filteredConversations,
    currentConversation,
    currentMessages,
    publicRequests,
    totalUnread,
    openPublicRequests,
    loading,
    setActiveConversationId,
    conversationDisplay,
    handleReply,
    handleMarkHandled,
  };
}
