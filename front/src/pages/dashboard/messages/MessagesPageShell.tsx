import { useEffect, useState } from 'react';
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
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState(Boolean(session.activeConversationId));

  useEffect(() => {
    setIsMobileConversationOpen(Boolean(session.activeConversationId));
  }, [session.activeConversationId]);

  return (
    <>
      {session.isInCall && session.currentConversation ? (
        <ActiveCallOverlay
          conversation={session.currentConversation}
          callType={session.callType ?? 'audio'}
          callDuration={session.callDuration}
          onEndCall={session.handleEndCall}
        />
      ) : null}

      <div className="flex h-[calc(100dvh-5rem)] min-h-[34rem] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:h-[calc(100dvh-6rem)] lg:flex-row">
        <div className={`${isMobileConversationOpen ? 'hidden lg:flex' : 'flex'} min-h-0 w-full flex-none overflow-hidden lg:w-[424px]`}>
          <ConversationListPanel
            conversations={session.filteredConversations}
            activeConversationId={session.activeConversationId}
            totalUnread={session.totalUnread}
            searchQuery={session.searchQuery}
            loading={session.loading}
            onSearchQueryChange={session.setSearchQuery}
            onOpenCompose={() => session.setShowComposeModal(true)}
            onSelectConversation={(conversationId) => {
              session.setActiveConversationId(conversationId);
              setIsMobileConversationOpen(true);
            }}
          />
        </div>

        {session.activeConversationId && session.currentConversation ? (
          <div className={`${isMobileConversationOpen ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-1 overflow-hidden`}>
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
              onBack={() => setIsMobileConversationOpen(false)}
            />
          </div>
        ) : (
          <div className="hidden min-w-0 flex-1 overflow-hidden lg:flex">
            <EmptyConversationState userRole={session.user?.role} />
          </div>
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
    <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
          <i className="ri-message-3-line text-3xl text-teal-600"></i>
        </div>
        <h3 className="mb-3 text-xl font-bold text-slate-950">Aucun message pour le moment</h3>
        <p className="leading-7 text-slate-500">Rédigez une réponse en bas pour démarrer l&apos;échange support.</p>
        {userRole && isUserRole(userRole) ? <p className="mt-2 text-sm text-gray-500">{getMessagingAudienceHint(userRole)}</p> : null}
      </div>
    </div>
  );
}
