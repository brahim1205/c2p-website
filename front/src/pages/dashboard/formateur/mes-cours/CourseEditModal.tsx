import ImageUploadField from '@/components/base/ImageUploadField';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CourseListFieldEditor, { type CourseListField } from './CourseListFieldEditor';
import { type CourseDeliveryMode } from '@/lib/courseDelivery';
import { type CourseWorkflowStatus } from '@/lib/courseWorkflow';
import {
  COURSE_DELIVERY_LABELS,
  COURSE_LEVEL_LABELS,
  getCourseFieldClass as getFieldClass,
  type Course,
  type CourseFormErrors,
} from './courseManagementModel';

interface CourseEditModalProps {
  course: Course;
  editForm: Partial<Course>;
  editErrors: CourseFormErrors;
  editFormMessage: string | null;
  isUpdating: boolean;
  onClose: () => void;
  onConfirm: () => void;
  updateEditForm: <K extends keyof Course>(field: K, value: Course[K] | undefined) => void;
}

export default function CourseEditModal({
  course,
  editForm,
  editErrors,
  editFormMessage,
  isUpdating,
  onClose,
  onConfirm,
  updateEditForm,
}: CourseEditModalProps) {
  const [step, setStep] = useState(1);
  const steps = ['Informations', 'Pédagogie', 'Programme', 'Tarif et publication'];

  const updateList = (field: CourseListField, index: number, value: string) => {
    const values = [...(editForm[field] ?? [])];
    values[index] = value;
    updateEditForm(field, values);
  };

  const addListItem = (field: CourseListField) => {
    updateEditForm(field, [...(editForm[field] ?? []), '']);
  };

  const removeListItem = (field: CourseListField, index: number) => {
    updateEditForm(field, (editForm[field] ?? []).filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
            <i className="ri-edit-line text-teal-600 text-xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Modifier la formation</h3>
        </div>
        {editFormMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {editFormMessage}
          </div>
        ) : null}
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index + 1)}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                step === index + 1 ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-500'
              }`}
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">{index + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="dashboard-form-grid">
          {step === 1 ? <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={editForm.title || ''}
              onChange={(event) => updateEditForm('title', event.target.value)}
              aria-invalid={Boolean(editErrors.title)}
              className={getFieldClass(Boolean(editErrors.title))}
            />
            {editErrors.title ? <p className="mt-1 text-xs text-red-600">{editErrors.title}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input
                type="text"
                value={editForm.category || ''}
                onChange={(event) => updateEditForm('category', event.target.value)}
                aria-invalid={Boolean(editErrors.category)}
                className={getFieldClass(Boolean(editErrors.category))}
              />
              {editErrors.category ? <p className="mt-1 text-xs text-red-600">{editErrors.category}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select
                value={editForm.level || 'intermediate'}
                onChange={(event) => updateEditForm('level', event.target.value as Course['level'])}
                aria-invalid={Boolean(editErrors.level)}
                className={getFieldClass(Boolean(editErrors.level))}
              >
                {Object.entries(COURSE_LEVEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {editErrors.level ? <p className="mt-1 text-xs text-red-600">{editErrors.level}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={editForm.delivery_mode || 'online'}
                onChange={(event) => updateEditForm('delivery_mode', event.target.value as CourseDeliveryMode)}
                aria-invalid={Boolean(editErrors.delivery_mode)}
                className={getFieldClass(Boolean(editErrors.delivery_mode))}
              >
                {Object.entries(COURSE_DELIVERY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {editErrors.delivery_mode ? <p className="mt-1 text-xs text-red-600">{editErrors.delivery_mode}</p> : null}
            </div>
          </div>
          <div className="dashboard-form-wide">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              maxLength={500}
              value={editForm.description || ''}
              onChange={(event) => updateEditForm('description', event.target.value)}
              aria-invalid={Boolean(editErrors.description)}
              className={`${getFieldClass(Boolean(editErrors.description))} resize-none`}
            />
            <p className="text-xs text-gray-500 mt-1">500 caractères max</p>
            {editErrors.description ? <p className="mt-1 text-xs text-red-600">{editErrors.description}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
              <input
                type="text"
                value={editForm.duration || ''}
                onChange={(event) => updateEditForm('duration', event.target.value)}
                aria-invalid={Boolean(editErrors.duration)}
                className={getFieldClass(Boolean(editErrors.duration))}
              />
              {editErrors.duration ? <p className="mt-1 text-xs text-red-600">{editErrors.duration}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modules</label>
              <input
                type="number"
                min={1}
                value={editForm.modules || 0}
                onChange={(event) => updateEditForm('modules', parseInt(event.target.value, 10) || 0)}
                aria-invalid={Boolean(editErrors.modules)}
                className={getFieldClass(Boolean(editErrors.modules))}
              />
              {editErrors.modules ? <p className="mt-1 text-xs text-red-600">{editErrors.modules}</p> : null}
            </div>
          </div>
          <div className="dashboard-form-wide">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bande-annonce vidéo</label>
            <input
              type="url"
              value={editForm.trailer_url || ''}
              onChange={(event) => updateEditForm('trailer_url', event.target.value)}
              aria-invalid={Boolean(editErrors.trailer_url)}
              placeholder="https://.../trailer.mp4"
              className={getFieldClass(Boolean(editErrors.trailer_url))}
            />
            {editErrors.trailer_url ? <p className="mt-1 text-xs text-red-600">{editErrors.trailer_url}</p> : null}
          </div>
          <ImageUploadField
            label="Miniature de la formation"
            value={editForm.thumbnail || course.thumbnail || ''}
            onChange={(url) => updateEditForm('thumbnail', url)}
            folder="c2p/courses"
            helper="Ce visuel sera utilise dans le catalogue et sur la fiche formation."
          />
          {editErrors.thumbnail ? <p className="dashboard-form-wide -mt-2 text-xs text-red-600">{editErrors.thumbnail}</p> : null}
          </> : null}

          {step === 2 ? (
            <div className="dashboard-form-wide space-y-6">
              <CourseListFieldEditor label="Ce que les apprenants vont apprendre" field="objectives" values={editForm.objectives ?? []} onAdd={addListItem} onChange={updateList} onRemove={removeListItem} />
              <CourseListFieldEditor label="Prérequis" field="prerequisites" values={editForm.prerequisites ?? []} onAdd={addListItem} onChange={updateList} onRemove={removeListItem} />
              <CourseListFieldEditor label="Outils et matériels" field="tools" values={editForm.tools ?? []} onAdd={addListItem} onChange={updateList} onRemove={removeListItem} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="dashboard-form-wide rounded-2xl border border-teal-100 bg-teal-50 p-6">
              <h4 className="text-lg font-bold text-gray-900">Programme, modules et leçons</h4>
              <p className="mt-2 text-sm text-gray-600">
                Modifiez les sections, leçons, vidéos, documents et évaluations dans l’éditeur complet du programme.
              </p>
              <Link
                to={`/dashboard/formateur/mes-cours/${course.id}/programme`}
                className="mt-5 inline-flex items-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Ouvrir l’éditeur du programme
              </Link>
            </div>
          ) : null}

          {step === 4 ? <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={editForm.status || ''}
                onChange={(event) => updateEditForm('status', event.target.value as CourseWorkflowStatus)}
                className={getFieldClass(false)}
              >
                <option value="draft">Brouillon</option>
                <option value="review">Soumettre en révision</option>
                <option value="archived">Archivée</option>
                {editForm.status === 'published' && <option value="published">Publiée</option>}
                {editForm.status === 'rejected' && <option value="rejected">Rejetée</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
              <input type="number" min={0} value={editForm.price || 0} onChange={(event) => updateEditForm('price', parseInt(event.target.value, 10) || 0)} disabled={Boolean(editForm.is_free)} aria-invalid={Boolean(editErrors.price)} className={getFieldClass(Boolean(editErrors.price))} />
              {editErrors.price ? <p className="mt-1 text-xs text-red-600">{editErrors.price}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Promotion (%)</label>
              <input type="number" min={0} max={100} value={editForm.promotion_percentage || 0} onChange={(event) => updateEditForm('promotion_percentage', parseInt(event.target.value, 10) || 0)} aria-invalid={Boolean(editErrors.promotion_percentage)} className={getFieldClass(Boolean(editErrors.promotion_percentage))} />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
              <input type="checkbox" checked={Boolean(editForm.is_free)} onChange={(event) => updateEditForm('is_free', event.target.checked)} />
              Formation gratuite
            </label>
          </> : null}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          {step > 1 ? <button type="button" onClick={() => setStep((current) => current - 1)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium">Précédent</button> : null}
          {step < 4 ? (
            <button type="button" onClick={() => setStep((current) => current + 1)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">
              Suivant
            </button>
          ) : (
          <button
            onClick={onConfirm}
            disabled={isUpdating}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
