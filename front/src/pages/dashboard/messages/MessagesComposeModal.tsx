import { getMessagingAudienceHint } from '@/lib/messagingPolicy';
import { isUserRole } from '@/lib/roles';
import type { ContactOption } from './messagesPageModel';

interface MessagesComposeModalProps {
  userRole?: string;
  contacts: ContactOption[];
  query: string;
  message: string;
  creatingConversation: boolean;
  onQueryChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onCreateConversation: (contact: ContactOption) => void;
}

export default function MessagesComposeModal({
  userRole,
  contacts,
  query,
  message,
  creatingConversation,
  onQueryChange,
  onMessageChange,
  onClose,
  onCreateConversation,
}: MessagesComposeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="messages-compose-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 id="messages-compose-title" className="text-lg font-bold text-gray-900">Nouvelle conversation</h3>
            <p className="text-sm text-gray-500">
              {userRole && isUserRole(userRole)
                ? getMessagingAudienceHint(userRole)
                : 'Choisissez un contact puis, si besoin, ajoutez un premier message.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer la fenêtre de nouvelle conversation"
            onClick={onClose}
            className="h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label="Rechercher un utilisateur"
          placeholder="Rechercher un utilisateur..."
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
        />
        <textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          aria-label="Message d'introduction"
          placeholder="Message d'introduction facultatif..."
          rows={3}
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:outline-none"
        />
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => onCreateConversation(contact)}
              aria-label={`Créer une conversation avec ${contact.firstName} ${contact.lastName}`}
              disabled={creatingConversation}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-[#5fa6f3]/40 hover:bg-[#5fa6f3]/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.firstName} className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5fa6f3]/15 text-sm font-bold text-[#5fa6f3]">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</p>
                  <p className="text-xs text-gray-500">
                    {contact.publicTitle || contact.role}
                    {contact.expertVerified ? ' • Verifie' : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#5fa6f3]">{contact.role}</span>
            </button>
          ))}
          {contacts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
              Aucun destinataire direct disponible pour ce role.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
