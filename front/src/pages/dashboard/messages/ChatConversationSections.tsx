import type { Conversation } from '@/hooks/useBackendMessaging';
import { emojiCategories } from './chatConversationModel';
import type { useChatConversationSession } from './useChatConversationSession';

export type ChatConversationSession = ReturnType<typeof useChatConversationSession>;

interface ChatHeaderProps {
  conversation: Conversation;
  onCall: (type: 'audio' | 'video') => void;
  session: ChatConversationSession;
}

export function ChatConversationHeader({ conversation, onCall, session }: ChatHeaderProps) {
  return (
    <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          {conversation.avatar ? (
            <img src={conversation.avatar} alt={conversation.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 bg-[#5fa6f3]/20 rounded-full flex items-center justify-center">
              <span className="text-[#5fa6f3] font-bold">{conversation.name.split(' ').map((name) => name[0]).join('').substring(0, 2)}</span>
            </div>
          )}
          {conversation.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">
            {conversation.name}
            {conversation.type === 'group' && <span className="text-sm text-gray-500 ml-2">({conversation.members} membres)</span>}
          </h3>
          <p className="text-sm text-[#5fa6f3]">{conversation.online ? 'En ligne' : conversation.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onCall('audio')} aria-label={`Lancer un appel audio avec ${conversation.name}`} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors" title="Appel audio">
          <div className="w-5 h-5 flex items-center justify-center"><i className="ri-phone-line text-gray-600 text-lg"></i></div>
        </button>
        <button type="button" onClick={() => onCall('video')} aria-label={`Lancer un appel vidéo avec ${conversation.name}`} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors" title="Appel vidéo">
          <div className="w-5 h-5 flex items-center justify-center"><i className="ri-vidicon-line text-gray-600 text-lg"></i></div>
        </button>
        <ConversationMoreMenu session={session} />
      </div>
    </div>
  );
}

function ConversationMoreMenu({ session }: { session: ChatConversationSession }) {
  return (
    <div className="relative" ref={session.moreMenuRef}>
      <button
        type="button"
        onClick={() => session.setShowMoreMenu(!session.showMoreMenu)}
        aria-label="Ouvrir les options de conversation"
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${session.showMoreMenu ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
        title="Plus d'options"
      >
        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-more-2-line text-gray-600 text-lg"></i></div>
      </button>
      {session.showMoreMenu && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-56 z-20 overflow-hidden">
          <MenuButton icon="ri-information-line" label="Infos de la conversation" onClick={() => { session.setShowMoreMenu(false); session.setPanelMode('info'); }} />
          <MenuButton icon="ri-image-line" label="Médias et fichiers" onClick={() => { session.setShowMoreMenu(false); session.setPanelMode('media'); }} />
          <MenuButton icon="ri-search-line" label="Rechercher dans la conversation" onClick={() => { session.setShowMoreMenu(false); session.setPanelMode('search'); }} />
          <div className="border-t border-gray-100 my-1"></div>
          <MenuButton icon="ri-check-double-line" label="Marquer comme lu" onClick={session.markCurrentConversationAsRead} />
          <MenuButton icon="ri-notification-off-line" label="Désactiver les notifications" onClick={session.toggleMuted} />
          <div className="border-t border-gray-100 my-1"></div>
          <MenuButton danger icon="ri-alert-line" label="Signaler" onClick={session.reportConversation} />
          <MenuButton danger icon="ri-delete-bin-line" label="Archiver la conversation" onClick={session.archiveConversation} />
        </div>
      )}
    </div>
  );
}

function MenuButton({ danger, icon, label, onClick }: { danger?: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      <div className="w-5 h-5 flex items-center justify-center"><i className={`${icon} ${danger ? 'text-red-500' : 'text-gray-500'}`}></i></div>
      {label}
    </button>
  );
}

export function ChatConversationPanelDrawer({ conversation, session }: { conversation: Conversation; session: ChatConversationSession }) {
  if (session.panelMode === 'none') return null;

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          {session.panelMode === 'info' ? 'Infos de la conversation' : session.panelMode === 'media' ? 'Medias et fichiers' : 'Recherche dans la conversation'}
        </p>
        <button type="button" onClick={() => session.setPanelMode('none')} className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-white hover:text-gray-700">Fermer</button>
      </div>
      {session.panelMode === 'info' ? <ConversationInfoPanel conversation={conversation} session={session} /> : null}
      {session.panelMode === 'media' ? <ConversationMediaPanel session={session} /> : null}
      {session.panelMode === 'search' ? <ConversationSearchPanel session={session} /> : null}
    </div>
  );
}

function ConversationInfoPanel({ conversation, session }: { conversation: Conversation; session: ChatConversationSession }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Nom</strong>{conversation.name}</div>
      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Role</strong>{conversation.role}</div>
      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Participants</strong>{conversation.members || conversation.participants.length}</div>
      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Notifications</strong>{session.mutedConversationIds.includes(conversation.id) ? 'Silenciees' : 'Actives'}</div>
    </div>
  );
}

function ConversationMediaPanel({ session }: { session: ChatConversationSession }) {
  if (session.sharedAttachments.length === 0) {
    return <p className="text-sm text-gray-500">Aucun media partage dans cette conversation.</p>;
  }

  return (
    <div className="space-y-2">
      {session.sharedAttachments.map((attachment) => (
        <div key={`${attachment.messageId}-${attachment.name}`} className="flex items-center justify-between rounded-lg bg-white p-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
            <p className="text-xs text-gray-500">{attachment.type} · {attachment.size} · {attachment.senderName}</p>
          </div>
          <button type="button" aria-label={`Télécharger ${attachment.name}`} onClick={() => session.handleDownloadAttachment(attachment.name, attachment.size, attachment.type)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Telecharger</button>
        </div>
      ))}
    </div>
  );
}

function ConversationSearchPanel({ session }: { session: ChatConversationSession }) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={session.messageSearchQuery}
        onChange={(event) => session.setMessageSearchQuery(event.target.value)}
        aria-label="Rechercher dans la conversation"
        placeholder="Rechercher un mot, un auteur ou une phrase..."
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
      />
      <p className="text-xs text-gray-500">{session.visibleMessages.length} message(s) correspondant(s).</p>
    </div>
  );
}

export function ChatComposer({ session }: { session: ChatConversationSession }) {
  return (
    <div className="p-4 lg:p-6 border-t border-gray-200">
      <div className="flex items-end gap-2">
        <AttachmentMenu session={session} />
        <div className="flex-1">
          <textarea
            ref={session.textareaRef}
            value={session.messageText}
            onChange={(event) => session.setMessageText(event.target.value)}
            onKeyDown={session.handleKeyPress}
            aria-label="Écrire un message"
            placeholder="Écrivez votre message..."
            rows={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] resize-none text-sm"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>
        <EmojiPicker session={session} />
        <button
          type="button"
          onClick={session.handleSendMessage}
          aria-label="Envoyer le message"
          disabled={!session.messageText.trim()}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${session.messageText.trim() ? 'bg-[#5fa6f3] text-white hover:bg-[#27346b]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          <div className="w-5 h-5 flex items-center justify-center"><i className="ri-send-plane-fill text-lg"></i></div>
        </button>
      </div>
    </div>
  );
}

function AttachmentMenu({ session }: { session: ChatConversationSession }) {
  return (
    <div className="relative" ref={session.attachmentMenuRef}>
      <button type="button" onClick={() => session.setShowAttachmentMenu(!session.showAttachmentMenu)} aria-label="Ajouter une pièce jointe" className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-attachment-line text-gray-600 text-lg"></i></div>
      </button>
      {session.showAttachmentMenu && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-10">
          <AttachmentButton icon="ri-file-line" label="Document" onClick={() => session.handleFileAttach('pdf')} />
          <AttachmentButton icon="ri-image-line" label="Image" onClick={() => session.handleFileAttach('image')} />
          <AttachmentButton icon="ri-video-line" label="Vidéo" onClick={() => session.handleFileAttach('video')} />
        </div>
      )}
    </div>
  );
}

function AttachmentButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
      <i className={`${icon} text-[#5fa6f3]`}></i>
      <span>{label}</span>
    </button>
  );
}

function EmojiPicker({ session }: { session: ChatConversationSession }) {
  return (
    <div className="relative" ref={session.emojiPickerRef}>
      <button
        type="button"
        onClick={() => session.setShowEmojiPicker(!session.showEmojiPicker)}
        aria-label="Ouvrir le sélecteur d'emoji"
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${session.showEmojiPicker ? 'bg-[#5fa6f3]/20 text-[#5fa6f3]' : 'hover:bg-gray-100'}`}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          <i className={`ri-emotion-line text-lg ${session.showEmojiPicker ? 'text-[#5fa6f3]' : 'text-gray-600'}`}></i>
        </div>
      </button>
      {session.showEmojiPicker && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 w-80 z-20 overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex overflow-x-auto px-2 pt-2 scrollbar-hide">
              {emojiCategories.map((category, index) => (
                <button
                  key={category.name}
                  onClick={() => session.setActiveEmojiCategory(index)}
                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-colors ${session.activeEmojiCategory === index ? 'text-[#5fa6f3] border-b-2 border-[#5fa6f3]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {emojiCategories[session.activeEmojiCategory].emojis.map((emoji) => (
                <button key={emoji} onClick={() => session.handleEmojiClick(emoji)} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors" title={emoji}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Cliquez pour insérer</span>
            <button type="button" onClick={() => session.setShowEmojiPicker(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
