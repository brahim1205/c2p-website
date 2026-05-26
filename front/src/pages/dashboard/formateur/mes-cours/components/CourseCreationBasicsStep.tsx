import type { ChangeEvent, RefObject } from 'react';
import ImageUploadField from '@/components/base/ImageUploadField';
import {
  COURSE_DELIVERY_LABELS,
  COURSE_LEVEL_LABELS,
  type CourseBasicsDraft,
  type CourseDeliveryMode,
  type CourseFieldErrors,
  type CourseLevel,
  type WizardDraftState,
} from './courseWizardModel';
import CourseListEditor, { type CourseListField } from './CourseListEditor';
import { getFieldClass } from './courseCreationFields';

interface CourseCreationBasicsStepProps {
  wizard: WizardDraftState;
  courseErrors: CourseFieldErrors;
  userId?: string | null;
  trailerInputRef: RefObject<HTMLInputElement | null>;
  isTrailerUploading: boolean;
  trailerUploadProgress: number;
  updateCourse: <K extends keyof CourseBasicsDraft>(field: K, value: CourseBasicsDraft[K]) => void;
  addCourseListItem: (field: CourseListField) => void;
  updateCourseListItem: (field: CourseListField, index: number, value: string) => void;
  removeCourseListItem: (field: CourseListField, index: number) => void;
  handleTrailerFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export default function CourseCreationBasicsStep({
  wizard,
  courseErrors,
  userId,
  trailerInputRef,
  isTrailerUploading,
  trailerUploadProgress,
  updateCourse,
  addCourseListItem,
  updateCourseListItem,
  removeCourseListItem,
  handleTrailerFileChange,
}: CourseCreationBasicsStepProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 1</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Fondations du cours</h3>
          <p className="mt-1 text-sm text-slate-600">
            Définissez la fiche catalogue, le positionnement commercial et l ossature pédagogique.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre *</label>
            <input
              type="text"
              value={wizard.course.title}
              onChange={(event) => updateCourse('title', event.target.value)}
              placeholder="Ex: Marketing digital avancé pour PME"
              aria-invalid={Boolean(courseErrors.title)}
              className={getFieldClass(Boolean(courseErrors.title))}
            />
            {courseErrors.title ? <p className="mt-1 text-xs text-red-600">{courseErrors.title}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Format *</label>
            <select
              value={wizard.course.delivery_mode}
              onChange={(event) => updateCourse('delivery_mode', event.target.value as CourseDeliveryMode)}
              aria-invalid={Boolean(courseErrors.delivery_mode)}
              className={getFieldClass(Boolean(courseErrors.delivery_mode))}
            >
              {Object.entries(COURSE_DELIVERY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {courseErrors.delivery_mode ? <p className="mt-1 text-xs text-red-600">{courseErrors.delivery_mode}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Catégorie *</label>
            <input
              type="text"
              value={wizard.course.category}
              onChange={(event) => updateCourse('category', event.target.value)}
              placeholder="Marketing, Produit, Comptabilité..."
              aria-invalid={Boolean(courseErrors.category)}
              className={getFieldClass(Boolean(courseErrors.category))}
            />
            {courseErrors.category ? <p className="mt-1 text-xs text-red-600">{courseErrors.category}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Niveau *</label>
            <select
              value={wizard.course.level}
              onChange={(event) => updateCourse('level', event.target.value as CourseLevel)}
              aria-invalid={Boolean(courseErrors.level)}
              className={getFieldClass(Boolean(courseErrors.level))}
            >
              {Object.entries(COURSE_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {courseErrors.level ? <p className="mt-1 text-xs text-red-600">{courseErrors.level}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={4}
              maxLength={500}
              value={wizard.course.description}
              onChange={(event) => updateCourse('description', event.target.value)}
              placeholder="Résumez la promesse de la formation, les acquis et le public cible."
              aria-invalid={Boolean(courseErrors.description)}
              className={`${getFieldClass(Boolean(courseErrors.description))} resize-none`}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>500 caractères max</span>
              <span>{wizard.course.description.length}/500</span>
            </div>
            {courseErrors.description ? <p className="mt-1 text-xs text-red-600">{courseErrors.description}</p> : null}
          </div>

          <div className="md:col-span-2 grid gap-4 lg:grid-cols-3">
            <CourseListEditor
              field="objectives"
              label="Objectifs pédagogiques"
              placeholder="Ex: Mettre en place un pipeline CI"
              values={wizard.course.objectives}
              onAdd={addCourseListItem}
              onUpdate={updateCourseListItem}
              onRemove={removeCourseListItem}
            />
            <CourseListEditor
              field="prerequisites"
              label="Prérequis"
              placeholder="Ex: Bases de Git et du terminal"
              values={wizard.course.prerequisites}
              onAdd={addCourseListItem}
              onUpdate={updateCourseListItem}
              onRemove={removeCourseListItem}
            />
            <CourseListEditor
              field="tools"
              label="Outils"
              placeholder="Ex: GitLab, Docker, VS Code"
              values={wizard.course.tools}
              onAdd={addCourseListItem}
              onUpdate={updateCourseListItem}
              onRemove={removeCourseListItem}
            />
          </div>

          <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Durée estimée *</label>
              <input
                type="text"
                value={wizard.course.duration}
                onChange={(event) => updateCourse('duration', event.target.value)}
                placeholder="Ex: 8h ou 4 semaines"
                aria-invalid={Boolean(courseErrors.duration)}
                className={getFieldClass(Boolean(courseErrors.duration))}
              />
              {courseErrors.duration ? <p className="mt-1 text-xs text-red-600">{courseErrors.duration}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Promotion (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={wizard.course.promotion_percentage}
                onChange={(event) => updateCourse('promotion_percentage', Number(event.target.value) || 0)}
                aria-invalid={Boolean(courseErrors.promotion_percentage)}
                className={getFieldClass(Boolean(courseErrors.promotion_percentage))}
              />
              {courseErrors.promotion_percentage ? <p className="mt-1 text-xs text-red-600">{courseErrors.promotion_percentage}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Accès</p>
                  <p className="text-xs text-slate-500">Basculer entre formation gratuite et formation payante.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={wizard.course.is_free}
                    onChange={(event) => updateCourse('is_free', event.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Gratuit
                </label>
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Prix (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={wizard.course.price}
                  onChange={(event) => updateCourse('price', Number(event.target.value) || 0)}
                  disabled={wizard.course.is_free}
                  aria-invalid={Boolean(courseErrors.price)}
                  className={getFieldClass(Boolean(courseErrors.price))}
                />
                {courseErrors.price ? <p className="mt-1 text-xs text-red-600">{courseErrors.price}</p> : null}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid gap-4 lg:grid-cols-2">
            <div>
              <ImageUploadField
                label="Image de couverture"
                value={wizard.course.thumbnail}
                onChange={(url) => updateCourse('thumbnail', url)}
                folder={`c2p/course-drafts/${userId ?? 'anonymous'}/${wizard.draftId}/cover`}
                helper="Utilisez une couverture nette, lisible sur mobile et desktop."
                allowUrlInput={false}
              />
              {courseErrors.thumbnail ? <p className="mt-1 text-xs text-red-600">{courseErrors.thumbnail}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Bande-annonce vidéo</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Importez une vidéo de présentation depuis votre appareil.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => trailerInputRef.current?.click()}
                    disabled={isTrailerUploading}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isTrailerUploading ? 'Upload...' : 'Importer la vidéo'}
                  </button>
                  <input
                    ref={trailerInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleTrailerFileChange}
                  />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                  {wizard.course.trailer_url ? (
                    <div className="space-y-2">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                        <i className="ri-video-line text-xl"></i>
                      </div>
                      <p className="text-sm font-medium text-slate-800">Vidéo importée</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-slate-500">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400">
                        <i className="ri-video-upload-line text-xl"></i>
                      </div>
                      <p className="text-sm">Aucune vidéo importée</p>
                    </div>
                  )}
                </div>
                {isTrailerUploading ? (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>Upload en cours</span>
                      <span>{trailerUploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${trailerUploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                {courseErrors.trailer_url ? <p className="mt-1 text-xs text-red-600">{courseErrors.trailer_url}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
