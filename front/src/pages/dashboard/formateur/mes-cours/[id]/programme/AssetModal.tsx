import type { ChangeEvent, RefObject } from 'react';
import {
  assetTypeLabels,
  getFieldClass,
  lessonTypeLabels,
  type AssetFormErrors,
  type AssetFormState,
  type AssetStatus,
  type AssetType,
  type CourseLesson,
  type LessonAsset,
} from './programmeModel';
import { AssetListPanel } from './AssetListPanel';

interface AssetModalProps {
  lesson: CourseLesson;
  assets: LessonAsset[];
  editingAsset: LessonAsset | null;
  form: AssetFormState;
  errors: AssetFormErrors;
  message: string | null;
  isUploading: boolean;
  uploadProgress: number;
  isSaving: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onNew: () => void;
  onClose: () => void;
  onEdit: (asset: LessonAsset) => void;
  onDelete: (asset: LessonAsset) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onChange: <K extends keyof AssetFormState>(field: K, value: AssetFormState[K]) => void;
  onReset: () => void;
  onSubmit: () => void;
}

export default function AssetModal({
  lesson,
  assets,
  editingAsset,
  form,
  errors,
  message,
  isUploading,
  uploadProgress,
  isSaving,
  fileInputRef,
  onNew,
  onClose,
  onEdit,
  onDelete,
  onFileChange,
  onChange,
  onReset,
  onSubmit,
}: AssetModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Contenus de la leçon</h3>
            <p className="text-sm text-gray-600">
              {lesson.title} • {lessonTypeLabels[lesson.type]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onNew}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Nouveau contenu
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <AssetListPanel assets={assets} onDelete={onDelete} onEdit={onEdit} />
          </div>

          <div className="h-fit rounded-xl border border-gray-200 p-5">
            <h4 className="mb-4 text-base font-semibold text-gray-900">{editingAsset ? 'Modifier le contenu' : 'Ajouter un contenu'}</h4>
            {message ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFileChange}
              accept={form.asset_type === 'video' ? 'video/*' : undefined}
            />

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => onChange('title', event.target.value)}
                  placeholder="Ex: Support PDF du module"
                  aria-invalid={Boolean(errors.title)}
                  className={getFieldClass(Boolean(errors.title))}
                />
                {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={form.asset_type}
                  onChange={(event) => onChange('asset_type', event.target.value as AssetType)}
                  className={getFieldClass(false)}
                >
                  {Object.entries(assetTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSaving || form.asset_type === 'link'}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? `Envoi ${uploadProgress}%` : 'Importer un fichier'}
                </button>
                {form.asset_type === 'link' && (
                  <p className="self-center text-xs text-gray-500">Les liens externes se saisissent directement dans l URL.</p>
                )}
              </div>

              {isUploading ? (
                <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-teal-700">
                    <span>Upload du contenu en cours</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-teal-100">
                    <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">URL *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(event) => onChange('url', event.target.value)}
                  placeholder="https://..."
                  aria-invalid={Boolean(errors.url)}
                  className={getFieldClass(Boolean(errors.url))}
                />
                {errors.url ? <p className="mt-1 text-xs text-red-600">{errors.url}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Miniature</label>
                <input
                  type="url"
                  value={form.thumbnail_url}
                  onChange={(event) => onChange('thumbnail_url', event.target.value)}
                  placeholder="https://... (optionnel)"
                  aria-invalid={Boolean(errors.thumbnail_url)}
                  className={getFieldClass(Boolean(errors.thumbnail_url))}
                />
                {errors.thumbnail_url ? <p className="mt-1 text-xs text-red-600">{errors.thumbnail_url}</p> : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">MIME type</label>
                  <input
                    type="text"
                    value={form.mime_type}
                    onChange={(event) => onChange('mime_type', event.target.value)}
                    placeholder="application/pdf"
                    className={getFieldClass(false)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Taille (octets)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.size_bytes}
                    onChange={(event) => onChange('size_bytes', event.target.value)}
                    placeholder="Optionnel"
                    aria-invalid={Boolean(errors.size_bytes)}
                    className={getFieldClass(Boolean(errors.size_bytes))}
                  />
                  {errors.size_bytes ? <p className="mt-1 text-xs text-red-600">{errors.size_bytes}</p> : null}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
                <select
                  value={form.status}
                  onChange={(event) => onChange('status', event.target.value as AssetStatus)}
                  className={getFieldClass(false)}
                >
                  <option value="ready">Prêt</option>
                  <option value="processing">Traitement</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onReset}
                disabled={isSaving || isUploading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSaving || isUploading}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? 'Upload...' : isSaving ? 'Enregistrement...' : editingAsset ? 'Enregistrer' : 'Créer le contenu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
