import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchDirectoryUsers } from '@/lib/accountApi';
import { canMessageDirectoryUser } from '@/lib/messagingPolicy';
import { queryKeys } from '@/lib/queryKeys';
import {
  filterAllowedContacts,
  filterComposeContacts,
  filterVisibleConversations,
  findContactById,
  findIndividualConversation,
  mapDirectoryUsersToContacts,
  type ContactOption,
} from './messagesPageModel';
import { useMessageCallControls } from './useMessageCallControls';
import { useSupportConversationBootstrap } from './useSupportConversationBootstrap';

export function useMessagesPageSession() {
  const [searchParams] = useSearchParams();
  const messaging = useBackendMessaging();
  const {
    activeConversationId,
    conversations,
    createConversation,
    getConversationMessages,
    loading,
    markAsRead,
    sendMessage,
    setActiveConversationId,
    totalUnread,
  } = messaging;
  const { user } = useAuth();
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [archivedConversationIds, setArchivedConversationIds] = useState<string[]>([]);
  const conversationBootstrapDoneRef = useRef(false);
  const participantBootstrapDoneRef = useRef(false);

  const contactsQuery = useQuery({
    queryKey: queryKeys.messaging.directory(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ContactOption[]> => {
      const users = await fetchDirectoryUsers();
      return mapDirectoryUsersToContacts(users, user?.id);
    },
  });

  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data]);
  const allowedContacts = useMemo(() => filterAllowedContacts(user?.role, contacts), [contacts, user?.role]);
  const currentConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const {
    callDuration,
    callType,
    handleCall,
    handleEndCall,
    isInCall,
  } = useMessageCallControls({
    currentConversation,
    success,
  });
  const currentMessages = activeConversationId ? getConversationMessages(activeConversationId) : [];
  const filteredConversations = useMemo(
    () => filterVisibleConversations(conversations, archivedConversationIds, searchQuery),
    [archivedConversationIds, conversations, searchQuery],
  );
  const filteredComposeContacts = useMemo(
    () => filterComposeContacts(allowedContacts, composeQuery),
    [allowedContacts, composeQuery],
  );

  useEffect(() => {
    if (contactsQuery.isError) {
      console.error(contactsQuery.error);
    }
  }, [contactsQuery.error, contactsQuery.isError]);

  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, setActiveConversationId]);

  useEffect(() => {
    if (loading || !activeConversationId) {
      return;
    }

    const stillVisible = conversations.some((conversation) => conversation.id === activeConversationId);
    if (!stillVisible) {
      setActiveConversationId(null);
    }
  }, [activeConversationId, conversations, loading, setActiveConversationId]);

  useSupportConversationBootstrap({
    error,
    messaging,
    searchParams,
    success,
    user,
  });

  useEffect(() => {
    const targetConversationId = searchParams.get('conversation');
    if (!targetConversationId || conversationBootstrapDoneRef.current) {
      return;
    }

    const matchingConversation = conversations.find((conversation) => conversation.id === targetConversationId);
    if (!matchingConversation) {
      return;
    }

    conversationBootstrapDoneRef.current = true;
    setActiveConversationId(matchingConversation.id);
  }, [conversations, searchParams, setActiveConversationId]);

  useEffect(() => {
    const targetParticipantId = searchParams.get('student');
    const targetParticipantName = searchParams.get('name');

    if (!targetParticipantId || !user || loading) {
      return;
    }

    if (contacts.length > 0) {
      const targetContact = findContactById(contacts, targetParticipantId);
      if (!targetContact) {
        participantBootstrapDoneRef.current = true;
        error('Conversation indisponible', 'Le destinataire est introuvable.');
        return;
      }
      if (!canMessageDirectoryUser(user.role, targetContact)) {
        participantBootstrapDoneRef.current = true;
        error('Conversation indisponible', 'Ce role ne peut pas etre contacte directement.');
        return;
      }
    }

    const existingConversation = findIndividualConversation(conversations, user.id, targetParticipantId);

    if (existingConversation) {
      const shouldNotify = !participantBootstrapDoneRef.current || activeConversationId !== existingConversation.id;
      participantBootstrapDoneRef.current = true;
      if (activeConversationId !== existingConversation.id) {
        setActiveConversationId(existingConversation.id);
      }
      if (shouldNotify) {
        success('Conversation ouverte', `Conversation avec ${existingConversation.name} prete.`);
      }
      return;
    }

    if (participantBootstrapDoneRef.current) {
      return;
    }

    participantBootstrapDoneRef.current = true;

    void (async () => {
      const created = await createConversation({
        name: targetParticipantName || 'Contact C2P',
        role: 'Contact',
        participants: [user.id, targetParticipantId],
        type: 'individual',
        members: 2,
      });

      if (created) {
        setActiveConversationId(created.id);
        success('Conversation creee', `Conversation avec ${created.name} prete.`);
      } else {
        participantBootstrapDoneRef.current = false;
        error('Conversation indisponible', 'Impossible d ouvrir cette conversation.');
      }
    })();
  }, [activeConversationId, contacts, conversations, createConversation, error, loading, searchParams, setActiveConversationId, success, user]);

  const closeComposeModal = () => {
    setShowComposeModal(false);
    setComposeQuery('');
    setComposeMessage('');
  };

  const handleCreateConversation = async (contact: ContactOption) => {
    if (!user) return;
    if (!canMessageDirectoryUser(user.role, contact)) {
      error('Conversation indisponible', 'Ce destinataire doit passer par C2P.');
      return;
    }

    const existingConversation = findIndividualConversation(conversations, user.id, contact.id);

    if (existingConversation) {
      setArchivedConversationIds((prev) => prev.filter((item) => item !== existingConversation.id));
      setActiveConversationId(existingConversation.id);
      closeComposeModal();
      if (composeMessage.trim()) {
        await sendMessage(existingConversation.id, composeMessage.trim());
      }
      setComposeMessage('');
      success('Conversation ouverte', `Conversation avec ${contact.firstName} ${contact.lastName}.`);
      return;
    }

    setCreatingConversation(true);
    try {
      const created = await createConversation({
        name: `${contact.firstName} ${contact.lastName}`,
        role: contact.role,
        avatar: contact.avatar,
        participants: [user.id, contact.id],
        type: 'individual',
        members: 2,
      });

      if (!created) {
        throw new Error('creation_failed');
      }

      setArchivedConversationIds((prev) => prev.filter((item) => item !== created.id));
      if (composeMessage.trim()) {
        await sendMessage(created.id, composeMessage.trim());
      }
      closeComposeModal();
      success('Conversation creee', `Nouvelle conversation avec ${contact.firstName} ${contact.lastName}.`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de creer la conversation.');
    } finally {
      setCreatingConversation(false);
    }
  };

  const archiveConversation = (conversationId: string, nextConversationId: string | null) => {
    setArchivedConversationIds((prev) => prev.includes(conversationId) ? prev : [...prev, conversationId]);
    setActiveConversationId(nextConversationId);
  };

  return {
    user,
    conversations,
    activeConversationId,
    setActiveConversationId,
    currentConversation,
    currentMessages,
    totalUnread,
    loading,
    sendMessage,
    markAsRead,
    searchQuery,
    setSearchQuery,
    showComposeModal,
    setShowComposeModal,
    composeQuery,
    setComposeQuery,
    composeMessage,
    setComposeMessage,
    creatingConversation,
    archivedConversationIds,
    filteredConversations,
    filteredComposeContacts,
    isInCall,
    callType,
    callDuration,
    closeComposeModal,
    handleCall,
    handleEndCall,
    handleCreateConversation,
    archiveConversation,
  };
}
