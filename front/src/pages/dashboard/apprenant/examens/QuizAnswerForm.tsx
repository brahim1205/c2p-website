import { SkeletonList } from '@/components/base/Skeleton';
import type {
  ApprenantQuizChoice as QuizChoice,
  ApprenantQuizQuestion as QuizQuestion,
} from '@/lib/apprenantDashboardApi';
import {
  getQuestionTypeLabel,
  isSingleAnswerType,
  orderByPosition,
  type EntityId,
  type QuizAnswerDraft,
} from './examensModel';

interface QuizAnswerFormProps {
  loading: boolean;
  hasError: boolean;
  questions: QuizQuestion[];
  choicesByQuestion: Map<string, QuizChoice[]>;
  drafts: Record<string, QuizAnswerDraft>;
  onRetry: () => void;
  onChoiceToggle: (question: QuizQuestion, choiceId: EntityId, checked: boolean) => void;
  onOpenAnswerChange: (question: QuizQuestion, value: string) => void;
}

export function QuizAnswerForm({
  loading,
  hasError,
  questions,
  choicesByQuestion,
  drafts,
  onRetry,
  onChoiceToggle,
  onOpenAnswerChange,
}: QuizAnswerFormProps) {
  if (loading) {
    return <SkeletonList count={3} />;
  }

  if (hasError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">Impossible de charger les questions du quiz.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((question, index) => {
        const draft = drafts[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
        const questionChoices = orderByPosition(choicesByQuestion.get(String(question.id)) ?? []);
        return (
          <div key={String(question.id)} className="border border-gray-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                Question {index + 1}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                {getQuestionTypeLabel(question.type)}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                {question.points} point{question.points > 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-900">{question.prompt}</div>
            {question.explanation && (
              <p className="text-xs text-gray-500 mt-1">{question.explanation}</p>
            )}
            {question.type === 'open' ? (
              <textarea
                value={draft.answer_text}
                onChange={(event) => onOpenAnswerChange(question, event.target.value)}
                rows={5}
                maxLength={5000}
                placeholder="Écrivez votre réponse..."
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm resize-none"
              />
            ) : (
              <div className="mt-3 space-y-2">
                {questionChoices.map((choice) => {
                  const checked = draft.selected_choice_ids.includes(String(choice.id));
                  return (
                    <label key={String(choice.id)} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors cursor-pointer">
                      <input
                        type={isSingleAnswerType(question.type) ? 'radio' : 'checkbox'}
                        name={`question-${String(question.id)}`}
                        checked={checked}
                        onChange={(event) => onChoiceToggle(question, choice.id, event.target.checked)}
                        className="mt-0.5 w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-800">{choice.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
