import { formatMessageTime, formatRelativeDate, getInitials } from './adminMessagesModel';
import type { useAdminMessagesSession } from './useAdminMessagesSession';

type AdminMessagesSession = ReturnType<typeof useAdminMessagesSession>;
type Conversation = AdminMessagesSession['conversations'][number];
type Message = AdminMessagesSession['currentMessages'][number];

export default function AdminMessagesInternalPanel({ session }: { session: AdminMessagesSession }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]" role="tabpanel" id="admin-messages-panel-internal" aria-labelledby="admin-messages-tab-internal">
      <ConversationList session={session} />
      <ConversationThread session={session} />
    </div>
  );
}

function ConversationList({ session }: { session: AdminMessagesSession }) {
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="relative">
          <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            aria-label="Rechercher une conversation support"
            value={session.searchQuery}
            onChange={(event) => session.setSearchQuery(event.target.value)}
            placeholder="Rechercher une conversation"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-2">
        {session.loading ? (
          <div className="p-4 text-sm text-gray-500">Chargement des conversations...</div>
        ) : session.filteredConversations.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Aucune conversation support.</div>
        ) : (
          session.filteredConversations.map((conversation) => (
            <ConversationButton key={conversation.id} conversation={conversation} session={session} />
          ))
        )}
      </div>
    </aside>
  );
}

function ConversationButton({ conversation, session }: { conversation: Conversation; session: AdminMessagesSession }) {
  const display = session.conversationDisplay(conversation);
  const isActive = conversation.id === session.currentConversation?.id;
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={`Ouvrir la conversation avec ${display.name}`}
      onClick={() => session.setActiveConversationId(conversation.id)}
      className={`mb-2 w-full rounded-xl border px-3 py-3 text-left transition-colors ${isActive ? 'border-teal-500 bg-teal-50' : 'border-transparent hover:bg-gray-50'}`}
    >
      <div className="flex items-start gap-3">
        {display.avatar ? (
          <img src={display.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            {getInitials(display.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{display.name}</p>
            {conversation.unreadCount > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-gray-500">{display.role}</p>
          <p className="mt-1 truncate text-xs text-gray-600">{conversation.lastMessage || 'Aucun message'}</p>
          <p className="mt-1 text-[11px] text-gray-400">{formatRelativeDate(conversation.lastMessageAt)}</p>
        </div>
      </div>
    </button>
  );
}

function ConversationThread({ session }: { session: AdminMessagesSession }) {
  if (!session.currentConversation) {
    return (
      <section className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-gray-500">
          Selectionnez une conversation.
        </div>
      </section>
    );
  }

  const display = session.conversationDisplay(session.currentConversation);

  return (
    <section className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {display.avatar ? (
              <img src={display.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
                {getInitials(display.name)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-900">{display.name}</h2>
              <p className="truncate text-sm text-gray-500">{display.role}</p>
            </div>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {session.currentMessages.length} message{session.currentMessages.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
        {session.currentMessages.length === 0 ? (
          <EmptyThread />
        ) : (
          <div className="space-y-3">
            {session.currentMessages.map((message) => (
              <MessageBubble key={message.id} message={message} session={session} />
            ))}
          </div>
        )}
      </div>

      <ReplyBox session={session} displayName={display.name} />
    </section>
  );
}

function EmptyThread() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center">
      <div className="max-w-sm rounded-2xl border border-gray-200 bg-white px-6 py-5 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <i className="ri-chat-3-line text-xl"></i>
        </div>
        <p className="text-sm font-semibold text-gray-900">Aucun message pour le moment</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">Redigez une reponse en bas pour demarrer l'echange support.</p>
      </div>
    </div>
  );
}

function MessageBubble({ message, session }: { message: Message; session: AdminMessagesSession }) {
  const isMine = message.senderId === session.user?.id;
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${isMine ? 'rounded-br-md bg-teal-600 text-white' : 'rounded-bl-md border border-gray-200 bg-white text-gray-900'}`}>
        <div className={`mb-1 text-xs font-semibold ${isMine ? 'text-teal-50' : 'text-gray-500'}`}>
          {isMine ? 'Vous' : message.senderName}
        </div>
        {message.content ? <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p> : null}
              {message.attachments?.length ? (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={`${message.id}-${attachment.name}`} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${isMine ? 'bg-teal-500/70 text-white' : 'bg-slate-50 text-gray-700'}`}>
                <i className="ri-attachment-2"></i>
                <span className="truncate">{attachment.name}</span>
                <span className="shrink-0 opacity-75">{attachment.size}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${isMine ? 'text-teal-50/80' : 'text-gray-400'}`}>
          <span>{formatMessageTime(message.timestamp)}</span>
          {isMine ? <i className="ri-check-double-line text-xs"></i> : null}
        </div>
      </div>
    </div>
  );
}

function ReplyBox({ session, displayName }: { session: AdminMessagesSession; displayName: string }) {
  return (
    <div className="border-t border-gray-200 bg-white px-5 py-4">
      <div className="flex items-end gap-3">
        <textarea
          aria-label={`Repondre a ${displayName}`}
          value={session.replyText}
          onChange={(event) => session.setReplyText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void session.handleReply();
            }
          }}
          rows={3}
          placeholder="Repondre a cette demande support..."
          className="min-h-[84px] flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-teal-500"
        />
        <button
          type="button"
          onClick={() => void session.handleReply()}
          disabled={!session.replyText.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          aria-label="Envoyer la reponse support"
        >
          <i className="ri-send-plane-2-fill text-lg"></i>
        </button>
      </div>
    </div>
  );
}
