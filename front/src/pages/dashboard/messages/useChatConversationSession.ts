import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Attachment, Conversation, Message } from '@/hooks/useBackendMessaging';
import { useToast } from '@/hooks/useToast';
import { uploadFileToServer, type UploadResourceType } from '@/lib/uploadApi';
import { type SharedAttachment } from './chatConversationModel';

export interface ChatConversationPanelProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId?: string;
  conversations: Conversation[];
  archivedConversationIds: string[];
  onSendMessage: (conversationId: string, content: string, attachments?: Attachment[]) => void | Promise<void>;
  onCall: (type: 'audio' | 'video') => void;
  onMarkAsRead: (conversationId: string) => void;
  onArchiveConversation: (conversationId: string, nextConversationId: string | null) => void;
  onBack?: () => void;
}

export function useChatConversationSession({
  archivedConversationIds,
  conversation,
  conversations,
  messages,
  onArchiveConversation,
  onMarkAsRead,
  onSendMessage,
}: ChatConversationPanelProps) {
  const { success, error } = useToast();
  const [messageText, setMessageText] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [panelMode, setPanelMode] = useState<'none' | 'info' | 'media' | 'search'>('none');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [mutedConversationIds, setMutedConversationIds] = useState<string[]>([]);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [pendingAttachmentKind, setPendingAttachmentKind] = useState<'document' | 'image' | 'video'>('document');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const canSendMessage = Boolean(messageText.trim());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.filter((message) => {
    if (!messageSearchQuery.trim()) return true;
    const haystack = `${message.senderName} ${message.content}`.toLowerCase();
    return haystack.includes(messageSearchQuery.toLowerCase());
  });

  const sharedAttachments: SharedAttachment[] = messages.flatMap((message) =>
    (message.attachments || []).map((attachment) => ({ ...attachment, messageId: message.id, senderName: message.senderName })),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.id, messages.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = () => {
    if (messageText.trim() && !uploadingAttachment) {
      void onSendMessage(conversation.id, messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileAttach = (type: 'document' | 'image' | 'video') => {
    setShowAttachmentMenu(false);
    setPendingAttachmentKind(type);
    fileInputRef.current?.click();
  };

  const handleAttachmentInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const resourceType: UploadResourceType = pendingAttachmentKind === 'image'
      ? 'image'
      : pendingAttachmentKind === 'video'
        ? 'video'
        : 'raw';

    setUploadingAttachment(true);
    setAttachmentUploadProgress(0);
    try {
      const uploaded = await uploadFileToServer(file, {
        folder: `messages/${conversation.id}`,
        filename: `${pendingAttachmentKind}-${Date.now()}`,
        resourceType,
        onProgress: setAttachmentUploadProgress,
      });
      const attachment: Attachment = {
        name: uploaded.originalName || file.name,
        size: formatFileSize(uploaded.size || file.size),
        type: getAttachmentType(uploaded.mimeType || file.type, pendingAttachmentKind),
        url: uploaded.url,
        mimeType: uploaded.mimeType || file.type,
        sizeBytes: uploaded.size || file.size,
        uploadId: uploaded.uploadId ?? null,
      };
      await onSendMessage(conversation.id, messageText.trim(), [attachment]);
      setMessageText('');
      success('Fichier envoye', `${attachment.name} a ete transmis.`);
    } catch (uploadError) {
      console.error(uploadError);
      const message = uploadError && typeof uploadError === 'object' && 'message' in uploadError
        ? String(uploadError.message)
        : 'Impossible d envoyer le fichier.';
      error('Upload impossible', message);
    } finally {
      setUploadingAttachment(false);
      setAttachmentUploadProgress(0);
    }
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    if (!attachment.url) {
      error('Fichier indisponible', 'Cette piece jointe ne contient pas de lien de telechargement.');
      return;
    }

    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    success('Telechargement', `${attachment.name} a ete telecharge.`);
  };

  const handleEmojiClick = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? messageText.length;
    const end = textarea.selectionEnd ?? messageText.length;
    const newText = messageText.substring(0, start) + emoji + messageText.substring(end);
    setMessageText(newText);
    setShowEmojiPicker(false);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [messageText]);

  const markCurrentConversationAsRead = () => {
    setShowMoreMenu(false);
    onMarkAsRead(conversation.id);
    success('Tout lu', 'Tous les messages ont été marqués comme lus');
  };

  const toggleMuted = () => {
    setShowMoreMenu(false);
    setMutedConversationIds((prev) => prev.includes(conversation.id) ? prev.filter((item) => item !== conversation.id) : [...prev, conversation.id]);
    success('Notifications', mutedConversationIds.includes(conversation.id) ? 'Notifications reactivees pour cette conversation' : 'Notifications silenciées pour cette conversation');
  };

  const reportConversation = () => {
    setShowMoreMenu(false);
    error('Signalement', 'La conversation a été signalée à l\'administration');
  };

  const archiveConversation = () => {
    setShowMoreMenu(false);
    const nextConversation = conversations.find((item) => item.id !== conversation.id && !archivedConversationIds.includes(item.id));
    onArchiveConversation(conversation.id, nextConversation?.id ?? null);
    success('Conversation archivee', `${conversation.name} a ete retiree de la liste active.`);
  };

  return {
    activeEmojiCategory,
    archiveConversation,
    attachmentUploadProgress,
    attachmentMenuRef,
    canSendMessage,
    emojiPickerRef,
    fileInputRef,
    handleAttachmentInputChange,
    handleDownloadAttachment,
    handleEmojiClick,
    handleFileAttach,
    handleKeyPress,
    handleSendMessage,
    markCurrentConversationAsRead,
    messageSearchQuery,
    messageText,
    messagesEndRef,
    moreMenuRef,
    mutedConversationIds,
    panelMode,
    pendingAttachmentKind,
    reportConversation,
    setActiveEmojiCategory,
    setMessageSearchQuery,
    setMessageText,
    setPanelMode,
    setShowAttachmentMenu,
    setShowEmojiPicker,
    setShowMoreMenu,
    sharedAttachments,
    showAttachmentMenu,
    showEmojiPicker,
    showMoreMenu,
    textareaRef,
    toggleMuted,
    uploadingAttachment,
    visibleMessages,
  };
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Ko';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} Mo`;
}

function getAttachmentType(mimeType: string, fallback: 'document' | 'image' | 'video') {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word')) return 'docx';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'xlsx';
  return fallback === 'document' ? 'file' : fallback;
}
