import { EXAM_TYPE_LABELS } from './courseWizardModel';
import EvaluationEditor from './CourseCreationEvaluationEditor';
import type { CourseCreationEvaluationsStepProps } from './courseCreationEvaluationsTypes';

export default function CourseCreationEvaluationsStep({
  exams,
  selectedExam,
  selectedExamId,
  deliveryMode,
  restrictionMessage,
  onSelectExam,
  onAddExam,
  onUpdateExam,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddChoice,
  onUpdateChoice,
  onRemoveChoice,
}: CourseCreationEvaluationsStepProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 4</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Quiz de fin de chapitre et évaluations</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ajoutez les quiz à la fin des parties. Les ressources restent rattachées aux leçons dans l’étape Contenus.
              Les questions des apprenants seront traitées dans Communauté, puis transformées en FAQ si nécessaire.
            </p>
            {restrictionMessage ? (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {restrictionMessage}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onAddExam} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
            Ajouter une évaluation
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 text-sm font-semibold text-slate-900">Évaluations du cours</p>
            <div className="space-y-2">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => onSelectExam(exam.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                    selectedExamId === exam.id
                      ? 'border-teal-300 bg-white text-slate-900'
                      : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <p className="font-medium">{exam.title || 'Évaluation sans titre'}</p>
                  <p className="mt-1 text-xs text-slate-400">{EXAM_TYPE_LABELS[exam.type]} · fin de chapitre · {exam.max_grade} pts</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            {selectedExam ? (
              <EvaluationEditor
                exam={selectedExam}
                deliveryMode={deliveryMode}
                onUpdateExam={onUpdateExam}
                onAddQuestion={onAddQuestion}
                onUpdateQuestion={onUpdateQuestion}
                onRemoveQuestion={onRemoveQuestion}
                onAddChoice={onAddChoice}
                onUpdateChoice={onUpdateChoice}
                onRemoveChoice={onRemoveChoice}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <i className="ri-questionnaire-line text-2xl"></i>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">Aucune évaluation configurée</p>
                <p className="mt-1 text-xs text-slate-500">Ajoutez un quiz de fin de chapitre si vous voulez tester les connaissances.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
