import {
  EXAM_TYPE_LABELS,
  QUESTION_TYPE_LABELS,
  isExamTypeAllowedForDelivery,
  type ExamDraft,
  type ExamType,
  type QuestionType,
} from './courseWizardModel';
import { getFieldClass } from './courseCreationFields';
import type { ChoicesEditorProps, EvaluationEditorProps, QuestionsEditorProps } from './courseCreationEvaluationsTypes';

const QUIZ_FEATURE_TOGGLES: Array<[keyof ExamDraft, string]> = [
  ['auto_correction', 'Correction automatique'],
  ['question_bank', 'Banque de questions'],
  ['ai_generation', 'Génération IA'],
  ['anti_cheat', 'Anti-triche'],
];

export default function EvaluationEditor({
  exam,
  deliveryMode,
  onUpdateExam,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddChoice,
  onUpdateChoice,
  onRemoveChoice,
}: EvaluationEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre</label>
          <input
            type="text"
            value={exam.title}
            onChange={(event) => onUpdateExam(exam.id, 'title', event.target.value)}
            placeholder="Quiz de fin de chapitre"
            className={getFieldClass(false)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
          <select
            value={exam.type}
            onChange={(event) => onUpdateExam(exam.id, 'type', event.target.value as ExamType)}
            className={getFieldClass(false)}
          >
            {Object.entries(EXAM_TYPE_LABELS).map(([value, label]) => {
              const examType = value as ExamType;
              const allowed = isExamTypeAllowedForDelivery(examType, deliveryMode);
              return (
                <option key={value} value={value} disabled={!allowed}>
                  {label}{allowed ? '' : ' - hybride/présentiel'}
                </option>
              );
            })}
          </select>
          {exam.type !== 'quiz' ? (
            <p className="mt-1 text-xs text-slate-500">
              Cette évaluation sera corrigée manuellement depuis la page Évaluations.
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={exam.exam_date}
            onChange={(event) => onUpdateExam(exam.id, 'exam_date', event.target.value)}
            className={getFieldClass(false)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Note maximale</label>
          <input
            type="number"
            min={1}
            max={100}
            value={exam.max_grade}
            onChange={(event) => onUpdateExam(exam.id, 'max_grade', Number(event.target.value) || 20)}
            className={getFieldClass(false)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Participants visés</label>
          <input
            type="number"
            min={0}
            value={exam.participants}
            onChange={(event) => onUpdateExam(exam.id, 'participants', Number(event.target.value) || 0)}
            className={getFieldClass(false)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Minuterie (min)</label>
          <input
            type="number"
            min={0}
            value={exam.timer_minutes}
            onChange={(event) => onUpdateExam(exam.id, 'timer_minutes', Number(event.target.value) || 0)}
            className={getFieldClass(false)}
          />
        </div>
      </div>

      {exam.type === 'quiz' ? (
        <div className="grid gap-2 md:grid-cols-2">
          {QUIZ_FEATURE_TOGGLES.map(([field, label]) => (
            <label key={field} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(exam[field])}
                onChange={(event) => onUpdateExam(exam.id, field, event.target.checked as never)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          Les apprenants déposeront une réponse ou un fichier. Vous verrez leurs copies dans la page Évaluations, puis vous publierez la note et le commentaire.
        </div>
      )}

      {exam.type === 'quiz' ? (
        <QuestionsEditor
          exam={exam}
          onAddQuestion={onAddQuestion}
          onUpdateQuestion={onUpdateQuestion}
          onRemoveQuestion={onRemoveQuestion}
          onAddChoice={onAddChoice}
          onUpdateChoice={onUpdateChoice}
          onRemoveChoice={onRemoveChoice}
        />
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Les quiz de fin de chapitre sont optionnels sauf si vous les marquez comme requis dans les questions.
        Les questions posées par les apprenants ne sont pas dans le lecteur comme onglet séparé : elles arrivent dans Communauté.
      </div>
    </div>
  );
}

function QuestionsEditor({
  exam,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddChoice,
  onUpdateChoice,
  onRemoveChoice,
}: QuestionsEditorProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">Questions</h4>
        <button type="button" onClick={() => onAddQuestion(exam.id)} className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-white">
          Ajouter une question
        </button>
      </div>

      <div className="space-y-4">
        {exam.questions.map((question, questionIndex) => (
          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Question {questionIndex + 1}</p>
              <button type="button" onClick={() => onRemoveQuestion(exam.id, question.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
                Supprimer
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_220px_100px]">
              <input
                type="text"
                value={question.prompt}
                onChange={(event) => onUpdateQuestion(exam.id, question.id, 'prompt', event.target.value)}
                placeholder="Intitulé de la question"
                className={getFieldClass(false)}
              />
              <select
                value={question.type}
                onChange={(event) => onUpdateQuestion(exam.id, question.id, 'type', event.target.value as QuestionType)}
                className={getFieldClass(false)}
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={100}
                value={question.points}
                onChange={(event) => onUpdateQuestion(exam.id, question.id, 'points', Number(event.target.value) || 1)}
                className={getFieldClass(false)}
              />
            </div>
            <textarea
              rows={3}
              value={question.explanation}
              onChange={(event) => onUpdateQuestion(exam.id, question.id, 'explanation', event.target.value)}
              placeholder="Explication affichée après correction ou lors du débrief."
              className={`${getFieldClass(false)} mt-3 resize-none`}
            />
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(event) => onUpdateQuestion(exam.id, question.id, 'required', event.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Réponse obligatoire
            </label>

            {question.type !== 'open' ? (
              <ChoicesEditor
                examId={exam.id}
                question={question}
                onAddChoice={onAddChoice}
                onUpdateChoice={onUpdateChoice}
                onRemoveChoice={onRemoveChoice}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoicesEditor({ examId, question, onAddChoice, onUpdateChoice, onRemoveChoice }: ChoicesEditorProps) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">Réponses proposées</p>
        <button type="button" onClick={() => onAddChoice(examId, question.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white">
          Ajouter un choix
        </button>
      </div>
      <div className="space-y-3">
        {question.choices.map((choice) => (
          <div key={choice.id} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <input
              type="text"
              value={choice.label}
              onChange={(event) => onUpdateChoice(examId, question.id, choice.id, 'label', event.target.value)}
              placeholder="Libellé"
              className={getFieldClass(false)}
            />
            <input
              type="text"
              value={choice.value}
              onChange={(event) => onUpdateChoice(examId, question.id, choice.id, 'value', event.target.value)}
              placeholder="Valeur"
              className={getFieldClass(false)}
            />
            <button
              type="button"
              aria-pressed={choice.is_correct}
              onClick={() => onUpdateChoice(examId, question.id, choice.id, 'is_correct', !choice.is_correct)}
              className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
                choice.is_correct
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-slate-200 text-slate-700 hover:bg-white'
              }`}
            >
              {choice.is_correct ? 'Réponse correcte' : 'Marquer correcte'}
            </button>
            <button type="button" onClick={() => onRemoveChoice(examId, question.id, choice.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
              Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
