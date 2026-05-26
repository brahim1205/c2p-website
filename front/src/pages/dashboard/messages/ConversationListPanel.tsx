import type { Conversation } from '@/hooks/useBackendMessaging';

type ConversationListPanelProps = {
  conversations: Conversation[];
  activeConversationId: string | null;
  totalUnread: number;
  searchQuery: string;
  loading: boolean;
  onSearchQueryChange: (value: string) => void;
  onOpenCompose: () => void;
  onSelectConversation: (conversationId: string) => void;
};

function formatConversationTimestamp(isoString: string) {
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
}

export default function ConversationListPanel({
  conversations,
  activeConversationId,
  totalUnread,
  searchQuery,
  loading,
  onSearchQueryChange,
  onOpenCompose,
  onSelectConversation,
}: ConversationListPanelProps) {
  return (
    <div className="max-h-[28rem] w-full rounded-xl border border-gray-200 bg-white shadow-sm lg:flex lg:max-h-none lg:w-96 lg:flex-shrink-0 lg:flex-col">
      <div className="border-b border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
            {totalUnread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{totalUnread}</span>}
          </div>
          <button type="button" onClick={onOpenCompose} aria-label="Ouvrir une nouvelle conversation" title="Nouvelle conversation" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5fa6f3] text-white transition-colors hover:bg-[#27346b]">
            <i className="ri-add-line text-xl" />
          </button>
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
            <i className="ri-search-line text-sm text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            aria-label="Rechercher une conversation"
            placeholder="Rechercher une conversation..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#5fa6f3] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex animate-pulse items-center gap-3 p-3">
                <div className="h-12 w-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-gray-200" />
                  <div className="h-2 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              aria-pressed={activeConversationId === conversation.id}
              aria-label={`Ouvrir la conversation avec ${conversation.name}`}
              className={`flex w-full items-start gap-3 border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 ${activeConversationId === conversation.id ? 'bg-[#5fa6f3]/10' : ''}`}
            >
              <div className="relative flex-shrink-0">
                {conversation.avatar ? (
                  <img src={conversation.avatar} alt={conversation.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5fa6f3]/20">
                    <span className="text-sm font-bold text-[#5fa6f3]">{conversation.name.split(' ').map((name) => name[0]).join('').substring(0, 2)}</span>
                  </div>
                )}
                {conversation.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
                {conversation.type === 'group' && <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#5fa6f3] text-xs text-white"><i className="ri-group-line text-[10px]" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="truncate text-sm font-semibold text-gray-900">
                    {conversation.name}
                    {conversation.type === 'group' && <span className="ml-1 text-xs text-gray-500">({conversation.members})</span>}
                  </h3>
                  <span className="ml-2 flex-shrink-0 text-xs text-gray-500">{formatConversationTimestamp(conversation.lastMessageAt)}</span>
                </div>
                <p className="mb-1 text-xs text-[#5fa6f3]">{conversation.role}</p>
                <p className="truncate text-sm text-gray-600">{conversation.lastMessage}</p>
              </div>
              {conversation.unreadCount > 0 && <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{conversation.unreadCount}</div>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
