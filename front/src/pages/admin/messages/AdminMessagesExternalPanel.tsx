import type { PublicContactSubmission } from '@/lib/communicationsApi';
import { formatRelativeDate } from './adminMessagesModel';
import type { useAdminMessagesSession } from './useAdminMessagesSession';

type AdminMessagesSession = ReturnType<typeof useAdminMessagesSession>;

export default function AdminMessagesExternalPanel({ session }: { session: AdminMessagesSession }) {
  return (
    <div className="space-y-4" role="tabpanel" id="admin-messages-panel-external" aria-labelledby="admin-messages-tab-external">
      {session.publicRequests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Aucune demande externe pour le moment.
        </div>
      ) : (
        session.publicRequests.map((submission) => (
          <PublicSubmissionCard key={submission.id} submission={submission} session={session} />
        ))
      )}
    </div>
  );
}

function PublicSubmissionCard({ submission, session }: { submission: PublicContactSubmission; session: AdminMessagesSession }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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
            {submission.handledAt ? <span><i className="ri-check-line mr-1"></i>Traite le {formatRelativeDate(submission.handledAt)}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href={`mailto:${submission.email}?subject=${encodeURIComponent(`Re: ${submission.subject}`)}`} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Repondre par email
          </a>
          {submission.status === 'new' ? (
            <button
              type="button"
              aria-label={`Marquer comme traitee la demande de ${submission.firstName} ${submission.lastName}`}
              onClick={() => void session.handleMarkHandled(submission)}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Marquer traite
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
