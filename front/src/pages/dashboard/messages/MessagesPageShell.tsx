import Breadcrumb from '@/components/base/Breadcrumb';
import { getMessagingAudienceHint } from '@/lib/messagingPolicy';
import { isUserRole } from '@/lib/roles';
import ActiveCallOverlay from './ActiveCallOverlay';
import ChatConversationPanel from './ChatConversationPanel';
import ConversationListPanel from './ConversationListPanel';
import MessagesComposeModal from './MessagesComposeModal';
import type { useMessagesPageSession } from './useMessagesPageSession';

type MessagesPageSession = ReturnType<typeof useMessagesPageSession>;

interface MessagesPageShellProps {
  session: MessagesPageSession;
}

export default function MessagesPageShell({ session }: MessagesPageShellProps) {
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Messages' }]} />

      {session.isInCall && session.currentConversation ? (
        <ActiveCallOverlay
          conversation={session.currentConversation}
          callType={session.callType ?? 'audio'}
          callDuration={session.callDuration}
          onEndCall={session.handleEndCall}
        />
      ) : null}

      <div className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:flex-row lg:gap-6 lg:overflow-hidden">
        <ConversationListPanel
          conversations={session.filteredConversations}
          activeConversationId={session.activeConversationId}
          totalUnread={session.totalUnread}
          searchQuery={session.searchQuery}
          loading={session.loading}
          onSearchQueryChange={session.setSearchQuery}
          onOpenCompose={() => session.setShowComposeModal(true)}
          onSelectConversation={session.setActiveConversationId}
        />

        {session.activeConversationId && session.currentConversation ? (
          <ChatConversationPanel
            conversation={session.currentConversation}
            messages={session.currentMessages}
            currentUserId={session.user?.id}
            conversations={session.conversations}
            archivedConversationIds={session.archivedConversationIds}
            onSendMessage={session.sendMessage}
            onCall={session.handleCall}
            onMarkAsRead={session.markAsRead}
            onArchiveConversation={session.archiveConversation}
          />
        ) : (
          <EmptyConversationState userRole={session.user?.role} />
        )}
      </div>

      {session.showComposeModal ? (
        <MessagesComposeModal
          userRole={session.user?.role}
          contacts={session.filteredComposeContacts}
          query={session.composeQuery}
          message={session.composeMessage}
          creatingConversation={session.creatingConversation}
          onQueryChange={session.setComposeQuery}
          onMessageChange={session.setComposeMessage}
          onClose={session.closeComposeModal}
          onCreateConversation={(contact) => void session.handleCreateConversation(contact)}
        />
      ) : null}
    </>
  );
}

function EmptyConversationState({ userRole }: { userRole?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-6 text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <div className="flex h-12 w-12 items-center justify-center">
            <i className="ri-message-3-line text-5xl text-gray-400"></i>
          </div>
        </div>
        <h3 className="mb-2 text-xl font-bold text-gray-900">Sélectionnez une conversation</h3>
        <p className="text-gray-600">Choisissez une conversation pour commencer à échanger</p>
        {userRole && isUserRole(userRole) ? <p className="mt-2 text-sm text-gray-500">{getMessagingAudienceHint(userRole)}</p> : null}
      </div>
    </div>
  );
}
