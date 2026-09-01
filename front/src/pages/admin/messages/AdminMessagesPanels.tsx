import AdminMessagesExternalPanel from './AdminMessagesExternalPanel';
import AdminMessagesInternalPanel from './AdminMessagesInternalPanel';
import type { useAdminMessagesSession } from './useAdminMessagesSession';

type AdminMessagesSession = ReturnType<typeof useAdminMessagesSession>;

export default function AdminMessagesPanels({ session }: { session: AdminMessagesSession }) {
  return (
    <>
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
        Conversations
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
        Demandes contact
      </button>
    </div>
  );
}
