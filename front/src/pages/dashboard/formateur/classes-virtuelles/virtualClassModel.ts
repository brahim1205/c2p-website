export interface VirtualClass {
  id: string | number;
  course_id: string | number | null;
  title: string;
  course_name: string | null;
  class_date: string;
  class_time: string;
  duration: string | null;
  students_count: number;
  max_students: number;
  status: string;
  provider?: 'jitsi' | 'custom';
  meeting_slug?: string | null;
  recording_enabled?: boolean;
  recording_status?: 'none' | 'pending' | 'processing' | 'ready';
  recording_url: string | null;
  room_link: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  instructor_notes?: string | null;
  allow_chat?: boolean;
  created_at: string;
}

export type ClassFormErrors = Partial<Record<'title' | 'course_id' | 'class_date' | 'class_time' | 'duration' | 'max_students' | 'room_link' | 'meeting_slug' | 'recording_url' | 'instructor_notes', string>>;

export const DEFAULT_CLASS_FORM = {
  title: '',
  course_id: '',
  course_name: '',
  class_date: '',
  class_time: '',
  duration: '',
  max_students: 30,
  provider: 'jitsi' as 'jitsi' | 'custom',
  meeting_slug: '',
  room_link: '',
  recording_enabled: true,
  recording_url: '',
  instructor_notes: '',
  allow_chat: true,
};

export function getFieldClass(hasError?: boolean) {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
  }`;
}

export function isFutureClassSlot(classDate: string, classTime: string) {
  const slot = new Date(`${classDate}T${classTime}:00`);
  return !Number.isNaN(slot.getTime()) && slot.getTime() > Date.now();
}

export function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function formatClassDate(value: string) {
  if (!value) return 'Date non définie';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: 'Programmée',
    live: 'En direct',
    ended: 'Terminée',
    cancelled: 'Annulée',
  };
  return labels[status] || status;
}

export function validateVirtualClassForm(
  form: {
    title?: string;
    course_id?: string | number | null;
    class_date?: string;
    class_time?: string;
    max_students?: number | null;
    status?: string | null;
    provider?: string | null;
    meeting_slug?: string | null;
    room_link?: string | null;
    recording_url?: string | null;
    instructor_notes?: string | null;
  },
  availableCourseIds: Set<string>,
) {
  const errors: ClassFormErrors = {};
  const title = String(form.title ?? '').trim();
  const courseId = String(form.course_id ?? '').trim();
  const classDate = String(form.class_date ?? '').trim();
  const classTime = String(form.class_time ?? '').trim();
  const maxStudents = Number(form.max_students ?? 0);
  const status = String(form.status ?? 'scheduled').trim() || 'scheduled';
  const provider = String(form.provider ?? 'jitsi').trim() || 'jitsi';
  const meetingSlug = String(form.meeting_slug ?? '').trim();
  const roomLink = String(form.room_link ?? '').trim();
  const recordingUrl = String(form.recording_url ?? '').trim();
  const instructorNotes = String(form.instructor_notes ?? '').trim();

  if (!title) errors.title = 'Le titre de la session est obligatoire.';
  else if (title.length < 3) errors.title = 'Le titre doit contenir au moins 3 caractères.';

  if (!courseId) errors.course_id = 'La formation associée est obligatoire.';
  else if (!availableCourseIds.has(courseId)) errors.course_id = 'Sélectionnez une formation valide.';

  if (!classDate) errors.class_date = 'La date est obligatoire.';
  if (!classTime) errors.class_time = 'L’heure est obligatoire.';
  if (status === 'scheduled' && classDate && classTime && !isFutureClassSlot(classDate, classTime)) {
    errors.class_date = 'Programmez la classe sur un horaire futur.';
    errors.class_time = 'Programmez la classe sur un horaire futur.';
  }

  if (!Number.isFinite(maxStudents) || maxStudents < 1 || maxStudents > 500) {
    errors.max_students = 'Le nombre maximal de participants doit être compris entre 1 et 500.';
  }

  if (meetingSlug && !/^[a-z0-9-]{3,80}$/i.test(meetingSlug)) {
    errors.meeting_slug = 'Le slug doit contenir 3 à 80 caractères alphanumériques ou tirets.';
  }

  if (provider === 'custom' && !roomLink) {
    errors.room_link = 'Le lien de la salle est obligatoire pour un live personnalisé.';
  } else if (roomLink && !isValidUrl(roomLink)) {
    errors.room_link = 'Le lien de la salle doit être une URL valide.';
  }

  if (recordingUrl && !isValidUrl(recordingUrl)) {
    errors.recording_url = 'Le lien du replay doit être une URL valide.';
  }

  if (instructorNotes.length > 1200) {
    errors.instructor_notes = 'Les notes formateur ne peuvent pas dépasser 1200 caractères.';
  }

  return errors;
}
