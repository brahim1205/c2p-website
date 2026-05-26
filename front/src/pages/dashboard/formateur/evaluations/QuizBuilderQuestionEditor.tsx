import type { Dispatch, SetStateAction } from 'react';
import {
  getQuestionTypeLabel,
  type ChoiceDraft,
  type QuestionDraft,
  type QuestionType,
  type QuizChoice,
  type QuizQuestion,
} from './evaluationModel';
import { NewQuestionForm } from './NewQuestionForm';
import { QuizChoicesEditor } from './QuizChoicesEditor';

export { NewQuestionForm };

interface QuizQuestionEditorProps {
  question: QuizQuestion;
  index: number;
  questionDraft: QuestionDraft;
  choices: QuizChoice[];
  choiceDrafts: Record<string, ChoiceDraft>;
  newChoiceDraft: ChoiceDraft;
  setQuestionDrafts: Dispatch<SetStateAction<Record<string, QuestionDraft>>>;
  setChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
  setNewChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
  onSaveQuestion: (question: QuizQuestion) => void;
  onDeleteQuestion: (question: QuizQuestion) => void;
  onMoveQuestion: (question: QuizQuestion, direction: -1 | 1) => void;
  onCreateChoice: (question: QuizQuestion) => void;
  onSaveChoice: (question: QuizQuestion, choice: QuizChoice) => void;
  onDeleteChoice: (choice: QuizChoice) => void;
  onMoveChoice: (question: QuizQuestion, choice: QuizChoice, direction: -1 | 1) => void;
}

export function QuizQuestionEditor({
  question,
  index,
  questionDraft,
  choices,
  choiceDrafts,
  newChoiceDraft,
  setQuestionDrafts,
  setChoiceDrafts,
  setNewChoiceDrafts,
  onSaveQuestion,
  onDeleteQuestion,
  onMoveQuestion,
  onCreateChoice,
  onSaveChoice,
  onDeleteChoice,
  onMoveChoice,
}: QuizQuestionEditorProps) {
  const questionId = String(question.id);
  const canAddMoreTrueFalseChoices = question.type !== 'true_false' || choices.length < 2;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              Question {index + 1}
            </span>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
              {getQuestionTypeLabel(questionDraft.type)}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {questionDraft.points} point{questionDraft.points > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuestionIconButton icon="ri-arrow-up-line" label={`Monter la question ${index + 1}`} onClick={() => onMoveQuestion(question, -1)} />
          <QuestionIconButton icon="ri-arrow-down-line" label={`Descendre la question ${index + 1}`} onClick={() => onMoveQuestion(question, 1)} />
          <button
            onClick={() => onSaveQuestion(question)}
            className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-700"
          >
            Enregistrer
          </button>
          <button
            onClick={() => onDeleteQuestion(question)}
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Intitulé</label>
          <textarea
            value={questionDraft.prompt}
            onChange={(event) => setQuestionDrafts((current) => ({
              ...current,
              [questionId]: { ...questionDraft, prompt: event.target.value },
            }))}
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              value={questionDraft.type}
              onChange={(event) => setQuestionDrafts((current) => ({
                ...current,
                [questionId]: { ...questionDraft, type: event.target.value as QuestionType },
              }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="single_choice">Choix unique</option>
              <option value="multiple_choice">Choix multiples</option>
              <option value="true_false">Vrai/Faux</option>
              <option value="open">Réponse ouverte</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Points</label>
            <input
              type="number"
              min={1}
              max={100}
              value={questionDraft.points}
              onChange={(event) => setQuestionDrafts((current) => ({
                ...current,
                [questionId]: { ...questionDraft, points: parseInt(event.target.value, 10) || 1 },
              }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-3 pt-7 text-sm text-gray-700 md:col-span-2">
            <input
              type="checkbox"
              checked={questionDraft.required}
              onChange={(event) => setQuestionDrafts((current) => ({
                ...current,
                [questionId]: { ...questionDraft, required: event.target.checked },
              }))}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Réponse obligatoire
          </label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Consigne / correction</label>
          <textarea
            value={questionDraft.explanation}
            onChange={(event) => setQuestionDrafts((current) => ({
              ...current,
              [questionId]: { ...questionDraft, explanation: event.target.value },
            }))}
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {questionDraft.type === 'open' ? (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Cette question sera repondue en texte libre par l apprenant.
        </div>
      ) : (
        <QuizChoicesEditor
          question={question}
          questionDraft={questionDraft}
          choices={choices}
          choiceDrafts={choiceDrafts}
          newChoiceDraft={newChoiceDraft}
          canAddChoice={canAddMoreTrueFalseChoices}
          setChoiceDrafts={setChoiceDrafts}
          setNewChoiceDrafts={setNewChoiceDrafts}
          onCreateChoice={onCreateChoice}
          onSaveChoice={onSaveChoice}
          onDeleteChoice={onDeleteChoice}
          onMoveChoice={onMoveChoice}
        />
      )}
    </div>
  );
}

function QuestionIconButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
    >
      <i className={`${icon} text-gray-600`} />
    </button>
  );
}
