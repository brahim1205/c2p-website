import { formatTimestamp } from './chatConversationModel';
import type { ChatConversationSession } from './ChatConversationSections';

export function ChatMessageList({ currentUserId, session }: { currentUserId?: string; session: ChatConversationSession }) {
  return (
    <>
      {session.visibleMessages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">{session.messageSearchQuery.trim() ? 'Aucun resultat pour cette recherche.' : 'Aucun message. Commencez la conversation !'}</p>
        </div>
      )}
      {session.visibleMessages.map((message) => {
        const isMe = message.senderId === currentUserId;
        return (
          <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg ${isMe ? 'order-2' : 'order-1'}`}>
              {!isMe && message.senderName && <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>}
              <div className={`rounded-2xl px-4 py-3 ${isMe ? 'bg-[#5fa6f3] text-white' : 'bg-gray-100 text-gray-900'}`}>
                {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                {message.attachments && message.attachments.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment, index) => (
                      <div key={`${message.id}-${attachment.name}-${index}`} className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-[#27346b]' : 'bg-white'}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMe ? 'bg-[#0F766E]' : 'bg-[#5fa6f3]/20'}`}>
                          <div className="w-5 h-5 flex items-center justify-center">
                            <i className={`${getAttachmentIcon(attachment.type)} text-lg ${isMe ? 'text-white' : 'text-[#5fa6f3]'}`}></i>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className={`text-xs ${isMe ? 'text-white/70' : 'text-gray-500'}`}>{attachment.size}</p>
                        </div>
                        <button type="button" aria-label={`Télécharger ${attachment.name}`} onClick={() => session.handleDownloadAttachment(attachment.name, attachment.size, attachment.type)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className={`ri-download-line ${isMe ? 'text-white' : 'text-gray-600'} text-sm`}></i>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <span>{formatTimestamp(message.timestamp)}</span>
                {isMe ? (
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={`${message.read ? 'ri-check-double-line text-[#5fa6f3]' : 'ri-check-line'}`}></i>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={session.messagesEndRef} />
    </>
  );
}

function getAttachmentIcon(type: string) {
  if (type === 'pdf') return 'ri-file-pdf-line';
  if (type === 'docx') return 'ri-file-word-line';
  if (type === 'figma') return 'ri-pen-nib-line';
  return 'ri-file-line';
}
