import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchDirectoryUsers } from '@/lib/accountApi';
import { downloadTextFile } from '@/lib/downloads';
import { useSearchParams } from 'react-router-dom';

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    getConversationMessages,
    sendMessage,
    createConversation,
    markAsRead,
    totalUnread,
    loading: messagesLoading
  } = useBackendMessaging();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [panelMode, setPanelMode] = useState<'none' | 'info' | 'media' | 'search'>('none');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [mutedConversationIds, setMutedConversationIds] = useState<string[]>([]);
  const [archivedConversationIds, setArchivedConversationIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supportBootstrapDoneRef = useRef(false);
  const conversationBootstrapDoneRef = useRef(false);
  const [callDuration, setCallDuration] = useState(0);

  const currentConversation = conversations.find(c => c.id === activeConversationId);
  const currentMessages = activeConversationId ? getConversationMessages(activeConversationId) : [];

  useEffect(() => {
    void (async () => {
      try {
        const users = await fetchDirectoryUsers();
        setContacts(users.filter((entry) => entry.id !== user?.id).map((entry) => ({
          id: entry.id,
          firstName: entry.firstName,
          lastName: entry.lastName,
          email: entry.email,
          role: entry.role,
          avatar: entry.avatar,
        })));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [user?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversationId, currentMessages.length]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  // Set default active conversation on mount
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, setActiveConversationId]);

  useEffect(() => {
    if (supportBootstrapDoneRef.current || searchParams.get('support') !== '1' || !user) {
      return;
    }

    supportBootstrapDoneRef.current = true;

    const supportConversation = conversations.find((conversation) =>
      conversation.type === 'individual'
      && conversation.participants.includes(user.id)
      && conversation.participants.includes('usr-admin'),
    );

    if (supportConversation) {
      setActiveConversationId(supportConversation.id);
      success('Support ouvert', 'La conversation avec l administration est prete.');
      return;
    }

    void (async () => {
      const created = await createConversation({
        name: 'Support C2P',
        role: 'Support',
        participants: [user.id, 'usr-admin'],
        type: 'individual',
        members: 2,
      });

      if (created) {
        setActiveConversationId(created.id);
        success('Support ouvert', 'La conversation avec l administration a ete creee.');
      } else {
        error('Support indisponible', 'Impossible d ouvrir la conversation support.');
      }
    })();
  }, [conversations, createConversation, error, searchParams, setActiveConversationId, success, user]);

  useEffect(() => {
    const targetConversationId = searchParams.get('conversation');
    if (!targetConversationId || conversationBootstrapDoneRef.current) {
      return;
    }

    const matchingConversation = conversations.find((conversation) => conversation.id === targetConversationId);
    if (!matchingConversation) {
      return;
    }

    conversationBootstrapDoneRef.current = true;
    setActiveConversationId(matchingConversation.id);
  }, [conversations, searchParams, setActiveConversationId]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Call timer
  useEffect(() => {
    if (isInCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isInCall]);

  const filteredConversations = conversations.filter(conv =>
    !archivedConversationIds.includes(conv.id) && (
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const visibleMessages = currentMessages.filter((message) => {
    if (!messageSearchQuery.trim()) return true;
    const haystack = `${message.senderName} ${message.content}`.toLowerCase();
    return haystack.includes(messageSearchQuery.toLowerCase());
  });

  const sharedAttachments = currentMessages.flatMap((message) =>
    (message.attachments || []).map((attachment) => ({ ...attachment, messageId: message.id, senderName: message.senderName })),
  );

  const handleSendMessage = () => {
    if (messageText.trim() && activeConversationId) {
      sendMessage(activeConversationId, messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleFileAttach = (type: string) => {
    setShowAttachmentMenu(false);
    if (!activeConversationId) {
      error('Aucune conversation', 'Sélectionnez une conversation pour envoyer un fichier.');
      return;
    }
    const fileName = type === 'pdf' ? 'Document.pdf' : type === 'image' ? 'Image.png' : 'Video.mp4';
    const fileSize = type === 'pdf' ? '2.4 MB' : type === 'image' ? '1.2 MB' : '15.6 MB';
    sendMessage(activeConversationId, '', [{ name: fileName, size: fileSize, type }]);
    success('Fichier envoyé', `${fileName} a été envoyé avec succès.`);
  };

  const handleDownloadAttachment = (name: string, size: string, type: string) => {
    downloadTextFile(
      `${name}.txt`,
      `Centre C2P\nPiece jointe: ${name}\nType: ${type}\nTaille: ${size}\n\nExport declenche depuis la messagerie.\n`,
    );
    success('Telechargement', `${name} a ete telecharge.`);
  };

  const handleCall = (type: 'audio' | 'video') => {
    if (!currentConversation) return;
    setCallType(type);
    setIsInCall(true);
    success(
      type === 'video' ? 'Appel vidéo lancé' : 'Appel audio lancé',
      `Appel en cours avec ${currentConversation.name}...`
    );
  };

  const handleEndCall = () => {
    const duration = callDuration;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    success('Appel terminé', `Durée de l'appel : ${timeStr}`);
    setIsInCall(false);
    setCallType(null);
  };

  const handleCreateConversation = async (contact: ContactOption) => {
    if (!user) return;

    const existingConversation = conversations.find((conversation) =>
      conversation.type === 'individual'
      && conversation.participants.includes(user.id)
      && conversation.participants.includes(contact.id)
      && conversation.participants.length === 2,
    );

    if (existingConversation) {
      setArchivedConversationIds((prev) => prev.filter((item) => item !== existingConversation.id));
      setActiveConversationId(existingConversation.id);
      setShowComposeModal(false);
      setComposeQuery('');
      if (composeMessage.trim()) {
        await sendMessage(existingConversation.id, composeMessage.trim());
      }
      setComposeMessage('');
      success('Conversation ouverte', `Conversation avec ${contact.firstName} ${contact.lastName}.`);
      return;
    }

    setCreatingConversation(true);
    try {
      const created = await createConversation({
        name: `${contact.firstName} ${contact.lastName}`,
        role: contact.role,
        avatar: contact.avatar,
        participants: [user.id, contact.id],
        type: 'individual',
        members: 2,
      });

      if (!created) {
        throw new Error('creation_failed');
      }

      setArchivedConversationIds((prev) => prev.filter((item) => item !== created.id));
      if (composeMessage.trim()) {
        await sendMessage(created.id, composeMessage.trim());
      }
      setShowComposeModal(false);
      setComposeQuery('');
      setComposeMessage('');
      success('Conversation creee', `Nouvelle conversation avec ${contact.firstName} ${contact.lastName}.`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de creer la conversation.');
    } finally {
      setCreatingConversation(false);
    }
  };

  const emojiCategories = [
    { name: 'Favoris', emojis: ['😀','😂','🥰','😍','🤔','👍','👎','🙏','🔥','❤️','💯','🎉','✅','⚠️','❓','👏','🤝','🚀','💡','⭐'] },
    { name: 'Émotions', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'] },
    { name: 'Gestes', emojis: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'] },
    { name: 'Objets', emojis: ['💼','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔐','🔒','🔓','🔏','🗝️','🔗','📎','🖇️','📐','📏','🧮','📌','✂️','🗑️','🔧','🪛','🔨','⛏️','⚒️','🛠️','🗡️','⚔️','🔫','🪃','🏹','🛡️','🪚','🔬','🔭','⚗️','🧫','🧬','🔮','🧿','🪄','💎','💍','👑'] },
    { name: 'Symboles', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🈳','🈂','🛂','🛃','🛄','🛅'] },
  ];

  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);

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

  // Active call overlay
  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Messages' }]} />

      {/* Active Call Overlay */}
      {isInCall && currentConversation && (
        <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              {currentConversation.avatar ? (
                <img src={currentConversation.avatar} alt={currentConversation.name} className="w-28 h-28 rounded-full object-cover mx-auto ring-4 ring-white/20" />
              ) : (
                <div className="w-28 h-28 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-purple-600 font-bold text-2xl">{currentConversation.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 px-3 py-1 bg-green-500 text-white text-xs rounded-full">
                En ligne
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{currentConversation.name}</h2>
            <p className="text-gray-400 mb-2">{callType === 'video' ? 'Appel vidéo en cours...' : 'Appel audio en cours...'}</p>
            <p className="text-white text-xl font-mono">{formatCallDuration(callDuration)}</p>
          </div>
          <div className="flex items-center gap-6 mt-12">
            <button className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors">
              <i className="ri-mic-line text-xl"></i>
            </button>
            {callType === 'video' && (
              <button className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors">
                <i className="ri-camera-off-line text-xl"></i>
              </button>
            )}
            <button className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors">
              <i className="ri-volume-up-line text-xl"></i>
            </button>
            <button
              onClick={handleEndCall}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <i className="ri-phone-line text-2xl"></i>
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6 h-[calc(100vh-8rem)] overflow-hidden">
        {/* Conversations List */}
        <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
                {totalUnread > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">{totalUnread}</span>
                )}
              </div>
              <button
                onClick={() => setShowComposeModal(true)}
                className="w-10 h-10 bg-[#14B8A6] text-white rounded-lg flex items-center justify-center hover:bg-[#0D9488] transition-colors"
              >
                <i className="ri-add-line text-xl"></i>
              </button>
            </div>
            <div className="relative">
              <div className="w-5 h-5 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
                <i className="ri-search-line text-gray-400 text-sm"></i>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une conversation..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {messagesLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${activeConversationId === conv.id ? 'bg-[#14B8A6]/10' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    {conv.avatar ? (
                      <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-[#14B8A6]/20 rounded-full flex items-center justify-center">
                        <span className="text-[#14B8A6] font-bold text-sm">{conv.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</span>
                      </div>
                    )}
                    {conv.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                    {conv.type === 'group' && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#14B8A6] text-white rounded-full flex items-center justify-center text-xs">
                        <i className="ri-group-line text-[10px]"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {conv.name}
                        {conv.type === 'group' && <span className="text-xs text-gray-500 ml-1">({conv.members})</span>}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTimestamp(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-[#14B8A6] mb-1">{conv.role}</p>
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{conv.unreadCount}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeConversationId && currentConversation ? (
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-w-0">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentConversation.avatar ? (
                    <img src={currentConversation.avatar} alt={currentConversation.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-[#14B8A6]/20 rounded-full flex items-center justify-center">
                      <span className="text-[#14B8A6] font-bold">{currentConversation.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</span>
                    </div>
                  )}
                  {currentConversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {currentConversation.name}
                    {currentConversation.type === 'group' && <span className="text-sm text-gray-500 ml-2">({currentConversation.members} membres)</span>}
                  </h3>
                  <p className="text-sm text-[#14B8A6]">{currentConversation.online ? 'En ligne' : currentConversation.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCall('audio')}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                  title="Appel audio"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-phone-line text-gray-600 text-lg"></i>
                  </div>
                </button>
                <button
                  onClick={() => handleCall('video')}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                  title="Appel vidéo"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-vidicon-line text-gray-600 text-lg"></i>
                  </div>
                </button>
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${showMoreMenu ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                    title="Plus d'options"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-more-2-line text-gray-600 text-lg"></i>
                    </div>
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-56 z-20 overflow-hidden">
                      <button
                        onClick={() => { setShowMoreMenu(false); setPanelMode('info'); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-information-line text-gray-500"></i></div>
                        Infos de la conversation
                      </button>
                      <button
                        onClick={() => { setShowMoreMenu(false); setPanelMode('media'); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-image-line text-gray-500"></i></div>
                        Médias et fichiers
                      </button>
                      <button
                        onClick={() => { setShowMoreMenu(false); setPanelMode('search'); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-search-line text-gray-500"></i></div>
                        Rechercher dans la conversation
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          markAsRead(activeConversationId);
                          success('Tout lu', 'Tous les messages ont été marqués comme lus');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-check-double-line text-gray-500"></i></div>
                        Marquer comme lu
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setMutedConversationIds((prev) => prev.includes(currentConversation.id) ? prev.filter((item) => item !== currentConversation.id) : [...prev, currentConversation.id]);
                          success('Notifications', mutedConversationIds.includes(currentConversation.id) ? 'Notifications reactivees pour cette conversation' : 'Notifications silenciées pour cette conversation');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-notification-off-line text-gray-500"></i></div>
                        Désactiver les notifications
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => { setShowMoreMenu(false); error('Signalement', 'La conversation a été signalée à l\'administration'); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-alert-line text-red-500"></i></div>
                        Signaler
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setArchivedConversationIds((prev) => prev.includes(currentConversation.id) ? prev : [...prev, currentConversation.id]);
                          const nextConversation = conversations.find((item) => item.id !== currentConversation.id && !archivedConversationIds.includes(item.id));
                          setActiveConversationId(nextConversation?.id ?? null);
                          success('Conversation archivee', `${currentConversation.name} a ete retiree de la liste active.`);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <div className="w-5 h-5 flex items-center justify-center"><i className="ri-delete-bin-line text-red-500"></i></div>
                        Archiver la conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
              {panelMode !== 'none' && (
                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {panelMode === 'info' ? 'Infos de la conversation' : panelMode === 'media' ? 'Medias et fichiers' : 'Recherche dans la conversation'}
                    </p>
                    <button onClick={() => setPanelMode('none')} className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-white hover:text-gray-700">Fermer</button>
                  </div>
                  {panelMode === 'info' && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Nom</strong>{currentConversation.name}</div>
                      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Role</strong>{currentConversation.role}</div>
                      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Participants</strong>{currentConversation.members || currentConversation.participants.length}</div>
                      <div className="rounded-lg bg-white p-3 text-sm text-gray-700"><strong className="block text-gray-900">Notifications</strong>{mutedConversationIds.includes(currentConversation.id) ? 'Silenciees' : 'Actives'}</div>
                    </div>
                  )}
                  {panelMode === 'media' && (
                    sharedAttachments.length > 0 ? (
                      <div className="space-y-2">
                        {sharedAttachments.map((attachment) => (
                          <div key={`${attachment.messageId}-${attachment.name}`} className="flex items-center justify-between rounded-lg bg-white p-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{attachment.type} · {attachment.size} · {attachment.senderName}</p>
                            </div>
                            <button onClick={() => handleDownloadAttachment(attachment.name, attachment.size, attachment.type)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Telecharger</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucun media partage dans cette conversation.</p>
                    )
                  )}
                  {panelMode === 'search' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        placeholder="Rechercher un mot, un auteur ou une phrase..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#14B8A6] focus:outline-none"
                      />
                      <p className="text-xs text-gray-500">{visibleMessages.length} message(s) correspondant(s).</p>
                    </div>
                  )}
                </div>
              )}

              {visibleMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">{messageSearchQuery.trim() ? 'Aucun resultat pour cette recherche.' : 'Aucun message. Commencez la conversation !'}</p>
                </div>
              )}
              {visibleMessages.map((message) => {
                const isMe = message.senderId === user?.id;
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg ${isMe ? 'order-2' : 'order-1'}`}>
                      {!isMe && message.senderName && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>
                      )}
                      <div className={`rounded-2xl px-4 py-3 ${isMe ? 'bg-[#14B8A6] text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {message.content && (
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        )}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-[#0D9488]' : 'bg-white'}`}>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMe ? 'bg-[#0F766E]' : 'bg-[#14B8A6]/20'}`}>
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    <i className={`${
                                      attachment.type === 'pdf' ? 'ri-file-pdf-line' :
                                      attachment.type === 'docx' ? 'ri-file-word-line' :
                                      attachment.type === 'figma' ? 'ri-pen-nib-line' :
                                      'ri-file-line'
                                    } text-lg ${isMe ? 'text-white' : 'text-[#14B8A6]'}`}></i>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                                  <p className={`text-xs ${isMe ? 'text-white/70' : 'text-gray-500'}`}>{attachment.size}</p>
                                </div>
                                <button onClick={() => handleDownloadAttachment(attachment.name, attachment.size, attachment.type)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                                  <div className="w-4 h-4 flex items-center justify-center">
                                    <i className={`ri-download-line ${isMe ? 'text-white' : 'text-gray-600'} text-sm`}></i>
                                  </div>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {isMe && (
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className={`${message.read ? 'ri-check-double-line text-[#14B8A6]' : 'ri-check-line'}`}></i>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 lg:p-6 border-t border-gray-200">
              <div className="flex items-end gap-2">
                <div className="relative" ref={attachmentMenuRef}>
                  <button
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-attachment-line text-gray-600 text-lg"></i>
                    </div>
                  </button>
                  {showAttachmentMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-10">
                      <button onClick={() => handleFileAttach('pdf')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <i className="ri-file-line text-[#14B8A6]"></i><span>Document</span>
                      </button>
                      <button onClick={() => handleFileAttach('image')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <i className="ri-image-line text-[#14B8A6]"></i><span>Image</span>
                      </button>
                      <button onClick={() => handleFileAttach('video')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <i className="ri-video-line text-[#14B8A6]"></i><span>Vidéo</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Écrivez votre message..."
                    rows={1}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] resize-none text-sm"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${showEmojiPicker ? 'bg-[#14B8A6]/20 text-[#14B8A6]' : 'hover:bg-gray-100'}`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className={`ri-emotion-line text-lg ${showEmojiPicker ? 'text-[#14B8A6]' : 'text-gray-600'}`}></i>
                    </div>
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 w-80 z-20 overflow-hidden">
                      <div className="border-b border-gray-100">
                        <div className="flex overflow-x-auto px-2 pt-2 scrollbar-hide">
                          {emojiCategories.map((cat, idx) => (
                            <button
                              key={cat.name}
                              onClick={() => setActiveEmojiCategory(idx)}
                              className={`px-3 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                                activeEmojiCategory === idx
                                  ? 'text-[#14B8A6] border-b-2 border-[#14B8A6]'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-8 gap-1">
                          {emojiCategories[activeEmojiCategory].emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiClick(emoji)}
                              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors"
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Cliquez pour insérer</span>
                        <button
                          onClick={() => setShowEmojiPicker(false)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || !activeConversationId}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                    messageText.trim() && activeConversationId
                      ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-send-plane-fill text-lg"></i>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <i className="ri-message-3-line text-5xl text-gray-400"></i>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sélectionnez une conversation</h3>
              <p className="text-gray-600">Choisissez une conversation pour commencer à échanger</p>
            </div>
          </div>
        )}
      </div>
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Nouvelle conversation</h3>
                <p className="text-sm text-gray-500">Choisissez un contact puis, si besoin, ajoutez un premier message.</p>
              </div>
              <button onClick={() => { setShowComposeModal(false); setComposeQuery(''); setComposeMessage(''); }} className="h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <input
              type="text"
              value={composeQuery}
              onChange={(e) => setComposeQuery(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#14B8A6] focus:outline-none"
            />
            <textarea
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              placeholder="Message d'introduction facultatif..."
              rows={3}
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#14B8A6] focus:outline-none"
            />
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {contacts
                .filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.role}`.toLowerCase().includes(composeQuery.toLowerCase()))
                .map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => void handleCreateConversation(contact)}
                    disabled={creatingConversation}
                    className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-[#14B8A6]/40 hover:bg-[#14B8A6]/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.firstName} className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#14B8A6]/15 text-sm font-bold text-[#14B8A6]">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</p>
                        <p className="text-xs text-gray-500">{contact.email}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#14B8A6]">{contact.role}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
