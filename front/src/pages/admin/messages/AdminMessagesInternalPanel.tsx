import { formatMessageTime, formatRelativeDate, getInitials } from './adminMessagesModel';
import type { useAdminMessagesSession } from './useAdminMessagesSession';

type AdminMessagesSession = ReturnType<typeof useAdminMessagesSession>;
type Conversation = AdminMessagesSession['conversations'][number];
type Message = AdminMessagesSession['currentMessages'][number];

export default function AdminMessagesInternalPanel({ session }: { session: AdminMessagesSession }) {
  return (
    <div className={`grid gap-3 ${session.showConversationSidebar ? 'xl:grid-cols-[250px_minmax(0,1fr)_220px]' : 'xl:grid-cols-[250px_minmax(0,1fr)]'}`} role="tabpanel" id="admin-messages-panel-internal" aria-labelledby="admin-messages-tab-internal">
      <ConversationList session={session} />
      <ConversationThread session={session} />
      {session.showConversationSidebar ? <ConversationSidebar session={session} /> : null}
    </div>
  );
}

function ConversationList({ session }: { session: AdminMessagesSession }) {
  return (
    <aside className="overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-3">
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

      <div className="max-h-[68vh] overflow-y-auto p-2">
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
      className={`mb-1.5 w-full rounded-xl border px-2.5 py-2 text-left transition-colors ${isActive ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:bg-gray-50'}`}
    >
      <div className="flex items-start gap-3">
        {display.avatar ? (
          <img src={display.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
            {getInitials(display.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-gray-900">{display.name}</p>
            <span className="shrink-0 text-[11px] text-gray-400">{formatMessageTime(conversation.lastMessageAt)}</span>
          </div>
          <p className="truncate text-xs text-gray-500">{display.role}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-gray-600">{conversation.lastMessage || 'Aucun message'}</p>
            {conversation.unreadCount > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function ConversationThread({ session }: { session: AdminMessagesSession }) {
  if (!session.currentConversation) {
    return (
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm">
        <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-gray-500">
          Sélectionnez une conversation.
        </div>
      </section>
    );
  }

  const display = session.conversationDisplay(session.currentConversation);

  return (
    <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-white px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => session.setShowConversationSidebar(!session.showConversationSidebar)}
            className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-gray-50"
            aria-label={`Afficher le profil de ${display.name}`}
          >
            {display.avatar ? (
              <img src={display.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                {getInitials(display.name)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-gray-900">{display.name}</h2>
              <p className="truncate text-xs text-gray-500">{display.role}</p>
            </div>
          </button>
          <div className="flex items-center gap-2 text-teal-700">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-teal-50" aria-label="Appel audio">
              <i className="ri-phone-line text-sm"></i>
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-teal-50" aria-label="Appel vidéo">
              <i className="ri-vidicon-line text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-3.5 py-3.5">
        {session.currentMessages.length === 0 ? (
          <EmptyThread />
        ) : (
          <div className="space-y-2.5">
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
      <div className="max-w-sm rounded-3xl border border-gray-200 bg-white px-6 py-5 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <i className="ri-chat-3-line text-xl"></i>
        </div>
        <p className="text-sm font-semibold text-gray-900">Aucun message pour le moment</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">Rédigez une réponse en bas pour démarrer l’échange.</p>
      </div>
    </div>
  );
}

function MessageBubble({ message, session }: { message: Message; session: AdminMessagesSession }) {
  const isMine = message.senderId === session.user?.id;
  const imageAttachments = (message.attachments ?? []).filter((attachment) => String(attachment.type || attachment.mimeType || '').startsWith('image'));
  const fileAttachments = (message.attachments ?? []).filter((attachment) => !String(attachment.type || attachment.mimeType || '').startsWith('image'));

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[74%] rounded-[20px] px-3 py-2.5 shadow-sm ${isMine ? 'rounded-br-md bg-teal-600 text-white' : 'rounded-bl-md border border-gray-200 bg-white text-gray-900'}`}>
        <div className={`mb-1 text-xs font-semibold ${isMine ? 'text-teal-50' : 'text-gray-500'}`}>
          {isMine ? 'Vous' : message.senderName}
        </div>
        {message.content ? <p className="whitespace-pre-wrap text-[13px] leading-5">{message.content}</p> : null}

        {imageAttachments.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {imageAttachments.map((attachment) => (
              <a
                key={`${message.id}-${attachment.name}`}
                href={attachment.url || '#'}
                target="_blank"
                rel="noreferrer"
                className={`overflow-hidden rounded-2xl border ${isMine ? 'border-teal-500/40' : 'border-gray-200'} bg-white/10`}
              >
                {attachment.url ? (
                  <img src={attachment.url} alt={attachment.name} className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-slate-100 text-slate-500">
                    <i className="ri-image-line text-2xl"></i>
                  </div>
                )}
              </a>
            ))}
          </div>
        ) : null}

        {fileAttachments.length ? (
          <div className="mt-3 space-y-2">
            {fileAttachments.map((attachment) => (
              <a
                key={`${message.id}-${attachment.name}`}
                href={attachment.url || '#'}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs ${isMine ? 'bg-teal-500/70 text-white' : 'bg-slate-50 text-gray-700'}`}
              >
                <i className="ri-attachment-2 text-base"></i>
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <span className="shrink-0 opacity-75">{attachment.size}</span>
              </a>
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
    <div className="border-t border-gray-200 bg-white px-3.5 py-3">
      <div className="flex items-end gap-3">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
          aria-label="Joindre un fichier"
        >
          <i className="ri-attachment-2 text-base"></i>
        </button>
        <textarea
          aria-label={`Répondre à ${displayName}`}
          value={session.replyText}
          onChange={(event) => session.setReplyText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void session.handleReply();
            }
          }}
          rows={2}
          placeholder="Tapez votre message..."
          className="min-h-[52px] flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-teal-500"
        />
        <button
          type="button"
          onClick={() => void session.handleReply()}
          disabled={!session.replyText.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          aria-label="Envoyer la réponse support"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ConversationSidebar({ session }: { session: AdminMessagesSession }) {
  const conversation = session.currentConversation;
  if (!conversation) {
    return (
      <aside className="rounded-[22px] border border-gray-200 bg-white p-3.5 shadow-sm">
        <p className="text-sm text-gray-500">Sélectionnez une conversation pour afficher les informations.</p>
      </aside>
    );
  }

  const display = session.conversationDisplay(conversation);
  const attachments = session.currentMessages.flatMap((message) => message.attachments ?? []);
  const imageAttachments = attachments.filter((attachment) => String(attachment.type || attachment.mimeType || '').startsWith('image')).slice(0, 6);
  const fileAttachments = attachments.filter((attachment) => !String(attachment.type || attachment.mimeType || '').startsWith('image')).slice(0, 6);

  return (
    <aside className="rounded-[22px] border border-gray-200 bg-white p-3.5 shadow-sm">
      <div className="text-center">
        {display.avatar ? (
          <img src={display.avatar} alt="" className="mx-auto h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-lg font-bold text-pink-600">
            {getInitials(display.name)}
          </div>
        )}
        <h3 className="mt-2.5 text-sm font-bold text-gray-900">{display.name}</h3>
        <p className="text-xs text-gray-500">{display.role}</p>
        <p className="mt-2 text-xs text-gray-400">Dernier échange {formatRelativeDate(conversation.lastMessageAt)}</p>
      </div>

      <div className="mt-6 space-y-3 text-sm text-gray-600">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
          <i className="ri-chat-1-line text-gray-400"></i>
          <span>{session.currentMessages.length} message{session.currentMessages.length > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
          <i className="ri-mail-line text-gray-400"></i>
          <span className="truncate">{display.name}</span>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900">Images</h4>
          <span className="text-xs text-gray-400">{imageAttachments.length}</span>
        </div>
        {imageAttachments.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune image partagée.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {imageAttachments.map((attachment, index) => (
              <a key={`${attachment.name}-${index}`} href={attachment.url || '#'} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl bg-slate-100">
                {attachment.url ? (
                  <img src={attachment.url} alt={attachment.name} className="h-14 w-full object-cover" />
                ) : (
                  <div className="flex h-14 items-center justify-center text-slate-400">
                    <i className="ri-image-line"></i>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900">Fichiers</h4>
          <span className="text-xs text-gray-400">{fileAttachments.length}</span>
        </div>
        {fileAttachments.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun fichier partagé.</p>
        ) : (
          <div className="space-y-2">
            {fileAttachments.map((attachment, index) => (
              <a
                key={`${attachment.name}-${index}`}
                href={attachment.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-700"
              >
                <i className="ri-file-line text-base"></i>
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <span className="shrink-0 text-gray-400">{attachment.size}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
