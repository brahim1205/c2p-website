import type { ApprenantSubmission as Submission } from '@/lib/apprenantDashboardApi';
import type { ExamWithStatus } from './examensModel';

interface ExamResultModalProps {
  submission: Submission;
  exams: ExamWithStatus[];
  onClose: () => void;
}

export function ExamResultModal({ submission, exams, onClose }: ExamResultModalProps) {
  const exam = exams.find((entry) => String(entry.id) === String(submission.exam_id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="quiz-result-title" className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
          <div>
            <h3 id="quiz-result-title" className="text-lg font-bold text-gray-900">Résultat de l'examen</h3>
            <p className="text-sm text-gray-600 mt-1">
              Note : {submission.grade ?? '-'}/{exam?.max_grade || 20}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer le résultat"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <div className="p-6 space-y-3">
          {submission.feedback && (
            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Retour du formateur</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">{submission.feedback}</p>
            </div>
          )}
          {submission.file_url && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Votre dépôt</p>
              {submission.file_url.startsWith('/uploads/') || submission.file_url.startsWith('http') ? (
                <a
                  href={submission.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-teal-700 ring-1 ring-gray-200 hover:ring-teal-300"
                >
                  <i className="ri-attachment-2"></i>
                  {submission.file_name || 'Ouvrir le fichier'}
                </a>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">{submission.file_url}</p>
              )}
            </div>
          )}
          {(submission.answers || []).length === 0 && !submission.feedback && !submission.file_url && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Aucun détail de correction disponible.
            </div>
          )}
          {(submission.answers || []).map((answer, index) => {
            const isOpen = answer.question_type === 'open';
            return (
              <div key={`${String(answer.question_id)}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{index + 1}. {answer.question_prompt}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {answer.points != null ? `${answer.earned_points ?? 0}/${answer.points} point${answer.points > 1 ? 's' : ''}` : 'Question'}
                    </p>
                  </div>
                  {isOpen ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">À corriger</span>
                  ) : answer.is_correct ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Juste</span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Faux</span>
                  )}
                </div>
                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Votre réponse</p>
                    <p className="text-sm text-gray-800">
                      {isOpen
                        ? (answer.answer_text || 'Aucune réponse')
                        : (answer.selected_choice_labels || []).length > 0
                          ? answer.selected_choice_labels?.join(', ')
                          : 'Aucune réponse'}
                    </p>
                  </div>
                  {!isOpen && (
                    <div className="rounded-lg bg-white border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Bonne réponse</p>
                      <p className="text-sm text-gray-800">
                        {(answer.correct_choice_labels || []).length > 0 ? answer.correct_choice_labels?.join(', ') : 'Non configurée'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
