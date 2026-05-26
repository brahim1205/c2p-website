import { type ChangeEvent, type Dispatch, type RefObject, type SetStateAction } from 'react';
import {
  formatFileSize,
  getCourseDeliveryLabel,
  getFieldClass,
  isExamTypeAllowedForDelivery,
  type CourseOption,
  type Exam,
  type ExamAttachment,
  type ExamFormErrors,
  type ExamType,
} from './evaluationModel';

export function ExamTypeSelector({
  newExam,
  selectedNewExamCourse,
  updateNewExam,
  setCreateExamMessage,
}: {
  newExam: Partial<Exam>;
  selectedNewExamCourse?: CourseOption;
  updateNewExam: (field: keyof Exam, value: unknown) => void;
  setCreateExamMessage: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <section>
      <h4 className="mb-3 text-sm font-bold text-gray-900">Type d’évaluation</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { value: 'quiz' as ExamType, label: 'Quiz', icon: 'ri-list-check-3', description: 'Questions fermées corrigées automatiquement.' },
          { value: 'assignment' as ExamType, label: 'Devoir', icon: 'ri-file-text-line', description: 'Réponse ou fichier à lire puis corriger.' },
          { value: 'project' as ExamType, label: 'Projet', icon: 'ri-folder-chart-line', description: 'Livrable long avec correction manuelle.' },
        ].map((typeOption) => {
          const selected = (newExam.type || 'quiz') === typeOption.value;
          const allowed = isExamTypeAllowedForDelivery(typeOption.value, selectedNewExamCourse?.delivery_mode);
          return (
            <button
              key={typeOption.value}
              type="button"
              onClick={() => {
                if (!allowed) {
                  setCreateExamMessage('Sélectionnez une formation hybride ou présentielle pour créer un devoir ou un projet.');
                  return;
                }
                updateNewExam('type', typeOption.value);
              }}
              disabled={!allowed}
              aria-pressed={selected}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? 'border-teal-500 bg-teal-50 text-teal-900'
                  : allowed
                    ? 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              <span className="flex items-center gap-2 font-bold">
                <i className={`${typeOption.icon} text-lg`} />
                {typeOption.label}
              </span>
              <span className="mt-2 block text-xs leading-5 text-gray-600">{typeOption.description}</span>
              {!allowed ? <span className="mt-2 block text-xs font-semibold text-amber-600">Hybride ou présentiel uniquement</span> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        {selectedNewExamCourse
          ? `Formation sélectionnée : ${getCourseDeliveryLabel(selectedNewExamCourse.delivery_mode)}.`
          : 'Choisissez d’abord une formation. Les devoirs et projets seront activés seulement pour les formats hybride ou présentiel.'}
      </p>
    </section>
  );
}

export function ExamMainInfoSection({
  newExam,
  instructorCourses,
  createExamErrors,
  updateNewExam,
  setNewExam,
  setCreateExamErrors,
  setCreateExamMessage,
}: {
  newExam: Partial<Exam>;
  instructorCourses: CourseOption[];
  createExamErrors: ExamFormErrors;
  updateNewExam: (field: keyof Exam, value: unknown) => void;
  setNewExam: Dispatch<SetStateAction<Partial<Exam>>>;
  setCreateExamErrors: Dispatch<SetStateAction<ExamFormErrors>>;
  setCreateExamMessage: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <section className="rounded-xl border border-gray-200 p-4">
      <h4 className="mb-4 text-sm font-bold text-gray-900">Informations principales</h4>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="new-exam-title" className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
          <input
            id="new-exam-title"
            type="text"
            value={newExam.title || ''}
            onChange={(event) => updateNewExam('title', event.target.value)}
            placeholder={newExam.type === 'assignment' ? 'Ex: Devoir analyse de cas' : newExam.type === 'project' ? 'Ex: Projet final' : 'Ex: Quiz React - Module 3'}
            aria-invalid={Boolean(createExamErrors.title)}
            className={getFieldClass(Boolean(createExamErrors.title))}
          />
          {createExamErrors.title ? <p className="mt-1 text-xs text-red-600">{createExamErrors.title}</p> : null}
        </div>

        <div>
          <label htmlFor="new-exam-course-id" className="mb-1 block text-sm font-medium text-gray-700">Formation associée *</label>
          <select
            id="new-exam-course-id"
            value={String(newExam.course_id ?? '')}
            onChange={(event) => {
              const selectedCourse = instructorCourses.find((course) => String(course.id) === event.target.value);
              const nextType = !isExamTypeAllowedForDelivery((newExam.type || 'quiz') as ExamType, selectedCourse?.delivery_mode)
                ? 'quiz'
                : newExam.type;
              setNewExam((current) => ({
                ...current,
                course_id: event.target.value ? event.target.value : null,
                course_name: selectedCourse?.title || '',
                type: nextType,
              }));
              setCreateExamErrors((current) => ({ ...current, course_id: undefined }));
              setCreateExamMessage(null);
            }}
            aria-label="Formation associée"
            aria-invalid={Boolean(createExamErrors.course_id)}
            className={getFieldClass(Boolean(createExamErrors.course_id))}
          >
            <option value="">Sélectionner une formation</option>
            {instructorCourses.map((course, index) => (
              <option key={`${String(course.id)}-${index}`} value={String(course.id)}>
                {course.title}
              </option>
            ))}
          </select>
          {createExamErrors.course_id ? <p className="mt-1 text-xs text-red-600">{createExamErrors.course_id}</p> : null}
        </div>

        <div>
          <label htmlFor="new-exam-date" className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
          <input
            id="new-exam-date"
            type="date"
            value={newExam.exam_date || ''}
            onChange={(event) => updateNewExam('exam_date', event.target.value)}
            aria-invalid={Boolean(createExamErrors.exam_date)}
            className={getFieldClass(Boolean(createExamErrors.exam_date))}
          />
          {createExamErrors.exam_date ? <p className="mt-1 text-xs text-red-600">{createExamErrors.exam_date}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="new-exam-max-grade" className="mb-1 block text-sm font-medium text-gray-700">Barème</label>
            <input
              id="new-exam-max-grade"
              type="number"
              min={1}
              max={100}
              value={newExam.max_grade || 20}
              onChange={(event) => updateNewExam('max_grade', parseInt(event.target.value, 10) || 20)}
              aria-invalid={Boolean(createExamErrors.max_grade)}
              className={getFieldClass(Boolean(createExamErrors.max_grade))}
            />
            {createExamErrors.max_grade ? <p className="mt-1 text-xs text-red-600">{createExamErrors.max_grade}</p> : null}
          </div>
          <div>
            <label htmlFor="new-exam-participants" className="mb-1 block text-sm font-medium text-gray-700">Participants</label>
            <input
              id="new-exam-participants"
              type="number"
              min={0}
              value={newExam.participants || 0}
              onChange={(event) => updateNewExam('participants', parseInt(event.target.value, 10) || 0)}
              aria-invalid={Boolean(createExamErrors.participants)}
              className={getFieldClass(Boolean(createExamErrors.participants))}
            />
            {createExamErrors.participants ? <p className="mt-1 text-xs text-red-600">{createExamErrors.participants}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExamInstructionsAndAttachments({
  newExam,
  isCreatingExam,
  isUploadingExamAttachment,
  examAttachmentUploadProgress,
  examAttachmentInputRef,
  updateNewExam,
  handleExamAttachmentUpload,
  removeExamAttachment,
}: {
  newExam: Partial<Exam>;
  isCreatingExam: boolean;
  isUploadingExamAttachment: boolean;
  examAttachmentUploadProgress: number;
  examAttachmentInputRef: RefObject<HTMLInputElement>;
  updateNewExam: (field: keyof Exam, value: unknown) => void;
  handleExamAttachmentUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeExamAttachment: (url: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-gray-200 p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Consigne apprenant</h4>
            <p className="mt-1 text-xs text-gray-500">Cette consigne sera affichée avant la soumission.</p>
          </div>
          <span className="text-xs text-gray-500">{String(newExam.instructions || '').length}/1500</span>
        </div>
        <textarea
          id="new-exam-instructions"
          value={newExam.instructions || ''}
          onChange={(event) => updateNewExam('instructions', event.target.value)}
          rows={8}
          maxLength={1500}
          placeholder={newExam.type === 'quiz'
            ? 'Ex: Répondez à toutes les questions. Les questions fermées seront corrigées automatiquement.'
            : 'Ex: Expliquez le livrable attendu, le format de réponse, les critères de correction et la date limite.'}
          className={`${getFieldClass(false)} resize-none`}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Fichiers joints</h4>
            <p className="mt-1 text-xs text-gray-500">Ajoutez des consignes PDF, images, supports ou fichiers de travail.</p>
          </div>
          <button
            type="button"
            onClick={() => examAttachmentInputRef.current?.click()}
            disabled={isCreatingExam || isUploadingExamAttachment || (newExam.attachments?.length ?? 0) >= 8}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className={`${isUploadingExamAttachment ? 'ri-loader-4-line animate-spin' : 'ri-upload-2-line'} text-base`} />
            {isUploadingExamAttachment ? `Import ${examAttachmentUploadProgress}%` : 'Importer'}
          </button>
          <input
            ref={examAttachmentInputRef}
            type="file"
            multiple
            className="hidden"
            disabled={isCreatingExam || isUploadingExamAttachment}
            accept="image/*,video/*,audio/*,.pdf,.zip,.txt,.md,.json,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv"
            onChange={handleExamAttachmentUpload}
          />
        </div>

        {(newExam.attachments ?? []).length > 0 ? (
          <div className="space-y-2">
            {(newExam.attachments ?? []).map((attachment: ExamAttachment) => (
              <div key={attachment.url} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <a href={attachment.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-800 hover:text-teal-700">
                  <i className="ri-attachment-2 text-gray-500" />
                  <span className="truncate">{attachment.name}</span>
                  <span className="shrink-0 text-xs font-normal text-gray-500">{formatFileSize(attachment.size)}</span>
                </a>
                <button
                  type="button"
                  onClick={() => removeExamAttachment(attachment.url)}
                  disabled={isCreatingExam || isUploadingExamAttachment}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Retirer ${attachment.name}`}
                >
                  <i className="ri-close-line text-lg" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[188px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Aucun fichier joint.
          </div>
        )}
      </section>
    </div>
  );
}
