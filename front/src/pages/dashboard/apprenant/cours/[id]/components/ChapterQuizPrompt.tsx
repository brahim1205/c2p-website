import type { Lesson } from '../types';

interface ChapterQuizPromptProps {
  nextQuiz: Lesson | null;
  showInstructorQuestion: boolean;
  instructorQuestion: string;
  questionSent: boolean;
  questionError: string;
  questionSubmitting: boolean;
  onToggleInstructorQuestion: () => void;
  onInstructorQuestionChange: (value: string) => void;
  onSubmitInstructorQuestion: () => void;
  onSelectLesson: (lesson: Lesson) => void;
}

export default function ChapterQuizPrompt({
  nextQuiz,
  showInstructorQuestion,
  instructorQuestion,
  questionSent,
  questionError,
  questionSubmitting,
  onToggleInstructorQuestion,
  onInstructorQuestionChange,
  onSubmitInstructorQuestion,
  onSelectLesson,
}: ChapterQuizPromptProps) {
  if (!nextQuiz) return null;

  return (
    <div className="mx-6 mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700">
            <i className="ri-checkbox-circle-line text-xl"></i>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-950">Quiz de fin de chapitre</p>
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
              {nextQuiz.quizRequired
                ? 'Ce quiz est requis pour valider le chapitre.'
                : 'Ce quiz est facultatif. Il sert surtout à tester votre compréhension avant de continuer.'}
            </p>
            <button
              type="button"
              onClick={onToggleInstructorQuestion}
              className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              Poser une question au formateur
            </button>
          </div>
        </div>
        <div className="w-full md:w-64">
          <button
            onClick={() => onSelectLesson(nextQuiz)}
            className="w-full rounded-xl bg-slate-950 px-5 py-4 text-base font-bold leading-6 text-white hover:bg-slate-800"
          >
            Tester mes connaissances
          </button>
        </div>
      </div>

      {showInstructorQuestion ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm leading-6 text-slate-600">
            Votre question sera liée à ce chapitre et visible côté formateur dans Communauté.
          </p>
          {questionSent ? (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Question envoyée au formateur.
            </div>
          ) : null}
          {questionError ? (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {questionError}
            </div>
          ) : null}
          <textarea
            value={instructorQuestion}
            onChange={(event) => onInstructorQuestionChange(event.target.value)}
            rows={3}
            placeholder="Ex: Pouvez-vous réexpliquer cette partie avec un exemple ?"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onSubmitInstructorQuestion}
              disabled={!instructorQuestion.trim() || questionSubmitting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {questionSubmitting ? 'Envoi...' : 'Envoyer la question'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
