import { getFieldClass, type VirtualClass } from './virtualClassModel';
import type { VirtualClassEditFormProps } from './virtualClassFormTypes';

export default function VirtualClassEditForm({
  editForm,
  errors,
  formMessage,
  instructorCourses,
  isReplayUploading,
  replayUploadProgress,
  onUpdateForm,
  onSelectCourse,
  onReplayFileChange,
}: VirtualClassEditFormProps) {
  return (
    <>
      {formMessage ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formMessage}
        </div>
      ) : null}
      <div className="dashboard-form-grid">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
          <input
            type="text"
            value={editForm.title || ''}
            onChange={(event) => onUpdateForm('title', event.target.value)}
            aria-invalid={Boolean(errors.title)}
            className={getFieldClass(Boolean(errors.title))}
          />
          {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title}</p> : null}
        </div>
        <div>
          <label htmlFor="edit-virtual-class-course-id" className="mb-1 block text-sm font-medium text-gray-700">
            Formation associée
          </label>
          <select
            id="edit-virtual-class-course-id"
            value={String(editForm.course_id || '')}
            onChange={(event) => onSelectCourse(event.target.value)}
            aria-label="Formation associée"
            aria-invalid={Boolean(errors.course_id)}
            className={getFieldClass(Boolean(errors.course_id))}
          >
            <option value="">Sélectionner une formation</option>
            {instructorCourses.map((course, index) => (
              <option key={`${String(course.id)}-${index}`} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          {errors.course_id ? <p className="mt-1 text-xs text-red-600">{errors.course_id}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
            <input
              type="date"
              value={editForm.class_date || ''}
              onChange={(event) => onUpdateForm('class_date', event.target.value)}
              aria-invalid={Boolean(errors.class_date)}
              className={getFieldClass(Boolean(errors.class_date))}
            />
            {errors.class_date ? <p className="mt-1 text-xs text-red-600">{errors.class_date}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Heure *</label>
            <input
              type="time"
              value={editForm.class_time || ''}
              onChange={(event) => onUpdateForm('class_time', event.target.value)}
              aria-invalid={Boolean(errors.class_time)}
              className={getFieldClass(Boolean(errors.class_time))}
            />
            {errors.class_time ? <p className="mt-1 text-xs text-red-600">{errors.class_time}</p> : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur live</label>
            <select
              value={String(editForm.provider || 'jitsi')}
              onChange={(event) => onUpdateForm('provider', event.target.value as VirtualClass['provider'])}
              className={getFieldClass(false)}
            >
              <option value="jitsi">Jitsi auto-généré</option>
              <option value="custom">Lien personnalisé</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Durée</label>
            <input
              type="text"
              value={editForm.duration || ''}
              onChange={(event) => onUpdateForm('duration', event.target.value)}
              className={getFieldClass(false)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Max participants</label>
            <input
              type="number"
              min={1}
              max={500}
              value={editForm.max_students || 30}
              onChange={(event) => onUpdateForm('max_students', parseInt(event.target.value, 10) || 30)}
              aria-invalid={Boolean(errors.max_students)}
              className={getFieldClass(Boolean(errors.max_students))}
            />
            {errors.max_students ? <p className="mt-1 text-xs text-red-600">{errors.max_students}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug de la salle</label>
            <input
              type="text"
              value={editForm.meeting_slug || ''}
              onChange={(event) => onUpdateForm('meeting_slug', event.target.value)}
              placeholder="react-hooks-session"
              aria-invalid={Boolean(errors.meeting_slug)}
              className={getFieldClass(Boolean(errors.meeting_slug))}
            />
            {errors.meeting_slug ? <p className="mt-1 text-xs text-red-600">{errors.meeting_slug}</p> : null}
          </div>
        </div>
        <div className="dashboard-form-wide">
          <label className="mb-1 block text-sm font-medium text-gray-700">Lien de la salle</label>
          <input
            type="url"
            value={editForm.room_link || ''}
            onChange={(event) => onUpdateForm('room_link', event.target.value)}
            aria-invalid={Boolean(errors.room_link)}
            className={getFieldClass(Boolean(errors.room_link))}
          />
          {errors.room_link ? <p className="mt-1 text-xs text-red-600">{errors.room_link}</p> : null}
        </div>
        <div className="dashboard-form-wide">
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-gray-700">Lien de replay</label>
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-50 ${isReplayUploading ? 'pointer-events-none opacity-60' : ''}`}>
              <i className={`${isReplayUploading ? 'ri-loader-4-line animate-spin' : 'ri-upload-cloud-2-line'} text-sm`} />
              {isReplayUploading ? `Import ${replayUploadProgress}%` : 'Importer un replay'}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={isReplayUploading}
                onChange={onReplayFileChange}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={editForm.recording_url || ''}
              onChange={(event) => onUpdateForm('recording_url', event.target.value)}
              placeholder="https://.../replay"
              aria-invalid={Boolean(errors.recording_url)}
              className={getFieldClass(Boolean(errors.recording_url))}
            />
            {editForm.recording_url ? (
              <a
                href={editForm.recording_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Ouvrir
              </a>
            ) : null}
          </div>
          {errors.recording_url ? <p className="mt-1 text-xs text-red-600">{errors.recording_url}</p> : null}
          {editForm.status === 'ended' && !editForm.recording_url ? (
            <p className="mt-1 text-xs text-amber-700">Ajoutez un fichier ou une URL pour rendre le replay disponible aux apprenants.</p>
          ) : null}
        </div>
        <div className="dashboard-form-wide">
          <label className="mb-1 block text-sm font-medium text-gray-700">Notes formateur</label>
          <textarea
            rows={4}
            value={editForm.instructor_notes || ''}
            onChange={(event) => onUpdateForm('instructor_notes', event.target.value)}
            placeholder="Consignes de préparation, matériel demandé, déroulé..."
            aria-invalid={Boolean(errors.instructor_notes)}
            className={`${getFieldClass(Boolean(errors.instructor_notes))} resize-none`}
          />
          {errors.instructor_notes ? <p className="mt-1 text-xs text-red-600">{errors.instructor_notes}</p> : null}
        </div>
        <div className="dashboard-form-wide grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(editForm.recording_enabled)}
              onChange={(event) => onUpdateForm('recording_enabled', event.target.checked)}
            />
            Enregistrement du replay
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={editForm.allow_chat !== false}
              onChange={(event) => onUpdateForm('allow_chat', event.target.checked)}
            />
            Chat activé
          </label>
        </div>
      </div>
    </>
  );
}
