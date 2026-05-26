import { Link } from 'react-router-dom';
import { SkeletonList } from '@/components/base/Skeleton';
import {
  getExamTypeLabel,
  type Exam,
  type ExamWithInsights,
} from './formateurDashboardModel';
import { MetricTile } from './FormateurDashboardShared';

export function EvaluationsPanel({
  loading,
  examsWithInsights,
  quizExams,
  pendingCorrectionsCount,
}: {
  loading: boolean;
  examsWithInsights: ExamWithInsights[];
  quizExams: Exam[];
  pendingCorrectionsCount: number;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Quiz & évaluations</h2>
          <p className="text-sm text-gray-500">Configuration des quiz et charge de correction.</p>
        </div>
        <Link to="/dashboard/formateur/evaluations" className="text-sm font-medium text-teal-600 hover:text-teal-700">
          Voir toutes les évaluations
        </Link>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricTile label="Quiz configurés" value={`${quizExams.filter((exam) => (exam.questions_count || 0) > 0).length}/${quizExams.length}`} />
          <MetricTile label="Corrections en attente" value={pendingCorrectionsCount} />
          <MetricTile label="Examens actifs" value={examsWithInsights.filter((exam) => exam.status === 'ongoing').length} />
          <MetricTile label="Auto-corrigeables" value={quizExams.filter((exam) => exam.auto_gradable).length} />
        </div>
      )}

      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <div className="space-y-4">
          {examsWithInsights.slice(0, 5).map((exam) => (
            <ExamInsightCard key={exam.id} exam={exam} />
          ))}

          {examsWithInsights.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Aucune évaluation créée pour le moment.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ExamInsightCard({ exam }: { exam: ExamWithInsights }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-gray-900">{exam.title}</p>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {getExamTypeLabel(exam.type)}
            </span>
          </div>
          <p className="text-sm text-gray-600">{exam.course_name || 'Formation'}</p>
        </div>
        <span className="text-sm font-semibold text-gray-900">{exam.submitted || 0} soumission(s)</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <MetricTile label="Questions" value={exam.questions_count || 0} />
        <MetricTile label="Ouvertes" value={exam.open_questions_count || 0} />
        <MetricTile label="En attente" value={exam.pendingCorrections} />
        <MetricTile label="Note moyenne" value={exam.avg_grade ?? '-'} />
      </div>

      {(exam.type === 'quiz' && (exam.questions_count || 0) === 0) ? (
        <p className="text-sm text-amber-700 mt-3">Quiz non configuré: ajoutez les questions avant de le diffuser.</p>
      ) : null}
    </div>
  );
}
