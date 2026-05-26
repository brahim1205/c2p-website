import type { RefObject } from 'react';
import {
  ASSET_TYPE_LABELS,
  type AssetDraft,
  type AssetType,
  type LessonDraft,
  type WizardDraftState,
} from './courseWizardModel';
import { formatBytes, getFieldClass } from './courseCreationFields';

interface LessonOption {
  sectionId: string;
  sectionTitle: string;
  lessonId: string;
  lessonTitle: string;
}

interface CourseCreationAssetsStepProps {
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
}

export default function CourseCreationAssetsStep({
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
}: CourseCreationAssetsStepProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 3</p>
          <h3 className="text-lg font-semibold text-slate-900">Contenus du cours</h3>
          <p className="text-sm text-slate-600">Ajoutez les supports de chaque leçon : vidéo, document, audio ou exercice.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-teal-50 px-4 py-3">
            <p className="text-xs font-medium text-teal-700">Prêts</p>
            <p className="mt-1 text-xl font-semibold text-teal-900">{uploadedAssetsCount}</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-700">En cours</p>
            <p className="mt-1 text-xl font-semibold text-amber-900">{pendingUploadsCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Leçon cible</label>
              <select
                value={wizard.selectedLessonId}
                onChange={(event) => selectLesson(event.target.value)}
                className={getFieldClass(false)}
              >
                {lessonOptions.map((option) => (
                  <option key={option.lessonId} value={option.lessonId}>
                    {option.sectionTitle} · {option.lessonTitle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
              <select
                value={pendingAssetType}
                onChange={(event) => setPendingAssetType(event.target.value as AssetType)}
                className={getFieldClass(false)}
              >
                {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((assetType) => (
                  <option key={assetType} value={assetType}>{ASSET_TYPE_LABELS[assetType]}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!selectedLesson) return;
                if (pendingAssetType === 'link') {
                  addAssetLink(selectedLesson.id, pendingAssetType);
                  return;
                }
                uploadInputRef.current?.click();
              }}
              disabled={!selectedLesson}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <i className="ri-upload-2-line text-base"></i>
              {pendingAssetType === 'link' ? 'Ajouter le contenu' : 'Importer'}
            </button>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (!selectedLesson) return;
              handleQueuedFiles(selectedLesson.id, pendingAssetType === 'link' ? 'pdf' : pendingAssetType, event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Bibliothèque</h4>
              <p className="mt-1 text-xs text-slate-500">Les contenus ajoutés seront rattachés à la leçon sélectionnée.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {wizard.assets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <i className="ri-folder-upload-line text-2xl"></i>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">Aucun contenu ajouté</p>
                <p className="mt-1 text-xs text-slate-500">Choisissez une leçon, puis importez un fichier.</p>
              </div>
            ) : (
              wizard.assets.map((asset) => (
                <div key={asset.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          {ASSET_TYPE_LABELS[asset.asset_type]}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          asset.queueStatus === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : asset.queueStatus === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {asset.queueStatus === 'ready' ? 'Prêt' : asset.queueStatus === 'error' ? 'Erreur' : 'En file'}
                        </span>
                        <span className="text-[11px] text-slate-400">{asset.lessonTitle}</span>
                      </div>
                      <input
                        type="text"
                        value={asset.title}
                        onChange={(event) => updateAsset(asset.id, 'title', event.target.value)}
                        placeholder="Titre du contenu"
                        className={getFieldClass(false)}
                      />
                      {asset.asset_type === 'link' ? (
                        <input
                          type="url"
                          value={asset.url}
                          onChange={(event) => updateAsset(asset.id, 'url', event.target.value)}
                          placeholder="https://..."
                          className={`${getFieldClass(false)} mt-2`}
                        />
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        {asset.mime_type ? <span>{asset.mime_type}</span> : null}
                        {asset.size_bytes ? <span>{formatBytes(asset.size_bytes)}</span> : null}
                      </div>
                      {asset.queueStatus === 'uploading' ? (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                            <span>Upload en cours</span>
                            <span>{asset.progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-teal-500 transition-all"
                              style={{ width: `${asset.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                      {asset.errorMessage ? <p className="mt-2 text-xs text-red-600">{asset.errorMessage}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label="Retirer le contenu"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
