import { useMemo, useState } from 'react';
import type { PublicContactSubmission } from '@/lib/communicationsApi';
import { formatRelativeDate } from './adminMessagesModel';
import type { useAdminMessagesSession } from './useAdminMessagesSession';

type AdminMessagesSession = ReturnType<typeof useAdminMessagesSession>;

export default function AdminMessagesExternalPanel({ session }: { session: AdminMessagesSession }) {
  const [filter, setFilter] = useState<'all' | 'new' | 'handled'>('new');
  const counts = useMemo(() => ({
    all: session.publicRequests.length,
    new: session.publicRequests.filter((item) => item.status === 'new').length,
    handled: session.publicRequests.filter((item) => item.status !== 'new').length,
  }), [session.publicRequests]);
  const filteredRequests = useMemo(() => {
    return session.publicRequests
      .filter((item) => filter === 'all' || (filter === 'new' ? item.status === 'new' : item.status !== 'new'))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'new' ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [filter, session.publicRequests]);

  return (
    <div className="space-y-4" role="tabpanel" id="admin-messages-panel-external" aria-labelledby="admin-messages-tab-external">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Demandes du formulaire public</h2>
            <p className="mt-1 text-sm text-gray-500">Les nouvelles demandes restent prioritaires jusqu'à traitement.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['new', 'Nouvelles'],
              ['handled', 'Traitées'],
              ['all', 'Toutes'],
            ] as Array<[typeof filter, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === key ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {label} ({counts[key]})
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Aucune demande dans ce filtre.
        </div>
      ) : (
        filteredRequests.map((submission) => (
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
