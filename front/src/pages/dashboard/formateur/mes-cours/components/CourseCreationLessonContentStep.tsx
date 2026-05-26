import type { RefObject } from 'react';
import CourseCreationAssetsStep from './CourseCreationAssetsStep';
import { getFieldClass } from './courseCreationFields';
import {
  LESSON_TYPE_LABELS,
  type AssetDraft,
  type AssetType,
  type LessonDraft,
  type LessonType,
  type WizardDraftState,
} from './courseWizardModel';

interface LessonOption {
  sectionId: string;
  sectionTitle: string;
  lessonId: string;
  lessonTitle: string;
}

interface CourseCreationLessonContentStepProps {
  wizard: WizardDraftState;
  selectedLesson: LessonDraft | null;
  lessonOptions: LessonOption[];
  pendingAssetType: AssetType;
  uploadedAssetsCount: number;
  pendingUploadsCount: number;
  uploadInputRef: RefObject<HTMLInputElement>;
  setPendingAssetType: (assetType: AssetType) => void;
  selectLesson: (lessonId: string) => void;
  addAssetLink: (lessonId: string, assetType: AssetType) => void;
  handleQueuedFiles: (lessonId: string, assetType: AssetType, files: FileList | null) => void;
  updateAsset: <K extends keyof AssetDraft>(assetId: string, field: K, value: AssetDraft[K]) => void;
  removeAsset: (assetId: string) => void;
  updateLessonField: <K extends keyof LessonDraft>(lessonId: string, field: K, value: LessonDraft[K]) => void;
  appendLessonSnippet: (snippet: string) => void;
}

const lessonSnippets = [
  { label: 'Titre Markdown', snippet: '## Nouveau bloc' },
  { label: 'Note', snippet: ':::note\nPoint clé à retenir\n:::' },
  { label: 'Checklist', snippet: '- [ ] Étape 1\n- [ ] Étape 2' },
  { label: 'Code', snippet: '```ts\nconsole.log("Bonjour C2P");\n```' },
];

export default function CourseCreationLessonContentStep({
  wizard,
  selectedLesson,
  lessonOptions,
  pendingAssetType,
  uploadedAssetsCount,
  pendingUploadsCount,
  uploadInputRef,
  setPendingAssetType,
  selectLesson,
  addAssetLink,
  handleQueuedFiles,
  updateAsset,
  removeAsset,
  updateLessonField,
  appendLessonSnippet,
}: CourseCreationLessonContentStepProps) {
  return (
    <div className="space-y-6">
      <CourseCreationAssetsStep
        wizard={wizard}
        selectedLesson={selectedLesson}
        lessonOptions={lessonOptions}
        pendingAssetType={pendingAssetType}
        uploadedAssetsCount={uploadedAssetsCount}
        pendingUploadsCount={pendingUploadsCount}
        uploadInputRef={uploadInputRef}
        setPendingAssetType={setPendingAssetType}
        selectLesson={selectLesson}
        addAssetLink={addAssetLink}
        handleQueuedFiles={handleQueuedFiles}
        updateAsset={updateAsset}
        removeAsset={removeAsset}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Leçons</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Éditeur de leçons</h3>
          <p className="mt-1 text-sm text-slate-600">
            Rédigez les articles, exercices, live briefs et challenges avec une expérience pensée mobile-first.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 text-sm font-semibold text-slate-900">Leçons du programme</p>
            <div className="space-y-2">
              {lessonOptions.map((option) => {
                const lesson = wizard.sections
                  .find((section) => section.id === option.sectionId)
                  ?.lessons.find((entry) => entry.id === option.lessonId);
                if (!lesson) return null;

                return (
                  <button
                    key={option.lessonId}
                    type="button"
                    onClick={() => selectLesson(option.lessonId)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                      wizard.selectedLessonId === option.lessonId
                        ? 'border-teal-300 bg-white text-slate-900'
                        : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <p className="font-medium">{lesson.title || 'Leçon sans titre'}</p>
                    <p className="mt-1 text-xs text-slate-400">{option.sectionTitle} · {LESSON_TYPE_LABELS[lesson.type]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            {selectedLesson ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre de la leçon</label>
                    <input
                      type="text"
                      value={selectedLesson.title}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'title', event.target.value)}
                      className={getFieldClass(false)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                    <select
                      value={selectedLesson.type}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'type', event.target.value as LessonType)}
                      className={getFieldClass(false)}
                    >
                      {Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[180px_auto]">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Durée</label>
                    <input
                      type="text"
                      value={selectedLesson.duration}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'duration', event.target.value)}
                      placeholder="12 min"
                      className={getFieldClass(false)}
                    />
                  </div>
                  <label className="mt-7 inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedLesson.is_preview}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'is_preview', event.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Leçon d aperçu gratuite
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Résumé</label>
                  <textarea
                    rows={3}
                    value={selectedLesson.description}
                    onChange={(event) => updateLessonField(selectedLesson.id, 'description', event.target.value)}
                    placeholder="Résumé visible dans le programme et la fiche de leçon."
                    className={`${getFieldClass(false)} resize-none`}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap gap-2">
                    {lessonSnippets.map((entry) => (
                      <button
                        key={entry.label}
                        type="button"
                        onClick={() => appendLessonSnippet(entry.snippet)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Contenu rédigé / Markdown</label>
                  <textarea
                    rows={10}
                    value={selectedLesson.content}
                    onChange={(event) => updateLessonField(selectedLesson.id, 'content', event.target.value)}
                    placeholder="Rédigez ici le contenu principal, les instructions ou le script pédagogique."
                    className={`${getFieldClass(false)} resize-y font-mono`}
                  />
                </div>

                {selectedLesson.type === 'coding' ? (
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Langage</label>
                      <input
                        type="text"
                        value={selectedLesson.code_language}
                        onChange={(event) => updateLessonField(selectedLesson.id, 'code_language', event.target.value)}
                        placeholder="typescript, python, sql..."
                        className={getFieldClass(false)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Bloc de code</label>
                      <textarea
                        rows={8}
                        value={selectedLesson.code_sample}
                        onChange={(event) => updateLessonField(selectedLesson.id, 'code_sample', event.target.value)}
                        placeholder="Ajoutez un snippet ou un challenge technique."
                        className={`${getFieldClass(false)} resize-y font-mono`}
                      />
                    </div>
                  </div>
                ) : null}

                {['assignment', 'practice'].includes(selectedLesson.type) ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Consignes d exercice</label>
                    <textarea
                      rows={5}
                      value={selectedLesson.exercise_instructions}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'exercise_instructions', event.target.value)}
                      placeholder="Expliquez la production attendue, les critères et le mode de restitution."
                      className={`${getFieldClass(false)} resize-y`}
                    />
                  </div>
                ) : null}

                <div className="rounded-2xl bg-slate-950 p-4 text-slate-100">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Aperçu rapide</p>
                    <span className="text-xs text-slate-400">{LESSON_TYPE_LABELS[selectedLesson.type]}</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    {selectedLesson.description ? <p className="text-slate-300">{selectedLesson.description}</p> : null}
                    {selectedLesson.content ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-900/70 p-3 text-slate-200">
                        {selectedLesson.content}
                      </pre>
                    ) : (
                      <p className="text-slate-500">Ajoutez du contenu pour prévisualiser la leçon.</p>
                    )}
                    {selectedLesson.code_sample ? (
                      <pre className="overflow-x-auto rounded-xl bg-black/40 p-3 text-emerald-200">
                        {selectedLesson.code_sample}
                      </pre>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Sélectionnez une leçon pour ouvrir l éditeur.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
