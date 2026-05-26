import {
  getFieldClass,
  type ItemStatus,
  type SectionFormErrors,
  type SectionFormState,
} from './programmeModel';

interface SectionModalProps {
  isEditing: boolean;
  form: SectionFormState;
  errors: SectionFormErrors;
  message: string | null;
  isSaving: boolean;
  onChange: <K extends keyof SectionFormState>(field: K, value: SectionFormState[K]) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function SectionModal({
  isEditing,
  form,
  errors,
  message,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: SectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-6 text-lg font-bold text-gray-900">{isEditing ? 'Modifier la section' : 'Nouvelle section'}</h3>
        {message ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        ) : null}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => onChange('title', event.target.value)}
              placeholder="Ex: Fondamentaux"
              aria-invalid={Boolean(errors.title)}
              className={getFieldClass(Boolean(errors.title))}
            />
            {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
              placeholder="Objectif pédagogique de cette section"
              aria-invalid={Boolean(errors.description)}
              className={`${getFieldClass(Boolean(errors.description))} resize-none`}
            />
            {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
          </div>
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
            {isSaving ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer la section'}
          </button>
        </div>
      </div>
    </div>
  );
}
