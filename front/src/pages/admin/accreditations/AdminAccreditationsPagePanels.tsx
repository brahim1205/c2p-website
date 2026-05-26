import type { AdminAccreditation } from '@/lib/adminApi';
import { AdminAccreditationCard } from './AdminAccreditationCard';
import { statusLabels, type AccreditationStatus } from './adminAccreditationUi';

type AccreditationCounts = Record<AccreditationStatus, number>;

interface AdminAccreditationsHeroProps {
  activeTab: AccreditationStatus;
  counts: AccreditationCounts;
  onSelectTab: (status: AccreditationStatus) => void;
}

interface AdminAccreditationsSearchProps {
  activeTab: AccreditationStatus;
  resultCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

interface AdminAccreditationsListProps {
  activeTab: AccreditationStatus;
  counts: AccreditationCounts;
  items: AdminAccreditation[];
  loading: boolean;
  onApprove: (item: AdminAccreditation) => void;
  onOpenDocs: (item: AdminAccreditation) => void;
  onOpenReject: (item: AdminAccreditation) => void;
  onPreviewDocument: (item: AdminAccreditation, doc: string) => void;
  onSelectTab: (status: AccreditationStatus) => void;
}

interface DocumentsModalProps {
  accreditation: AdminAccreditation;
  onClose: () => void;
  onPreviewDocument: (item: AdminAccreditation, doc: string) => void;
}

interface RejectReasonModalProps {
  accreditation: AdminAccreditation;
  rejectReason: string;
  onCancel: () => void;
  onChangeRejectReason: (value: string) => void;
  onConfirm: () => void;
}

const accreditationStatuses: AccreditationStatus[] = ['pending', 'approved', 'rejected'];

export function AdminAccreditationsHero({ activeTab, counts, onSelectTab }: AdminAccreditationsHeroProps) {
  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-600">Vérification prestataires</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Gestion des accréditations</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 md:text-base">
            Consultez les justificatifs, validez les profils éligibles et conservez un motif clair en cas de rejet.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-gray-50 p-2 text-center">
          {accreditationStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onSelectTab(status)}
              className={`rounded-xl px-4 py-3 text-sm transition-colors ${
                activeTab === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="block text-lg font-bold">{counts[status]}</span>
              <span className="block whitespace-nowrap text-xs font-medium">{statusLabels[status]}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminAccreditationsSearch({
  activeTab,
  resultCount,
  searchQuery,
  onSearchChange,
}: AdminAccreditationsSearchProps) {
  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <i className="ri-search-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher par nom, métier, expérience ou motif..."
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/10"
          />
        </div>
        <p className="text-sm text-gray-500">
          {resultCount} dossier(s) dans "{statusLabels[activeTab].toLowerCase()}"
        </p>
      </div>
    </section>
  );
}

export function AdminAccreditationsList({
  activeTab,
  counts,
  items,
  loading,
  onApprove,
  onOpenDocs,
  onOpenReject,
  onPreviewDocument,
  onSelectTab,
}: AdminAccreditationsListProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {accreditationStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onSelectTab(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === status ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {statusLabels[status]} ({counts[status]})
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {loading && (
          <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center text-sm text-gray-500">
            Chargement des dossiers...
          </div>
        )}

        {!loading && items.length === 0 && <EmptyAccreditations />}

        {!loading && items.length > 0 && (
          <div className="grid gap-4">
            {items.map((item) => (
              <AdminAccreditationCard
                key={item.id}
                item={item}
                onApprove={onApprove}
                onOpenDocs={onOpenDocs}
                onOpenReject={onOpenReject}
                onPreviewDocument={onPreviewDocument}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function AdminAccreditationDocumentsModal({
  accreditation,
  onClose,
  onPreviewDocument,
}: DocumentsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/55 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-600">Dossier d'accréditation</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">{accreditation.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{accreditation.profession} - {accreditation.experience}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {accreditation.documents.map((doc) => (
            <button
              key={doc}
              type="button"
              onClick={() => onPreviewDocument(accreditation, doc)}
              className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-left hover:border-teal-200 hover:bg-teal-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <i className="ri-file-text-line"></i>
                </span>
                <span className="truncate text-sm font-medium text-gray-900">{doc}</span>
              </span>
              <span className="text-sm font-semibold text-teal-700">Consulter</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminAccreditationRejectModal({
  accreditation,
  rejectReason,
  onCancel,
  onChangeRejectReason,
  onConfirm,
}: RejectReasonModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Rejeter le dossier</h3>
            <p className="mt-1 text-sm text-gray-500">{accreditation.name}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <label className="mt-5 block text-sm font-medium text-gray-700" htmlFor="reject-reason">
          Motif obligatoire
        </label>
        <textarea
          id="reject-reason"
          rows={4}
          value={rejectReason}
          onChange={(event) => onChangeRejectReason(event.target.value)}
          placeholder="Expliquez le motif du rejet..."
          className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
        />
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!rejectReason.trim()}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyAccreditations() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
        <i className="ri-shield-check-line text-xl"></i>
      </div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">Aucun dossier trouvé</h2>
      <p className="mt-1 text-sm text-gray-500">Modifiez la recherche ou changez de statut.</p>
    </div>
  );
}
