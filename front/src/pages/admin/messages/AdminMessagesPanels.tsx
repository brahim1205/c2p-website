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
      <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-600">Centre support</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Messages admin</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Traitez les conversations internes et les demandes reçues depuis le formulaire public.
          </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
          {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-gray-50 p-3">
                <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone}`}>
                  <i className={`${stat.icon} text-lg`}></i>
                </div>
                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs font-medium text-gray-500">{stat.label}</div>
              </div>
          ))}
          </div>
        </div>
      </section>

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
