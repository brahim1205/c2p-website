import AdminMessagesExternalPanel from './AdminMessagesExternalPanel';
import AdminMessagesInternalPanel from './AdminMessagesInternalPanel';
import type { useAdminMessagesSession } from './useAdminMessagesSession';

type AdminMessagesSession = ReturnType<typeof useAdminMessagesSession>;

export default function AdminMessagesPanels({ session }: { session: AdminMessagesSession }) {
  const stats = [
    { label: 'Messages non lus', value: session.totalUnread, icon: 'ri-message-3-line', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Demandes externes', value: session.openPublicRequests, icon: 'ri-customer-service-2-line', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Conversations', value: session.conversations.length, icon: 'ri-group-line', tone: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages support</h1>
          <p className="mt-1 text-sm text-gray-600">
            Les demandes support internes et les messages du formulaire public remontent ici pour l administration.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
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

      <AdminMessagesTabs session={session} />

      {session.activeTab === 'internal' ? (
        <AdminMessagesInternalPanel session={session} />
      ) : (
        <AdminMessagesExternalPanel session={session} />
      )}
    </>
  );
}

function AdminMessagesTabs({ session }: { session: AdminMessagesSession }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Navigation messages support">
      <button
        type="button"
        role="tab"
        id="admin-messages-tab-internal"
        aria-selected={session.activeTab === 'internal'}
        aria-controls="admin-messages-panel-internal"
        onClick={() => session.setActiveTab('internal')}
        className={`rounded-lg px-4 py-2 text-sm font-medium ${session.activeTab === 'internal' ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        Inbox interne
      </button>
      <button
        type="button"
        role="tab"
        id="admin-messages-tab-external"
        aria-selected={session.activeTab === 'external'}
        aria-controls="admin-messages-panel-external"
        onClick={() => session.setActiveTab('external')}
        className={`rounded-lg px-4 py-2 text-sm font-medium ${session.activeTab === 'external' ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        Formulaire public
      </button>
    </div>
  );
}
