import type { AdminAccreditation } from '@/lib/adminApi';
import { formatDate } from '@/lib/formatters';
import { getInitials, getStatusBadge } from './adminAccreditationUi';

interface AdminAccreditationCardProps {
  item: AdminAccreditation;
  onApprove: (item: AdminAccreditation) => void;
  onOpenDocs: (item: AdminAccreditation) => void;
  onOpenReject: (item: AdminAccreditation) => void;
  onPreviewDocument: (item: AdminAccreditation, doc: string) => void;
}

export function AdminAccreditationCard({
  item,
  onApprove,
  onOpenDocs,
  onOpenReject,
  onPreviewDocument,
}: AdminAccreditationCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="flex min-w-0 gap-4">
          {item.avatar ? (
            <img src={item.avatar} alt={item.name} className="h-16 w-16 flex-none rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-teal-50 text-sm font-bold text-teal-700">
              {getInitials(item.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-gray-900">{item.name}</h3>
              {getStatusBadge(item.status)}
            </div>

            <div className="mt-3 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
              <DetailChip label="Profession" value={item.profession} />
              <DetailChip label="Expérience" value={item.experience} />
              <DetailChip label="Dépôt" value={formatDate(item.date)} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Documents</span>
              {item.documents.map((doc) => (
                <button
                  key={doc}
                  type="button"
                  onClick={() => onPreviewDocument(item, doc)}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                >
                  {doc}
                </button>
              ))}
            </div>

            {item.notes && (
              <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">{item.notes}</p>
            )}
            {item.reject_reason && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Motif: {item.reject_reason}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button
            type="button"
            onClick={() => onOpenDocs(item)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <i className="ri-folder-open-line"></i>
            Dossier
          </button>
          {item.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => void onApprove(item)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <i className="ri-check-line"></i>
                Approuver
              </button>
              <button
                type="button"
                onClick={() => onOpenReject(item)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                <i className="ri-close-line"></i>
                Rejeter
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <span className="block text-xs font-medium text-gray-500">{label}</span>
      <strong className="mt-1 block font-semibold text-gray-900">{value}</strong>
    </div>
  );
}
