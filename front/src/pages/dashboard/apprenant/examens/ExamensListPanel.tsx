import { SkeletonList } from '@/components/base/Skeleton';
import type { ApprenantSubmission as Submission } from '@/lib/apprenantDashboardApi';
import {
  getStatusClass,
  getStatusLabel,
  getTypeLabel,
  type ExamFilter,
  type ExamWithStatus,
} from './examensModel';

interface ExamStats {
  total: number;
  todo: number;
  pending: number;
  graded: number;
}

interface ExamensListPanelProps {
  loading: boolean;
  filter: ExamFilter;
  stats: ExamStats;
  exams: ExamWithStatus[];
  submissions: Submission[];
  onFilterChange: (filter: ExamFilter) => void;
  onOpenSubmit: (exam: ExamWithStatus) => void;
  onSelectResult: (submission: Submission) => void;
}

const FILTERS: Array<{ id: ExamFilter; label: string; countKey: keyof ExamStats }> = [
  { id: 'all', label: 'Tous', countKey: 'total' },
  { id: 'todo', label: 'À faire', countKey: 'todo' },
  { id: 'pending', label: 'À corriger', countKey: 'pending' },
  { id: 'graded', label: 'Corrigés', countKey: 'graded' },
];

export function ExamensListPanel({
  loading,
  filter,
  stats,
  exams,
  submissions,
  onFilterChange,
  onOpenSubmit,
  onSelectResult,
}: ExamensListPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      <div className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Examens disponibles</h2>
          <p className="text-sm text-gray-500">Cliquez sur une action pour répondre ou consulter le résultat.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                filter === item.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label} ({stats[item.countKey]})
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <SkeletonList count={3} />
      ) : exams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun examen dans ce filtre.</p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {exams.map((exam) => {
            const quizReady = exam.type !== 'quiz' || (exam.questions_count ?? 0) > 0;
            const submission = submissions.find((entry) => String(entry.exam_id) === String(exam.id));
            return (
              <article key={String(exam.id)} className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{getTypeLabel(exam.type)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(exam.myStatus)}`}>
                        {getStatusLabel(exam.myStatus)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{exam.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{exam.course_name || 'Formation'}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold text-gray-900">{exam.myGrade !== null ? `${exam.myGrade}/${exam.max_grade}` : `${exam.max_grade} pts`}</p>
                    <p className="text-gray-500">{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('fr-FR') : 'Sans date'}</p>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-600">
                  {exam.type === 'quiz' && (
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                      {exam.questions_count || 0} question{(exam.questions_count || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {(exam.attachments?.length ?? 0) > 0 && (
                    <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-700">
                      {exam.attachments?.length} fichier{(exam.attachments?.length ?? 0) > 1 ? 's' : ''} joint{(exam.attachments?.length ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {submission?.submitted_at && (
                    <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-700">
                      Soumis le {new Date(submission.submitted_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>

                {exam.instructions ? (
                  <p className="mb-4 line-clamp-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700">
                    {exam.instructions}
                  </p>
                ) : (
                  <div className="mb-4 flex-1 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                    Aucune consigne détaillée.
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    {exam.myStatus === 'pending' && 'Votre réponse attend une correction.'}
                    {exam.myStatus === 'graded' && 'Le résultat est disponible.'}
                    {!exam.submitted && quizReady && 'Prêt à être traité.'}
                    {!quizReady && 'Quiz en cours de configuration.'}
                  </div>
                  {!exam.submitted ? (
                    <button
                      type="button"
                      onClick={() => onOpenSubmit(exam)}
                      disabled={!quizReady}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                    >
                      {exam.type === 'quiz' ? 'Démarrer le quiz' : 'Déposer ma réponse'}
                    </button>
                  ) : submission?.status === 'graded' ? (
                    <button
                      type="button"
                      onClick={() => onSelectResult(submission)}
                      className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
                    >
                      Voir résultat
                    </button>
                  ) : (
                    <span className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">En attente</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
