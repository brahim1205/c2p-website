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
    <aside className="max-h-none w-full border-b border-slate-200 bg-white lg:flex lg:h-full lg:w-[380px] lg:flex-shrink-0 lg:flex-col lg:border-b-0 lg:border-r xl:w-[424px]">
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">Messages</h2>
          {totalUnread > 0 ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{totalUnread}</span> : null}
        </div>
        <div className="relative">
          <div className="absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
            <i className="ri-search-line text-xl text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            aria-label="Rechercher une conversation"
            placeholder="Rechercher une conversation"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white sm:h-14 sm:text-base"
          />
        </div>
        <button type="button" onClick={onOpenCompose} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
          <i className="ri-add-line text-lg" />
          Nouvelle conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-color:#64748b_transparent]">
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
              className={`mx-3 my-2 flex w-[calc(100%-1.5rem)] items-start gap-3 rounded-2xl border p-3 text-left transition-colors sm:gap-4 sm:p-4 ${activeConversationId === conversation.id ? 'border-teal-400 bg-teal-50/70' : 'border-transparent hover:bg-slate-50'}`}
            >
              <div className="relative flex-shrink-0">
                {conversation.avatar ? (
                  <img src={conversation.avatar} alt={conversation.name} className="h-12 w-12 rounded-full object-cover sm:h-14 sm:w-14" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2f7624] sm:h-14 sm:w-14">
                    <span className="text-base font-bold text-white sm:text-xl">{conversation.name.split(' ').map((name) => name[0]).join('').substring(0, 2)}</span>
                  </div>
                )}
                {conversation.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
                {conversation.type === 'group' && <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#5fa6f3] text-xs text-white"><i className="ri-group-line text-[10px]" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="truncate text-sm font-bold text-slate-950 sm:text-base">
                    {conversation.name}
                    {conversation.type === 'group' && <span className="ml-1 text-xs text-gray-500">({conversation.members})</span>}
                  </h3>
                </div>
                <p className="mb-1 text-xs text-slate-500 sm:text-sm">{conversation.role}</p>
                <p className="truncate text-sm text-slate-700">{conversation.lastMessage}</p>
                <p className="mt-1 text-xs text-slate-400">{formatConversationTimestamp(conversation.lastMessageAt)}</p>
              </div>
              {conversation.unreadCount > 0 && <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{conversation.unreadCount}</div>}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
