import { SkeletonList } from '@/components/base/Skeleton';
import type { ApprenantSubmission as Submission } from '@/lib/apprenantDashboardApi';
import {
  getStatusClass,
  getStatusLabel,
  type ExamWithStatus,
} from './examensModel';

interface ExamStats {
  total: number;
  todo: number;
  pending: number;
  graded: number;
}

interface ExamStatsCardsProps {
  stats: ExamStats;
}

interface LatestSubmissionsPanelProps {
  loading: boolean;
  submissions: Submission[];
  exams: ExamWithStatus[];
  onSelectResult: (submission: Submission) => void;
}

export function ExamStatsCards({ stats }: ExamStatsCardsProps) {
  const cards = [
    { label: 'Disponibles', value: stats.total, icon: 'ri-file-list-3-line', className: 'bg-blue-50 text-blue-700' },
    { label: 'À faire', value: stats.todo, icon: 'ri-edit-2-line', className: 'bg-teal-50 text-teal-700' },
    { label: 'À corriger', value: stats.pending, icon: 'ri-time-line', className: 'bg-amber-50 text-amber-700' },
    { label: 'Corrigés', value: stats.graded, icon: 'ri-checkbox-circle-line', className: 'bg-green-50 text-green-700' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      {cards.map((item) => (
        <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.className}`}>
            <i className={`${item.icon} text-lg`}></i>
          </div>
          <p className="text-2xl font-bold text-gray-900">{item.value}</p>
          <p className="text-sm text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function LatestSubmissionsPanel({
  loading,
  submissions,
  exams,
  onSelectResult,
}: LatestSubmissionsPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Dernières soumissions</h2>
      </div>
      {loading ? (
        <SkeletonList count={2} />
      ) : submissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune soumission pour le moment.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {submissions.map((submission) => {
            const exam = exams.find((entry) => String(entry.id) === String(submission.exam_id));
            return (
              <div key={String(submission.id)} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{exam?.title || 'Examen'}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('fr-FR') : '-'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(submission.status)}`}>
                    {getStatusLabel(submission.status)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {submission.grade !== null ? `${submission.grade}/${exam?.max_grade || 20}` : 'Note en attente'}
                  </span>
                  {submission.status === 'graded' && (
                    <button
                      type="button"
                      onClick={() => onSelectResult(submission)}
                      className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                    >
                      Voir résultat
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
