import { SkeletonList } from '@/components/base/Skeleton';
import {
  formatExamGrade,
  getExamTypeLabel,
  type Exam,
  type Submission,
} from './evaluationModel';
import EvaluationStatusBadge from './EvaluationStatusBadge';

interface ExamsTableProps {
  exams: Exam[];
  loading: boolean;
  onConfigureQuiz: (exam: Exam) => void;
  onDeleteExam: (exam: Exam) => void;
}

export function ExamsTable({ exams, loading, onConfigureQuiz, onDeleteExam }: ExamsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Examen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Participants</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Moyenne</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map((exam) => (
                <tr key={String(exam.id)} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{exam.title}</div>
                    {exam.type === 'quiz' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {exam.questions_count || 0} question{(exam.questions_count || 0) > 1 ? 's' : ''} • note max {exam.max_grade}
                      </div>
                    )}
                    {(exam.attachments?.length ?? 0) > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {exam.attachments?.length} fichier{(exam.attachments?.length ?? 0) > 1 ? 's' : ''} joint{(exam.attachments?.length ?? 0) > 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{exam.course_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                      {getExamTypeLabel(exam.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{exam.exam_date || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {exam.submitted}/{exam.participants}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatExamGrade(exam.avg_grade, exam.max_grade)}
                  </td>
                  <td className="px-4 py-3">
                    <EvaluationStatusBadge status={exam.status} kind="exam" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {exam.type === 'quiz' && (
                        <button
                          title="Configurer le quiz"
                          aria-label={`Configurer le quiz ${exam.title}`}
                          onClick={() => onConfigureQuiz(exam)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <i className="ri-list-check-3 text-teal-600 text-sm"></i>
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteExam(exam)}
                        title="Supprimer l'examen"
                        aria-label={`Supprimer l'examen ${exam.title}`}
                        className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <i className="ri-delete-bin-line text-red-500 text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {exams.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun examen. Créez-en un avec le bouton ci-dessus.</p>
        </div>
      )}
    </div>
  );
}

interface SubmissionsTableProps {
  submissions: Submission[];
  exams: Exam[];
  loading: boolean;
  onGrade: (submission: Submission) => void;
}

export function SubmissionsTable({ submissions, exams, loading, onGrade }: SubmissionsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Apprenant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Examen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date de soumission</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contenu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((submission) => {
                const submissionExam = exams.find((exam) => String(exam.id) === String(submission.exam_id));
                const hasStructuredAnswers = Array.isArray(submission.answers) && submission.answers.length > 0;
                return (
                  <tr key={String(submission.id)} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {submission.student_avatar ? (
                          <img src={submission.student_avatar} alt={submission.student_name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                            {submission.student_name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900 text-sm">{submission.student_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{submissionExam?.title || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(submission.submitted_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      {hasStructuredAnswers ? (
                        <span className="text-sm text-gray-600">Réponses intégrées</span>
                      ) : submission.file_name ? (
                        <button
                          onClick={() => submission.file_url && window.open(submission.file_url, '_blank', 'noopener,noreferrer')}
                          className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                        >
                          <i className="ri-file-download-line"></i>
                          {submission.file_name}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatExamGrade(submission.grade, submissionExam?.max_grade || 20)}
                    </td>
                    <td className="px-4 py-3">
                      <EvaluationStatusBadge status={submission.status} kind="submission" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onGrade(submission)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          submission.status === 'pending'
                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {submission.status === 'pending' ? 'Corriger' : 'Modifier'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {submissions.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucune soumission pour le moment.</p>
        </div>
      )}
    </div>
  );
}
