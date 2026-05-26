import type { Dispatch, SetStateAction } from 'react';
import {
  isSingleAnswerType,
  makeChoiceDraft,
  type ChoiceDraft,
  type QuestionDraft,
  type QuizChoice,
  type QuizQuestion,
} from './evaluationModel';

interface QuizChoicesEditorProps {
  question: QuizQuestion;
  questionDraft: QuestionDraft;
  choices: QuizChoice[];
  choiceDrafts: Record<string, ChoiceDraft>;
  newChoiceDraft: ChoiceDraft;
  canAddChoice: boolean;
  setChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
  setNewChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
  onCreateChoice: (question: QuizQuestion) => void;
  onSaveChoice: (question: QuizQuestion, choice: QuizChoice) => void;
  onDeleteChoice: (choice: QuizChoice) => void;
  onMoveChoice: (question: QuizQuestion, choice: QuizChoice, direction: -1 | 1) => void;
}

export function QuizChoicesEditor({
  question,
  questionDraft,
  choices,
  choiceDrafts,
  newChoiceDraft,
  canAddChoice,
  setChoiceDrafts,
  setNewChoiceDrafts,
  onCreateChoice,
  onSaveChoice,
  onDeleteChoice,
  onMoveChoice,
}: QuizChoicesEditorProps) {
  const questionId = String(question.id);

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h5 className="text-sm font-semibold text-gray-900">Choix de réponse</h5>
          <p className="text-xs text-gray-500">
            {isSingleAnswerType(questionDraft.type)
              ? 'Une seule bonne réponse doit être cochée.'
              : 'Cochez toutes les bonnes réponses attendues.'}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {choices.map((choice) => (
          <QuizChoiceEditor
            key={String(choice.id)}
            choice={choice}
            question={question}
            choiceDraft={choiceDrafts[String(choice.id)] ?? makeChoiceDraft()}
            setChoiceDrafts={setChoiceDrafts}
            onSaveChoice={onSaveChoice}
            onDeleteChoice={onDeleteChoice}
            onMoveChoice={onMoveChoice}
          />
        ))}

        {canAddChoice && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex-1">
                <input
                  type="text"
                  value={newChoiceDraft.label}
                  onChange={(event) => setNewChoiceDrafts((current) => ({
                    ...current,
                    [questionId]: {
                      ...(current[questionId] ?? makeChoiceDraft()),
                      label: event.target.value,
                      value: current[questionId]?.value || event.target.value,
                    },
                  }))}
                  placeholder="Nouveau choix"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newChoiceDraft.is_correct}
                  onChange={(event) => setNewChoiceDrafts((current) => ({
                    ...current,
                    [questionId]: {
                      ...(current[questionId] ?? makeChoiceDraft()),
                      is_correct: event.target.checked,
                    },
                  }))}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Bonne réponse
              </label>
              <button
                onClick={() => onCreateChoice(question)}
                className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-700"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface QuizChoiceEditorProps {
  question: QuizQuestion;
  choice: QuizChoice;
  choiceDraft: ChoiceDraft;
  setChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
  onSaveChoice: (question: QuizQuestion, choice: QuizChoice) => void;
  onDeleteChoice: (choice: QuizChoice) => void;
  onMoveChoice: (question: QuizQuestion, choice: QuizChoice, direction: -1 | 1) => void;
}

function QuizChoiceEditor({
  question,
  choice,
  choiceDraft,
  setChoiceDrafts,
  onSaveChoice,
  onDeleteChoice,
  onMoveChoice,
}: QuizChoiceEditorProps) {
  const choiceId = String(choice.id);

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex-1">
          <input
            type="text"
            value={choiceDraft.label}
            onChange={(event) => setChoiceDrafts((current) => ({
              ...current,
              [choiceId]: {
                ...choiceDraft,
                label: event.target.value,
                value: choiceDraft.value || event.target.value,
              },
            }))}
            placeholder="Texte du choix"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={choiceDraft.is_correct}
            onChange={(event) => setChoiceDrafts((current) => ({
              ...current,
              [choiceId]: { ...choiceDraft, is_correct: event.target.checked },
            }))}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          Bonne réponse
        </label>
        <div className="flex items-center gap-2">
          <button
            title="Monter le choix"
            aria-label="Monter le choix"
            onClick={() => onMoveChoice(question, choice, -1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
          >
            <i className="ri-arrow-up-line text-gray-600" />
          </button>
          <button
            title="Descendre le choix"
            aria-label="Descendre le choix"
            onClick={() => onMoveChoice(question, choice, 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
          >
            <i className="ri-arrow-down-line text-gray-600" />
          </button>
          <button
            onClick={() => onSaveChoice(question, choice)}
            className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-black"
          >
            Enregistrer
          </button>
          <button
            onClick={() => onDeleteChoice(choice)}
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
