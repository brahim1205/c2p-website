import EvaluationStatusBadge from './EvaluationStatusBadge';
import {
  getDocumentSubmissionUrl,
  getFieldClass,
  getQuestionTypeLabel,
  getTextSubmissionContent,
  sameSelection,
  type Exam,
  type GradeFormErrors,
  type QuizAnswer,
  type QuizChoice,
  type QuizQuestion,
  type Submission,
} from './evaluationModel';

export interface GradeSubmissionModalProps {
  submission: Submission;
  exam: Exam | null;
  examMaxGrade: number;
  questions: QuizQuestion[];
  choicesByQuestion: Map<string, QuizChoice[]>;
  answers: QuizAnswer[];
  suggestedGrade: number | null;
  gradeValue: string;
  feedbackValue: string;
  errors: GradeFormErrors;
  message: string | null;
  isGrading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onUseSuggestedGrade: () => void;
  onGradeValueChange: (value: string) => void;
  onFeedbackValueChange: (value: string) => void;
}

export default function GradeSubmissionModal({
  submission,
  exam,
  examMaxGrade,
  questions,
  choicesByQuestion,
  answers,
  suggestedGrade,
  gradeValue,
  feedbackValue,
  errors,
  message,
  isGrading,
  onClose,
  onConfirm,
  onUseSuggestedGrade,
  onGradeValueChange,
  onFeedbackValueChange,
}: GradeSubmissionModalProps) {
  const textSubmission = getTextSubmissionContent(submission);
  const documentSubmissionUrl = getDocumentSubmissionUrl(submission);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="grade-submission-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <EvaluationStatusBadge status={submission.status} kind="submission" />
              <span className="text-xs text-gray-500">
                Soumis le {new Date(submission.submitted_at).toLocaleString('fr-FR')}
              </span>
            </div>
            <h3 id="grade-submission-title" className="text-xl font-bold text-gray-900">
              Lire puis corriger le travail de {submission.student_name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{exam?.title || '-'}</p>
          </div>
          <button
            type="button"
            aria-label="Fermer la correction"
            onClick={onClose}
            disabled={isGrading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {message ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Étape 1</p>
                    <h4 className="text-sm font-semibold text-gray-900">Lire la réponse de l’étudiant</h4>
                  </div>
                  {submission.file_name ? <span className="text-xs text-gray-500">{submission.file_name}</span> : null}
                </div>
                {textSubmission ? (
                  <p className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-700">
                    {textSubmission}
                  </p>
                ) : documentSubmissionUrl ? (
                  <button
                    type="button"
                    onClick={() => window.open(documentSubmissionUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50"
                  >
                    <i className="ri-file-download-line"></i>
                    Ouvrir le devoir remis par l’étudiant
                  </button>
                ) : answers.length > 0 ? (
                  <p className="text-sm text-gray-600">Cette soumission contient les réponses du quiz à lire ci-dessous.</p>
                ) : (
                  <p className="text-sm text-gray-500">Aucun contenu joint à cette soumission.</p>
                )}
              </div>

              {answers.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Travail rendu question par question</h4>
                      <p className="mt-1 text-xs text-gray-500">Comparez la réponse de l’étudiant avec l’attendu avant de noter.</p>
                    </div>
                    {suggestedGrade != null ? (
                      <button
                        type="button"
                        onClick={onUseSuggestedGrade}
                        className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                      >
                        Utiliser la suggestion {suggestedGrade}/{examMaxGrade}
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    {answers.map((answer, index) => {
                      const question = questions.find((entry) => String(entry.id) === String(answer.question_id));
                      const relatedChoices = choicesByQuestion.get(String(answer.question_id)) ?? [];
                      const selectedChoiceIds = answer.selected_choice_ids.map(String);
                      const correctChoiceIds = relatedChoices.filter((choice) => choice.is_correct).map((choice) => String(choice.id));
                      const selectedLabels = relatedChoices
                        .filter((choice) => selectedChoiceIds.includes(String(choice.id)))
                        .map((choice) => choice.label);
                      const correctLabels = relatedChoices
                        .filter((choice) => correctChoiceIds.includes(String(choice.id)))
                        .map((choice) => choice.label);
                      const isOpenQuestion = answer.question_type === 'open';
                      const isCorrect = !isOpenQuestion && correctChoiceIds.length > 0 && sameSelection(selectedChoiceIds, correctChoiceIds);

                      return (
                        <div key={`${String(answer.question_id)}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {index + 1}. {answer.question_prompt}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {getQuestionTypeLabel(answer.question_type)}
                                {question?.points ? ` · ${question.points} point${question.points > 1 ? 's' : ''}` : ''}
                              </div>
                            </div>
                            {isOpenQuestion ? (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">À apprécier</span>
                            ) : (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {isCorrect ? 'Correct' : 'À revoir'}
                              </span>
                            )}
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Réponse de l’étudiant</div>
                              <div className="text-sm text-gray-800">
                                {isOpenQuestion
                                  ? (answer.answer_text || 'Aucune réponse')
                                  : selectedLabels.length > 0
                                    ? selectedLabels.join(', ')
                                    : 'Aucune réponse'}
                              </div>
                            </div>
                            {!isOpenQuestion && (
                              <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Attendu</div>
                                <div className="text-sm text-gray-800">
                                  {correctLabels.length > 0 ? correctLabels.join(', ') : 'Aucune bonne réponse configurée'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Étape 2</p>
              <h4 className="mb-4 mt-1 text-sm font-semibold text-gray-900">Corriger et publier la note</h4>
              {suggestedGrade != null ? (
                <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Suggestion automatique</p>
                  <p className="mt-1 text-2xl font-bold text-teal-800">{suggestedGrade}/{examMaxGrade}</p>
                  <p className="mt-1 text-xs text-teal-700">Basée sur les questions fermées uniquement.</p>
                </div>
              ) : null}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Note (/{examMaxGrade})</label>
                  <input
                    type="number"
                    min="0"
                    max={String(examMaxGrade)}
                    step="0.5"
                    value={gradeValue}
                    onChange={(event) => onGradeValueChange(event.target.value)}
                    placeholder="Ex: 16.5"
                    aria-invalid={Boolean(errors.gradeValue)}
                    className={getFieldClass(Boolean(errors.gradeValue))}
                  />
                  {errors.gradeValue ? <p className="mt-1 text-xs text-red-600">{errors.gradeValue}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Commentaire pour l’apprenant</label>
                  <textarea
                    value={feedbackValue}
                    onChange={(event) => onFeedbackValueChange(event.target.value)}
                    placeholder="Expliquez la note, les points forts et les corrections attendues..."
                    rows={7}
                    maxLength={500}
                    aria-invalid={Boolean(errors.feedbackValue)}
                    className={`${getFieldClass(Boolean(errors.feedbackValue))} resize-none`}
                  />
                  <p className="mt-1 text-xs text-gray-500">{feedbackValue.length}/500 caractères</p>
                  {errors.feedbackValue ? <p className="mt-1 text-xs text-red-600">{errors.feedbackValue}</p> : null}
                </div>
              </div>
              <div className="mt-6 grid gap-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isGrading}
                  className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGrading ? 'Enregistrement...' : 'Publier la correction'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGrading}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Fermer
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
