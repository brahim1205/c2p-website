import type { Dispatch, SetStateAction } from 'react';
import type { QuestionDraft, QuestionType } from './evaluationModel';

interface NewQuestionFormProps {
  draft: QuestionDraft;
  onDraftChange: Dispatch<SetStateAction<QuestionDraft>>;
  onCreateQuestion: () => void;
}

export function NewQuestionForm({ draft, onDraftChange, onCreateQuestion }: NewQuestionFormProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-gray-900">Nouvelle question</h4>
          <p className="text-sm text-gray-600">Ajoutez la structure du quiz avant de l ouvrir aux apprenants.</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Intitulé</label>
          <textarea
            value={draft.prompt}
            onChange={(event) => onDraftChange((current) => ({ ...current, prompt: event.target.value }))}
            rows={3}
            placeholder="Ex: Quel indicateur permet de mesurer le cout d acquisition ?"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              value={draft.type}
              onChange={(event) => onDraftChange((current) => ({ ...current, type: event.target.value as QuestionType }))}
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
              value={draft.points}
              onChange={(event) => onDraftChange((current) => ({ ...current, points: parseInt(event.target.value, 10) || 1 }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-3 pt-7 text-sm text-gray-700 md:col-span-2">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(event) => onDraftChange((current) => ({ ...current, required: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Réponse obligatoire
          </label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Consigne / correction (facultatif)</label>
          <textarea
            value={draft.explanation}
            onChange={(event) => onDraftChange((current) => ({ ...current, explanation: event.target.value }))}
            rows={2}
            placeholder="Contexte ou explication attendue pour cette question..."
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={onCreateQuestion}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            Ajouter la question
          </button>
        </div>
      </div>
    </div>
  );
}
