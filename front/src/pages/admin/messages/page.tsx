import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { fetchDirectoryUsers } from '@/lib/accountApi';
import { fetchPublicContactSubmissions, markPublicContactSubmissionHandled, type PublicContactSubmission } from '@/lib/communicationsApi';
import { ROLE_LABELS } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { useToast } from '@/hooks/useToast';

type TabKey = 'internal' | 'external';

interface DirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMinutes < 1) return 'A l instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)} h`;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    getConversationMessages,
    sendMessage,
    markAsRead,
    totalUnread,
    loading,
  } = useBackendMessaging();

  const [activeTab, setActiveTab] = useState<TabKey>('internal');
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryEntry[]>([]);
  const [publicRequests, setPublicRequests] = useState<PublicContactSubmission[]>([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPublicRequests = useCallback(async () => {
    try {
      const rows = await fetchPublicContactSubmissions();
      setPublicRequests(rows);
      window.dispatchEvent(new CustomEvent('c2p:admin-support-updated'));
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les demandes support.');
    }
  }, [error]);

  useEffect(() => {
    void (async () => {
      try {
        const users = await fetchDirectoryUsers();
        setDirectoryUsers(users.map((entry) => ({
          id: entry.id,
          firstName: entry.firstName,
          lastName: entry.lastName,
          role: entry.role,
          avatar: entry.avatar,
        })));
      } catch (err) {
        console.error(err);
      }
    })();

    void loadPublicRequests();
  }, [loadPublicRequests]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, setActiveConversationId]);

  useEffect(() => {
    if (activeConversationId) {
      void markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  const directoryMap = useMemo(
    () => new Map(directoryUsers.map((entry) => [entry.id, entry])),
    [directoryUsers],
  );

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const participantId = conversation.participants.find((id) => id !== user?.id);
      const counterpart = participantId ? directoryMap.get(participantId) : null;
      const label = counterpart
        ? `${counterpart.firstName} ${counterpart.lastName} ${ROLE_LABELS[counterpart.role as keyof typeof ROLE_LABELS] ?? counterpart.role}`
        : `${conversation.name} ${conversation.role}`;
      return query ? label.toLowerCase().includes(query) : true;
    });
  }, [conversations, directoryMap, searchQuery, user?.id]);

  const currentConversation = filteredConversations.find((item) => item.id === activeConversationId)
    ?? conversations.find((item) => item.id === activeConversationId)
    ?? null;
  const currentMessages = currentConversation ? getConversationMessages(currentConversation.id) : [];
  const openPublicRequests = publicRequests.filter((item) => item.status === 'new').length;

  const conversationDisplay = useCallback((conversation: typeof conversations[number]) => {
    const participantId = conversation.participants.find((id) => id !== user?.id);
    const counterpart = participantId ? directoryMap.get(participantId) : null;

    if (!counterpart) {
      return {
        name: conversation.name,
        role: conversation.role,
        avatar: conversation.avatar,
      };
    }

    return {
      name: `${counterpart.firstName} ${counterpart.lastName}`,
      role: ROLE_LABELS[counterpart.role as keyof typeof ROLE_LABELS] ?? counterpart.role,
      avatar: counterpart.avatar,
    };
  }, [directoryMap, user?.id]);

  const handleReply = async () => {
    if (!currentConversation || !replyText.trim()) return;
    await sendMessage(currentConversation.id, replyText.trim());
    setReplyText('');
    success('Reponse envoyee', 'Le message a ete transmis.');
  };

  const handleMarkHandled = async (submission: PublicContactSubmission) => {
    try {
      const updated = await markPublicContactSubmissionHandled(submission.id);
      setPublicRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      window.dispatchEvent(new CustomEvent('c2p:admin-support-updated'));
      success('Demande traitee', `${submission.firstName} ${submission.lastName}`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre la demande a jour.');
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Messages support' }]} />

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages support</h1>
            <p className="mt-1 text-sm text-gray-600">
              Les demandes support internes et les messages du formulaire public remontent ici pour l administration.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Messages non lus', value: totalUnread, icon: 'ri-message-3-line', tone: 'bg-teal-50 text-teal-700' },
              { label: 'Demandes externes', value: openPublicRequests, icon: 'ri-customer-service-2-line', tone: 'bg-amber-50 text-amber-700' },
              { label: 'Conversations', value: conversations.length, icon: 'ri-group-line', tone: 'bg-slate-100 text-slate-700' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.tone}`}>
                    <i className={`${stat.icon} text-lg`}></i>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('internal')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'internal' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Inbox interne
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'external' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Formulaire public
          </button>
        </div>

        {activeTab === 'internal' ? (
          <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4">
                <div className="relative">
                  <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher une conversation"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-2">
                {loading ? (
                  <div className="p-4 text-sm text-gray-500">Chargement des conversations...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Aucune conversation support.</div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const display = conversationDisplay(conversation);
                    const isActive = conversation.id === currentConversation?.id;
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setActiveConversationId(conversation.id)}
                        className={`mb-2 w-full rounded-xl border px-3 py-3 text-left transition-colors ${isActive ? 'border-teal-500 bg-teal-50' : 'border-transparent hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          {display.avatar ? (
                            <img src={display.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                              {display.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">{display.name}</p>
                              {conversation.unreadCount > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-gray-500">{display.role}</p>
                            <p className="mt-1 truncate text-xs text-gray-600">{conversation.lastMessage || 'Aucun message'}</p>
                            <p className="mt-1 text-[11px] text-gray-400">{formatRelativeDate(conversation.lastMessageAt)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              {currentConversation ? (
                <>
                  <div className="border-b border-gray-200 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{conversationDisplay(currentConversation).name}</h2>
                        <p className="text-sm text-gray-500">{conversationDisplay(currentConversation).role}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        {currentMessages.length} message{currentMessages.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-[56vh] space-y-4 overflow-y-auto px-5 py-5">
                    {currentMessages.map((message) => {
                      const isMine = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${isMine ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                            <div className={`mb-1 text-xs font-medium ${isMine ? 'text-teal-50' : 'text-gray-500'}`}>
                              {message.senderName}
                            </div>
                            {message.content && <p className="text-sm leading-6">{message.content}</p>}
                            {!!message.attachments?.length && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment) => (
                                  <div key={`${message.id}-${attachment.name}`} className={`rounded-xl px-3 py-2 text-xs ${isMine ? 'bg-teal-500/70 text-white' : 'bg-white text-gray-700'}`}>
                                    {attachment.name} · {attachment.size}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className={`mt-2 text-[11px] ${isMine ? 'text-teal-50/80' : 'text-gray-400'}`}>
                              {formatRelativeDate(message.timestamp)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-200 px-5 py-4">
                    <div className="flex gap-3">
                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        rows={3}
                        placeholder="Repondre a cette demande support..."
                        className="min-h-[96px] flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-teal-500"
                      />
                      <button
                        onClick={() => void handleReply()}
                        disabled={!replyText.trim()}
                        className="self-end rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Repondre
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-gray-500">
                  Selectionnez une conversation.
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            {publicRequests.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
                Aucune demande externe pour le moment.
              </div>
            ) : (
              publicRequests.map((submission) => (
                <div key={submission.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-gray-900">
                          {submission.firstName} {submission.lastName}
                        </h2>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${submission.status === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {submission.status === 'new' ? 'Nouveau' : 'Traite'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{submission.subject}</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{submission.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span><i className="ri-mail-line mr-1"></i>{submission.email}</span>
                        <span><i className="ri-time-line mr-1"></i>{formatRelativeDate(submission.createdAt)}</span>
                        {submission.handledAt && <span><i className="ri-check-line mr-1"></i>Traite le {formatRelativeDate(submission.handledAt)}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={`mailto:${submission.email}?subject=${encodeURIComponent(`Re: ${submission.subject}`)}`}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Repondre par email
                      </a>
                      {submission.status === 'new' && (
                        <button
                          onClick={() => void handleMarkHandled(submission)}
                          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                        >
                          Marquer traite
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
