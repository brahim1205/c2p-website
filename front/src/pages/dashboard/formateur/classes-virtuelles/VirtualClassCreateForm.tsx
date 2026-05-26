import { getFieldClass } from './virtualClassModel';
import type { VirtualClassCreateFormProps, VirtualClassForm } from './virtualClassFormTypes';
import type { ReactNode } from 'react';

export default function VirtualClassCreateForm({
  newClass,
  errors,
  formMessage,
  instructorCourses,
  onUpdateClass,
  onSelectCourse,
}: VirtualClassCreateFormProps) {
  return (
    <div className="max-h-[calc(90vh-168px)] overflow-y-auto p-6">
      {formMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formMessage}
        </div>
      ) : null}

      <div className="space-y-5">
        <CreateSection
          icon="ri-book-open-line"
          iconClassName="bg-white text-teal-700 shadow-sm"
          title="Session"
          description="Le titre visible par les apprenants et la formation rattachée."
          className="bg-gray-50/60"
        >
          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Titre de la session *</label>
              <input
                type="text"
                value={newClass.title}
                onChange={(event) => onUpdateClass('title', event.target.value)}
                placeholder="Ex: Session Q&A - React Hooks"
                aria-invalid={Boolean(errors.title)}
                className={getFieldClass(Boolean(errors.title))}
              />
              {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title}</p> : null}
            </div>
            <div>
              <label htmlFor="create-virtual-class-course-id" className="mb-1 block text-sm font-medium text-gray-700">
                Formation associée *
              </label>
              <select
                id="create-virtual-class-course-id"
                value={newClass.course_id}
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
          </div>
        </CreateSection>

        <CreateSection
          icon="ri-calendar-event-line"
          iconClassName="bg-teal-50 text-teal-700"
          title="Planification"
          description="Choisissez un créneau futur et la capacité de la session."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                value={newClass.class_date}
                onChange={(event) => onUpdateClass('class_date', event.target.value)}
                aria-invalid={Boolean(errors.class_date)}
                className={getFieldClass(Boolean(errors.class_date))}
              />
              {errors.class_date ? <p className="mt-1 text-xs text-red-600">{errors.class_date}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Heure *</label>
              <input
                type="time"
                value={newClass.class_time}
                onChange={(event) => onUpdateClass('class_time', event.target.value)}
                aria-invalid={Boolean(errors.class_time)}
                className={getFieldClass(Boolean(errors.class_time))}
              />
              {errors.class_time ? <p className="mt-1 text-xs text-red-600">{errors.class_time}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Durée</label>
              <select
                value={newClass.duration}
                onChange={(event) => onUpdateClass('duration', event.target.value)}
                className={getFieldClass(false)}
              >
                <option value="">Sélectionner</option>
                <option value="30min">30 minutes</option>
                <option value="1h">1 heure</option>
                <option value="1h30">1 heure 30</option>
                <option value="2h">2 heures</option>
                <option value="3h">3 heures</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Participants max</label>
              <input
                type="number"
                min={1}
                value={newClass.max_students}
                onChange={(event) => onUpdateClass('max_students', parseInt(event.target.value, 10) || 30)}
                aria-invalid={Boolean(errors.max_students)}
                className={getFieldClass(Boolean(errors.max_students))}
              />
              {errors.max_students ? <p className="mt-1 text-xs text-red-600">{errors.max_students}</p> : null}
            </div>
          </div>
        </CreateSection>

        <CreateSection
          icon="ri-live-line"
          iconClassName="bg-blue-50 text-blue-700"
          title="Salle live"
          description="Utilisez Jitsi par défaut ou collez votre lien externe."
        >
          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur</label>
              <select
                value={newClass.provider}
                onChange={(event) => onUpdateClass('provider', event.target.value as VirtualClassForm['provider'])}
                className={getFieldClass(false)}
              >
                <option value="jitsi">Jitsi automatique</option>
                <option value="custom">Lien personnalisé</option>
              </select>
            </div>
            {newClass.provider === 'custom' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Lien de la salle *</label>
                <input
                  type="url"
                  value={newClass.room_link}
                  onChange={(event) => onUpdateClass('room_link', event.target.value)}
                  placeholder="https://meet.c2p.sn/session"
                  aria-invalid={Boolean(errors.room_link)}
                  className={getFieldClass(Boolean(errors.room_link))}
                />
                {errors.room_link ? <p className="mt-1 text-xs text-red-600">{errors.room_link}</p> : null}
              </div>
            ) : (
              <div className="flex items-center rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                <i className="ri-links-line mr-2"></i>
                Le lien de salle sera créé automatiquement après programmation.
              </div>
            )}
          </div>
        </CreateSection>

        <CreateSection
          icon="ri-settings-3-line"
          iconClassName="bg-purple-50 text-purple-700"
          title="Options"
          description="Préparez les consignes, le chat et le replay."
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes formateur</label>
              <textarea
                rows={3}
                value={newClass.instructor_notes}
                onChange={(event) => onUpdateClass('instructor_notes', event.target.value)}
                placeholder="Consignes de préparation, matériel demandé, déroulé..."
                aria-invalid={Boolean(errors.instructor_notes)}
                className={`${getFieldClass(Boolean(errors.instructor_notes))} resize-none`}
              />
              {errors.instructor_notes ? <p className="mt-1 text-xs text-red-600">{errors.instructor_notes}</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newClass.recording_enabled}
                  onChange={(event) => onUpdateClass('recording_enabled', event.target.checked)}
                />
                Enregistrer automatiquement le replay
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newClass.allow_chat}
                  onChange={(event) => onUpdateClass('allow_chat', event.target.checked)}
                />
                Activer le chat pendant la session
              </label>
            </div>
          </div>
        </CreateSection>
      </div>
    </div>
  );
}

function CreateSection({
  icon,
  iconClassName,
  title,
  description,
  className = 'bg-white',
  children,
}: {
  icon: string;
  iconClassName: string;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-gray-200 p-4 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClassName}`}>
          <i className={icon}></i>
        </span>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
