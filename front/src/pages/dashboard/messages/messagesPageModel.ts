import type { DirectoryUser } from '@/lib/accountApi';
import { canMessageDirectoryUser } from '@/lib/messagingPolicy';
import type { Conversation } from '@/hooks/useBackendMessaging';
import { isUserRole } from '@/lib/roles';

export interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  publicTitle?: string;
  expertVerified?: boolean;
}

export const SUPPORT_ONLY_ROLES = new Set(['client', 'prestataire', 'porteur', 'partenaire', 'parent']);

export function mapDirectoryUsersToContacts(users: DirectoryUser[], currentUserId?: string): ContactOption[] {
  return users.filter((entry) => entry.id !== currentUserId).map((entry) => ({
    id: entry.id,
    firstName: entry.firstName,
    lastName: entry.lastName,
    role: entry.role,
    avatar: entry.avatar,
    publicTitle: entry.publicTitle,
    expertVerified: entry.expertVerified,
  }));
}

export function filterVisibleConversations(conversations: Conversation[], archivedConversationIds: string[], searchQuery: string) {
  const normalizedQuery = searchQuery.toLowerCase();

  return conversations.filter((conversation) =>
    !archivedConversationIds.includes(conversation.id) && (
      conversation.name.toLowerCase().includes(normalizedQuery)
      || conversation.role.toLowerCase().includes(normalizedQuery)
    ),
  );
}

export function filterAllowedContacts(userRole: string | undefined, contacts: ContactOption[]) {
  return userRole && isUserRole(userRole) ? contacts.filter((contact) => canMessageDirectoryUser(userRole, contact)) : [];
}

export function filterComposeContacts(contacts: ContactOption[], composeQuery: string) {
  const normalizedQuery = composeQuery.toLowerCase();

  return contacts.filter((contact) =>
    `${contact.firstName} ${contact.lastName} ${contact.publicTitle ?? ''} ${contact.role}`.toLowerCase().includes(normalizedQuery),
  );
}

export function findIndividualConversation(conversations: Conversation[], currentUserId: string, participantId: string) {
  return conversations.find((conversation) =>
    conversation.type === 'individual'
    && conversation.participants.includes(currentUserId)
    && conversation.participants.includes(participantId)
    && conversation.participants.length === 2,
  );
}

export function findSupportConversation(conversations: Conversation[], currentUserId: string) {
  return findIndividualConversation(conversations, currentUserId, 'usr-admin');
}

export function findContactById(contacts: ContactOption[], contactId: string) {
  return contacts.find((contact) => contact.id === contactId) ?? null;
}

export function formatCallDuration(duration: number) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
