import { QuizQuestion } from '../types';

interface QuizQuestionFormProps {
  title: string;
  questions: QuizQuestion[];
  answers: Record<number, number>;
  attemptNumber: number;
  showExplanation: Record<number, boolean>;
  onAnswer: (questionId: number, optionIndex: number) => void;
  onToggleExplanation: (questionId: number) => void;
  onSubmitRequest: () => void;
}

export default function QuizQuestionForm({
  title,
  questions,
  answers,
  attemptNumber,
  showExplanation,
  onAnswer,
  onToggleExplanation,
  onSubmitRequest,
}: QuizQuestionFormProps) {
  const answeredCount = Object.keys(answers).length;
  const missingCount = questions.length - answeredCount;

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-teal-700">Quiz de chapitre</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
          Tester vos connaissances sur {title}
        </h2>
      </div>

      <div className="w-full min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white">
        <section className="border-b border-slate-200 px-5 py-7 sm:px-8">
          <h3 className="text-2xl font-bold text-slate-950">Compétences évaluées</h3>
          <div className="mt-3 border-t border-slate-200 pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 text-slate-600">
                <i className="ri-lightbulb-line"></i>
              </div>
              <p className="pt-1 text-base text-slate-800">
                Comprendre les notions clés du chapitre et les appliquer dans une situation professionnelle.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 px-8 py-7">
          <h3 className="text-2xl font-bold text-slate-950">Description</h3>
          <div className="mt-3 border-t border-slate-200 pt-6">
            <p className="text-base leading-8 text-slate-800">
              Répondez aux questions ci-dessous pour vérifier votre compréhension. Ce quiz est corrigé
              automatiquement : une réponse juste est validée, une réponse fausse est signalée après validation.
            </p>
            <div className="mt-5 bg-sky-50 px-5 py-4 text-sm text-sky-950 sm:px-6">
              <i className="ri-information-line mr-2 text-sky-600"></i>
              Tentative #{attemptNumber} · {questions.length} questions · vous devez répondre à toutes les questions pour valider.
            </div>
          </div>
        </section>

        <section className="px-5 py-7 sm:px-8">
          {questions.map((question, idx) => (
            <div key={question.id} className="border-b border-slate-200 py-8 last:border-b-0">
              <h3 className="text-2xl font-bold text-slate-500">Question {idx + 1}</h3>
              <div className="mt-3 border-t border-slate-200 pt-5">
                <p className="text-lg font-semibold leading-7 text-slate-950">{question.question}</p>
                <div className="mt-6 min-w-0 space-y-5">
                  {question.options.map((option, optionIndex) => {
                    const checked = answers[question.id] === optionIndex;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => onAnswer(question.id, optionIndex)}
                        className="flex w-full min-w-0 cursor-pointer items-start gap-4 text-left text-base leading-7 text-slate-900 sm:text-lg"
                      >
                        <span
                          className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            checked ? 'border-slate-950 bg-slate-950' : 'border-slate-500 bg-white'
                          }`}
                        >
                          {checked ? <span className="h-2.5 w-2.5 rounded-full bg-white"></span> : null}
                        </span>
                        <span className="min-w-0 break-words">{option}</span>
                      </button>
                    );
                  })}
                </div>
                {question.explanation ? (
                  <button
                    onClick={() => onToggleExplanation(question.id)}
                    className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
                  >
                    <i className={`ri-${showExplanation[question.id] ? 'eye-off' : 'eye'}-line`}></i>
                    {showExplanation[question.id] ? 'Masquer l\'indice' : 'Afficher un indice'}
                  </button>
                ) : null}
                {showExplanation[question.id] && question.explanation ? (
                  <div className="mt-4 min-w-0 bg-orange-50 px-5 py-4 text-sm leading-6 text-orange-950">
                    <i className="ri-lightbulb-line mr-2 text-orange-500"></i>
                    {question.explanation}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </section>

        <div className="border-t border-slate-200 px-5 py-7 sm:px-8">
          {missingCount > 0 ? (
            <div className="mb-5 bg-sky-50 px-5 py-4 text-base text-sky-950 sm:px-6">
              <i className="ri-information-line mr-3 text-sky-600"></i>
              Vous devez encore répondre à {missingCount} question{missingCount > 1 ? 's' : ''}
            </div>
          ) : null}
          <button
            onClick={onSubmitRequest}
            disabled={missingCount > 0}
            className={`rounded px-6 py-3 text-base font-bold transition-colors ${
              missingCount > 0
                ? 'cursor-not-allowed bg-violet-200 text-white'
                : 'cursor-pointer bg-slate-950 text-white hover:bg-slate-800'
            }`}
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
