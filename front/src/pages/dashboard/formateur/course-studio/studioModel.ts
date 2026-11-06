import { courseCategories } from '@/pages/espace-numerique/espaceNumeriquePageModel';
import type { CourseWorkflowStatus } from '@/lib/courseWorkflow';
import type { FormateurCourseDeliveryMode, FormateurCourseLevel } from '@/lib/formateurDashboardTypes';

export type EntityId = string | number;
export type StudioLessonType = 'video' | 'article' | 'pdf' | 'quiz' | 'assignment' | 'live' | 'practice' | 'coding';
export type StudioAssetType = 'video' | 'pdf' | 'audio' | 'archive' | 'slides' | 'link' | 'code';

/** Course row as returned by `/learning/formateur/courses/:id/program` (landing-page fields included). */
export interface StudioCourse {
  id: EntityId;
  title: string;
  subtitle?: string | null;
  category: string | null;
  description: string | null;
  language?: string | null;
  level: FormateurCourseLevel;
  delivery_mode: FormateurCourseDeliveryMode;
  duration: string | null;
  thumbnail: string | null;
  trailer_url: string | null;
  is_free: boolean;
  price: number | null;
  promotion_percentage: number;
  certificate_enabled?: boolean;
  certificate_pass_percentage?: number;
  certificate_min_attendance?: number;
  instructor_signature_url?: string | null;
  objectives?: string[];
  prerequisites?: string[];
  target_audience?: string[];
  status: CourseWorkflowStatus;
  updated_at?: string;
}

export interface StudioSection {
  id: EntityId;
  course_id: EntityId;
  title: string;
  description: string | null;
  position: number;
}

export interface StudioLesson {
  id: EntityId;
  course_id: EntityId;
  section_id: EntityId;
  title: string;
  description: string | null;
  type: StudioLessonType;
  duration: string | null;
  content?: string | null;
  code_language?: string | null;
  code_sample?: string | null;
  exercise_instructions?: string | null;
  position: number;
  is_preview: boolean;
  status: 'draft' | 'published';
  exam_id?: string | null;
}

export interface StudioAsset {
  id: EntityId;
  lesson_id: EntityId;
  section_id: EntityId;
  course_id: EntityId;
  title: string;
  asset_type: StudioAssetType;
  url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
  status: 'processing' | 'ready';
}

export interface StudioProgram {
  course: StudioCourse;
  sections: StudioSection[];
  lessons: StudioLesson[];
  assets: StudioAsset[];
}

export type StudioPanel = 'objectifs' | 'programme' | 'seances' | 'accueil' | 'tarifs';

export const STUDIO_PANELS: Array<{ id: StudioPanel; group: string; label: string; icon: string }> = [
  { id: 'objectifs', group: 'Planifier votre cours', label: 'Apprenants cibles', icon: 'ri-focus-3-line' },
  { id: 'programme', group: 'Créer votre contenu', label: 'Programme', icon: 'ri-list-check-3' },
  { id: 'seances', group: 'Créer votre contenu', label: 'Séances en direct', icon: 'ri-live-line' },
  { id: 'accueil', group: 'Publier votre cours', label: "Page d'accueil du cours", icon: 'ri-layout-top-line' },
  { id: 'tarifs', group: 'Publier votre cours', label: 'Tarifs et certificat', icon: 'ri-price-tag-3-line' },
];

export function isStudioPanel(value: string | undefined): value is StudioPanel {
  return STUDIO_PANELS.some((panel) => panel.id === value);
}

/** Catalogue categories (same ids as the public filters), without the "all" pseudo-entry. */
export const STUDIO_CATEGORIES = courseCategories.filter((category) => category.id !== 'all');

export const STUDIO_LANGUAGES = ['Français', 'Anglais', 'Wolof', 'Arabe', 'Pulaar', 'Espagnol'];

export const STUDIO_LEVELS: Array<{ id: FormateurCourseLevel; label: string }> = [
  { id: 'beginner', label: 'Débutant' },
  { id: 'intermediate', label: 'Intermédiaire' },
  { id: 'advanced', label: 'Avancé' },
  { id: 'all_levels', label: 'Tous niveaux' },
];

export const STUDIO_DELIVERY_MODES: Array<{ id: FormateurCourseDeliveryMode; label: string; description: string; icon: string }> = [
  { id: 'online', label: 'Cours en ligne', description: 'Vidéos, articles et ressources que les apprenants suivent à leur rythme.', icon: 'ri-play-circle-line' },
  { id: 'hybrid', label: 'Hybride', description: 'Contenu en ligne complété par des séances en présentiel ou en direct.', icon: 'ri-shuffle-line' },
  { id: 'onsite', label: 'Présentiel', description: 'Formation en salle, avec un programme et des supports en ligne.', icon: 'ri-building-4-line' },
];

/** Item types offered by the curriculum builder, in the order of the "add item" menu. */
export const CURRICULUM_ITEM_TYPES: Array<{ id: StudioLessonType; label: string; icon: string; hint: string }> = [
  { id: 'video', label: 'Vidéo', icon: 'ri-play-circle-line', hint: 'Une leçon filmée (MP4, MOV, WebM)' },
  { id: 'article', label: 'Article', icon: 'ri-file-text-line', hint: 'Une leçon écrite' },
  { id: 'pdf', label: 'Document', icon: 'ri-file-pdf-2-line', hint: 'Un PDF ou des slides à consulter' },
  { id: 'practice', label: 'Exercice pratique', icon: 'ri-pencil-ruler-2-line', hint: 'Des consignes à réaliser' },
  { id: 'coding', label: 'Exercice de code', icon: 'ri-code-s-slash-line', hint: 'Un énoncé et un code de départ' },
  { id: 'quiz', label: 'Quiz', icon: 'ri-questionnaire-line', hint: 'Des questions corrigées automatiquement' },
];

export function curriculumItemMeta(type: StudioLessonType) {
  return CURRICULUM_ITEM_TYPES.find((item) => item.id === type)
    ?? { id: type, label: type === 'quiz' ? 'Quiz' : type === 'live' ? 'Live' : 'Devoir', icon: 'ri-survey-line', hint: '' };
}

export const SUBTITLE_MAX = 120;
export const TITLE_MAX = 80;
export const RECOMMENDED_OBJECTIVES = 4;

/**
 * Parses the free-form lesson durations stored so far ("12:30", "1:02:00", "15 min", "1h30", "2 h")
 * into seconds. Unknown formats count as 0 rather than breaking the total.
 */
export function parseDurationSeconds(value: string | null | undefined) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return 0;
  const clock = text.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (clock) {
    const [first, second, third] = [Number(clock[1]), Number(clock[2]), clock[3] ? Number(clock[3]) : null];
    return third === null ? first * 60 + second : first * 3600 + second * 60 + third;
  }
  const hours = Number(text.match(/(\d+(?:[.,]\d+)?)\s*h/)?.[1]?.replace(',', '.') ?? 0);
  const afterHours = text.match(/\d\s*h\s*(\d{1,2})(?!\s*s)/)?.[1];
  const minutes = Number(text.match(/(\d+)\s*(?:min|mn|m\b)/)?.[1] ?? afterHours ?? 0);
  const seconds = Number(text.match(/(\d+)\s*s(?:ec)?\b/)?.[1] ?? 0);
  if (hours || minutes || seconds) return Math.round(hours * 3600 + minutes * 60 + seconds);
  const bare = Number(text.replace(',', '.'));
  return Number.isFinite(bare) ? Math.round(bare * 60) : 0;
}

/** "3 h 05 min", "42 min" or "45 s". */
export function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return '';
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${hours} h`;
}

/** Video length in "m:ss" (what the curriculum shows next to each lecture). */
export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

export function totalProgramSeconds(lessons: StudioLesson[]) {
  return lessons.reduce((total, lesson) => total + parseDurationSeconds(lesson.duration), 0);
}

export function countWords(value: string | null | undefined) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Required items block the submission (mirrors the backend readiness check). */
  required: boolean;
  panel: StudioPanel;
}

export function buildSubmissionChecklist(program: StudioProgram, plannedLiveSessions = 0): ChecklistItem[] {
  const { course, sections, lessons, assets } = program;
  const needsLive = course.delivery_mode !== 'online';
  const objectives = (course.objectives ?? []).filter((item) => item.trim());
  const videoLessonIds = new Set(assets.filter((asset) => asset.asset_type === 'video').map((asset) => String(asset.lesson_id)));
  return [
    { id: 'objectives', label: `Au moins ${RECOMMENDED_OBJECTIVES} objectifs d'apprentissage`, done: objectives.length >= RECOMMENDED_OBJECTIVES, required: false, panel: 'objectifs' },
    { id: 'audience', label: 'Le public cible est décrit', done: (course.target_audience ?? []).some((item) => item.trim()), required: false, panel: 'objectifs' },
    { id: 'sections', label: 'Au moins une section', done: sections.length > 0, required: true, panel: 'programme' },
    { id: 'lessons', label: 'Au moins une leçon', done: lessons.length > 0, required: true, panel: 'programme' },
    { id: 'videos', label: 'Au moins une vidéo', done: videoLessonIds.size > 0, required: false, panel: 'programme' },
    { id: 'preview', label: 'Une leçon en aperçu gratuit', done: lessons.some((lesson) => lesson.is_preview), required: false, panel: 'programme' },
    ...(needsLive ? [{ id: 'live', label: 'Au moins une séance en direct planifiée', done: plannedLiveSessions > 0, required: false, panel: 'seances' as const }] : []),
    { id: 'duration', label: 'La durée du cours est renseignée', done: Boolean(course.duration?.trim()), required: true, panel: 'accueil' },
    { id: 'subtitle', label: 'Un sous-titre accrocheur', done: Boolean(course.subtitle?.trim()), required: false, panel: 'accueil' },
    { id: 'description', label: 'Une description du cours', done: Boolean(course.description?.trim()), required: true, panel: 'accueil' },
    { id: 'thumbnail', label: 'Une image de cours', done: Boolean(course.thumbnail?.trim()), required: true, panel: 'accueil' },
    { id: 'pricing', label: 'Le tarif est choisi (gratuit ou payant)', done: course.is_free || Number(course.price ?? 0) > 0, required: true, panel: 'tarifs' },
  ];
}

export function panelIsComplete(panel: StudioPanel, checklist: ChecklistItem[]) {
  return checklist.filter((item) => item.panel === panel).every((item) => item.done);
}

export function readErrorMessage(reason: unknown, fallback: string) {
  return reason && typeof reason === 'object' && 'message' in reason && String(reason.message).trim()
    ? String(reason.message)
    : fallback;
}

export function studioPath(courseId: EntityId, panel: StudioPanel = 'programme') {
  return `/dashboard/formateur/mes-cours/${encodeURIComponent(String(courseId))}/gerer/${panel}`;
}

/** Full lesson payload expected by the lessons API (it replaces every field). */
export function lessonPayload(lesson: StudioLesson, patch: Partial<StudioLesson> = {}) {
  const next = { ...lesson, ...patch };
  return {
    id: next.id,
    section_id: String(next.section_id),
    title: next.title,
    description: next.description ?? '',
    type: next.type,
    duration: next.duration ?? '',
    content: next.content ?? '',
    code_language: next.code_language ?? '',
    code_sample: next.code_sample ?? '',
    exercise_instructions: next.exercise_instructions ?? '',
    is_preview: Boolean(next.is_preview),
    status: 'published' as const,
    position: next.position,
    exam_id: next.exam_id ?? null,
  };
}
