import { Link } from 'react-router-dom';
import type { Conversation } from '@/hooks/useBackendMessaging';

export function DashboardMessagesMenu({
  isApprenant,
  loading,
  markAsRead,
  messagesOpen,
  recentConversations,
  setMessagesOpen,
  unreadCount,
}: {
  isApprenant: boolean;
  loading: boolean;
  markAsRead: (conversationId: string) => void | Promise<void>;
  messagesOpen: boolean;
  recentConversations: Conversation[];
  setMessagesOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  unreadCount: number;
}) {
  if (!isApprenant) {
    return (
      <Link
        to="/dashboard/messages"
        aria-label="Ouvrir les messages"
        title="Messages"
        className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100/80 active:scale-95 transition-all duration-200"
      >
        <MessageIcon />
        <UnreadBadge unreadCount={unreadCount} />
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMessagesOpen((value) => !value)}
        aria-label="Ouvrir les messages"
        aria-expanded={messagesOpen}
        className={`relative w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition-all duration-200 ${messagesOpen ? 'bg-gray-100' : 'hover:bg-gray-100/80'}`}
      >
        <MessageIcon />
        <UnreadBadge unreadCount={unreadCount} />
      </button>

      {messagesOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer les messages"
            className="fixed inset-0 z-30 bg-black/10"
            onClick={() => setMessagesOpen(false)}
          />
          <div className="absolute right-0 top-12 z-40 flex max-h-[520px] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Messages</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Questions de cours et retours formateur.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMessagesOpen(false)}
                  aria-label="Fermer les messages"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <MessagesContent
                loading={loading}
                markAsRead={markAsRead}
                recentConversations={recentConversations}
              />
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
              Pour démarrer un échange, utilisez “Poser une question au formateur” dans une leçon ou le suivi d’un devoir.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MessageIcon() {
  return (
    <div className="w-5 h-5 flex items-center justify-center">
      <i className="ri-message-3-line text-lg text-gray-600"></i>
    </div>
  );
}

function UnreadBadge({ unreadCount }: { unreadCount: number }) {
  if (unreadCount <= 0) return null;

  return (
    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}

function MessagesContent({
  loading,
  markAsRead,
  recentConversations,
}: {
  loading: boolean;
  markAsRead: (conversationId: string) => void | Promise<void>;
  recentConversations: Conversation[];
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-gray-100"></div>
              <div className="h-3 w-1/2 rounded bg-gray-100"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recentConversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <i className="ri-message-3-line text-xl"></i>
        </div>
        <p className="text-sm font-semibold text-gray-900">Aucun échange</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Les messages apparaîtront après une question posée dans un cours ou un retour sur devoir.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {recentConversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          onClick={() => {
            void markAsRead(conversation.id);
          }}
          className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50"
        >
          {conversation.avatar ? (
            <img src={conversation.avatar} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <i className="ri-user-smile-line"></i>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{conversation.name}</p>
              {conversation.unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{conversation.lastMessage}</p>
            <p className="mt-1 text-[11px] text-gray-400">{conversation.role}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
