import { formatTimestamp } from './chatConversationModel';
import type { ChatConversationSession } from './ChatConversationSections';
import type { Attachment } from '@/hooks/useBackendMessaging';

export function ChatMessageList({ currentUserId, session }: { currentUserId?: string; session: ChatConversationSession }) {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-4 overflow-x-hidden">
      {session.visibleMessages.length === 0 && (
        <div className="flex min-h-[22rem] items-center justify-center py-8 text-center">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <i className="ri-message-3-line text-3xl text-teal-600"></i>
            </div>
            <p className="text-lg font-bold text-slate-950">
              {session.messageSearchQuery.trim() ? 'Aucun resultat pour cette recherche.' : 'Aucun message pour le moment'}
            </p>
            {!session.messageSearchQuery.trim() ? (
              <p className="mt-3 leading-7 text-slate-500">Rédigez une réponse en bas pour démarrer l&apos;échange support.</p>
            ) : null}
          </div>
        </div>
      )}
      {session.visibleMessages.map((message) => {
        const isMe = message.senderId === currentUserId;
        return (
          <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[min(34rem,calc(100%-1rem))] min-w-0 ${isMe ? 'order-2' : 'order-1'}`}>
              {!isMe && message.senderName && <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>}
              <div className={`min-w-0 overflow-hidden rounded-2xl px-4 py-3 ${isMe ? 'bg-[#5fa6f3] text-white' : 'bg-gray-100 text-gray-900'}`}>
                {message.content && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>}
                {message.attachments && message.attachments.length > 0 ? (
                  <div className="mt-2 max-w-full space-y-2">
                    {message.attachments.map((attachment, index) => (
                      <AttachmentPreview
                        key={`${message.id}-${attachment.name}-${index}`}
                        attachment={attachment}
                        isMe={isMe}
                        onDownload={() => session.handleDownloadAttachment(attachment)}
                      />
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
    </div>
  );
}

function AttachmentPreview({
  attachment,
  isMe,
  onDownload,
}: {
  attachment: Attachment;
  isMe: boolean;
  onDownload: () => void;
}) {
  const isImage = attachment.type === 'image' || attachment.mimeType?.startsWith('image/');
  const isVideo = attachment.type === 'video' || attachment.mimeType?.startsWith('video/');

  return (
    <div className={`max-w-full overflow-hidden rounded-xl ${isMe ? 'bg-[#27346b]' : 'bg-white'}`}>
      {isImage && attachment.url ? (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
          <img src={attachment.url} alt={attachment.name} className="max-h-64 w-full max-w-full object-cover" />
        </a>
      ) : null}
      {isVideo && attachment.url ? (
        <video src={attachment.url} controls className="max-h-72 w-full max-w-full bg-black" preload="metadata" />
      ) : null}
      <div className="flex items-center gap-3 p-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isMe ? 'bg-[#0F766E]' : 'bg-[#5fa6f3]/20'}`}>
          <div className="flex h-5 w-5 items-center justify-center">
            <i className={`${getAttachmentIcon(attachment.type, attachment.mimeType)} text-lg ${isMe ? 'text-white' : 'text-[#5fa6f3]'}`}></i>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {attachment.url ? (
            <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium underline-offset-2 hover:underline">
              {attachment.name}
            </a>
          ) : (
            <p className="truncate text-sm font-medium">{attachment.name}</p>
          )}
          <p className={`text-xs ${isMe ? 'text-white/70' : 'text-gray-500'}`}>{attachment.size}</p>
        </div>
        <button type="button" aria-label={`Télécharger ${attachment.name}`} onClick={onDownload} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10">
          <div className="flex h-4 w-4 items-center justify-center">
            <i className={`ri-download-line ${isMe ? 'text-white' : 'text-gray-600'} text-sm`}></i>
          </div>
        </button>
      </div>
    </div>
  );
}

function getAttachmentIcon(type: string, mimeType?: string) {
  if (type === 'image' || mimeType?.startsWith('image/')) return 'ri-image-line';
  if (type === 'video' || mimeType?.startsWith('video/')) return 'ri-video-line';
  if (type === 'pdf') return 'ri-file-pdf-line';
  if (type === 'docx') return 'ri-file-word-line';
  if (type === 'xlsx') return 'ri-file-excel-line';
  if (type === 'figma') return 'ri-pen-nib-line';
  return 'ri-file-line';
}
