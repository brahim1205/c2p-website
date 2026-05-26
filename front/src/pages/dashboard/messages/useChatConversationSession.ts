import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Attachment, Conversation, Message } from '@/hooks/useBackendMessaging';
import { useToast } from '@/hooks/useToast';
import { downloadTextFile } from '@/lib/downloads';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    if (messageText.trim()) {
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

  const handleFileAttach = (type: string) => {
    setShowAttachmentMenu(false);
    const fileName = type === 'pdf' ? 'Document.pdf' : type === 'image' ? 'Image.png' : 'Video.mp4';
    const fileSize = type === 'pdf' ? '2.4 MB' : type === 'image' ? '1.2 MB' : '15.6 MB';
    void onSendMessage(conversation.id, '', [{ name: fileName, size: fileSize, type }]);
    success('Fichier envoyé', `${fileName} a été envoyé avec succès.`);
  };

  const handleDownloadAttachment = (name: string, size: string, type: string) => {
    downloadTextFile(
      `${name}.txt`,
      `Centre C2P\nPiece jointe: ${name}\nType: ${type}\nTaille: ${size}\n\nExport declenche depuis la messagerie.\n`,
    );
    success('Telechargement', `${name} a ete telecharge.`);
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
    attachmentMenuRef,
    emojiPickerRef,
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
    visibleMessages,
  };
}
