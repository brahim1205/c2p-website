import {
  getFieldClass,
  lessonTypeLabels,
  type CourseSection,
  type ItemStatus,
  type LessonFormErrors,
  type LessonFormState,
  type LessonType,
} from './programmeModel';

interface LessonModalProps {
  isEditing: boolean;
  form: LessonFormState;
  errors: LessonFormErrors;
  message: string | null;
  sections: CourseSection[];
  isSaving: boolean;
  onChange: <K extends keyof LessonFormState>(field: K, value: LessonFormState[K]) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function LessonModal({
  isEditing,
  form,
  errors,
  message,
  sections,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: LessonModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-6 text-lg font-bold text-gray-900">{isEditing ? 'Modifier la leçon' : 'Nouvelle leçon'}</h3>
        {message ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Section *</label>
              <select
                value={form.section_id}
                onChange={(event) => onChange('section_id', event.target.value)}
                aria-invalid={Boolean(errors.section_id)}
                className={getFieldClass(Boolean(errors.section_id))}
              >
                <option value="">Sélectionner une section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
              {errors.section_id ? <p className="mt-1 text-xs text-red-600">{errors.section_id}</p> : null}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => onChange('title', event.target.value)}
                placeholder="Ex: Introduction vidéo"
                aria-invalid={Boolean(errors.title)}
                className={getFieldClass(Boolean(errors.title))}
              />
              {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <select
                value={form.type}
                onChange={(event) => onChange('type', event.target.value as LessonType)}
                className={getFieldClass(false)}
              >
                {Object.entries(lessonTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Durée</label>
              <input
                type="text"
                value={form.duration}
                onChange={(event) => onChange('duration', event.target.value)}
                placeholder="Ex: 12 min"
                aria-invalid={Boolean(errors.duration)}
                className={getFieldClass(Boolean(errors.duration))}
              />
              {errors.duration ? <p className="mt-1 text-xs text-red-600">{errors.duration}</p> : null}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => onChange('description', event.target.value)}
                placeholder="Résumé de la leçon, consignes ou objectifs"
                aria-invalid={Boolean(errors.description)}
                className={`${getFieldClass(Boolean(errors.description))} resize-none`}
              />
              {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
            </div>

            {['article', 'practice', 'coding'].includes(form.type) && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Contenu riche / Markdown</label>
                <textarea
                  rows={10}
                  value={form.content}
                  onChange={(event) => onChange('content', event.target.value)}
                  placeholder="# Titre&#10;&#10;Structure, étapes, ressources..."
                  aria-invalid={Boolean(errors.content)}
                  className={`${getFieldClass(Boolean(errors.content))} resize-y font-mono`}
                />
                {errors.content ? <p className="mt-1 text-xs text-red-600">{errors.content}</p> : null}
              </div>
            )}

            {form.type === 'coding' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Langage</label>
                  <input
                    type="text"
                    value={form.code_language}
                    onChange={(event) => onChange('code_language', event.target.value)}
                    placeholder="typescript"
                    className={getFieldClass(false)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Code / énoncé technique</label>
                  <textarea
                    rows={8}
                    value={form.code_sample}
                    onChange={(event) => onChange('code_sample', event.target.value)}
                    placeholder="function solve() { ... }"
                    aria-invalid={Boolean(errors.code_sample)}
                    className={`${getFieldClass(Boolean(errors.code_sample))} resize-y font-mono`}
                  />
                  {errors.code_sample ? <p className="mt-1 text-xs text-red-600">{errors.code_sample}</p> : null}
                </div>
              </>
            )}

            {['assignment', 'practice'].includes(form.type) && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Consignes de l’exercice</label>
                <textarea
                  rows={6}
                  value={form.exercise_instructions}
                  onChange={(event) => onChange('exercise_instructions', event.target.value)}
                  placeholder="Livrable attendu, critères d’évaluation et temps conseillé."
                  aria-invalid={Boolean(errors.exercise_instructions)}
                  className={`${getFieldClass(Boolean(errors.exercise_instructions))} resize-y`}
                />
                {errors.exercise_instructions ? <p className="mt-1 text-xs text-red-600">{errors.exercise_instructions}</p> : null}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
              <select
                value={form.status}
                onChange={(event) => onChange('status', event.target.value as ItemStatus)}
                className={getFieldClass(false)}
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>
            <label className="mt-6 flex items-center gap-3 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 md:mt-0">
              <input
                type="checkbox"
                checked={form.is_preview}
                onChange={(event) => onChange('is_preview', event.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Disponible en aperçu
            </label>
          </div>

          <div className="h-fit rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Aperçu éditeur</div>
            <h4 className="text-lg font-semibold text-gray-900">{form.title || 'Titre de la leçon'}</h4>
            <p className="mt-2 text-sm text-gray-600">{form.description || 'Le résumé de la leçon apparaîtra ici.'}</p>
            {form.content ? (
              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-gray-700 shadow-sm">
                {form.content}
              </div>
            ) : null}
            {form.code_sample ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-[#0f172a]">
                <div className="border-b border-slate-700 px-4 py-2 text-xs uppercase tracking-wide text-slate-300">
                  {form.code_language || 'code'}
                </div>
                <pre className="overflow-x-auto p-4 text-xs text-emerald-200">
                  <code>{form.code_sample}</code>
                </pre>
              </div>
            ) : null}
            {form.exercise_instructions ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {form.exercise_instructions}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={isSaving}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer la leçon'}
          </button>
        </div>
      </div>
    </div>
  );
}
