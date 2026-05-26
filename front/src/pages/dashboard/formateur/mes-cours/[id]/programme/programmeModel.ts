import type { CourseWorkflowStatus } from '@/lib/courseWorkflow';

export type CourseStatus = CourseWorkflowStatus;
export type ItemStatus = 'draft' | 'published';
export type LessonType = 'video' | 'article' | 'pdf' | 'quiz' | 'assignment' | 'live' | 'practice' | 'coding';
export type AssetType = 'video' | 'pdf' | 'audio' | 'archive' | 'slides' | 'link' | 'code';
export type AssetStatus = 'processing' | 'ready';
export type EntityId = string | number;

export interface Course {
  id: EntityId;
  title: string;
  category: string;
  description: string | null;
  duration: string | null;
  thumbnail?: string | null;
  modules: number;
  lessons_count?: number;
  preview_lessons_count?: number;
  published_lessons_count?: number;
  status: CourseStatus;
  updated_at?: string;
}

export interface CourseSection {
  id: EntityId;
  course_id: EntityId;
  title: string;
  description: string | null;
  position: number;
  status: ItemStatus;
  lessons_count?: number;
}

export interface CourseLesson {
  id: EntityId;
  course_id: EntityId;
  section_id: EntityId;
  title: string;
  description: string | null;
  type: LessonType;
  duration: string | null;
  content?: string | null;
  code_language?: string | null;
  code_sample?: string | null;
  exercise_instructions?: string | null;
  position: number;
  is_preview: boolean;
  status: ItemStatus;
}

export interface LessonAsset {
  id: EntityId;
  lesson_id: EntityId;
  section_id: EntityId;
  course_id: EntityId;
  title: string;
  asset_type: AssetType;
  url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
  status: AssetStatus;
}

export type CourseProgramSection = CourseSection & {
  lessons: CourseLesson[];
  assets: LessonAsset[];
};

export interface SectionFormState {
  title: string;
  description: string;
  status: ItemStatus;
}

export interface LessonFormState {
  section_id: string;
  title: string;
  description: string;
  type: LessonType;
  duration: string;
  content: string;
  code_language: string;
  code_sample: string;
  exercise_instructions: string;
  is_preview: boolean;
  status: ItemStatus;
}

export interface AssetFormState {
  lesson_id: string;
  title: string;
  asset_type: AssetType;
  url: string;
  thumbnail_url: string;
  mime_type: string;
  size_bytes: string;
  status: AssetStatus;
}

export type SectionFormErrors = Partial<Record<'title' | 'description', string>>;
export type LessonFormErrors = Partial<Record<'section_id' | 'title' | 'description' | 'duration' | 'content' | 'code_sample' | 'exercise_instructions', string>>;
export type AssetFormErrors = Partial<Record<'lesson_id' | 'title' | 'url' | 'thumbnail_url' | 'mime_type' | 'size_bytes', string>>;

export const lessonTypeLabels: Record<LessonType, string> = {
  video: 'Vidéo',
  article: 'Article',
  pdf: 'PDF',
  quiz: 'Quiz',
  assignment: 'Devoir',
  live: 'Live',
  practice: 'Exercice pratique',
  coding: 'Coding challenge',
};

export const assetTypeLabels: Record<AssetType, string> = {
  video: 'Vidéo',
  pdf: 'PDF',
  audio: 'Audio',
  archive: 'Archive',
  slides: 'Slides',
  link: 'Lien',
  code: 'Code',
};

export const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  review: 'En révision',
  published: 'Publié',
  rejected: 'Rejeté',
  archived: 'Archivé',
};

export const statusClasses: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-gray-200 text-gray-700',
};

export const emptySectionForm = (): SectionFormState => ({
  title: '',
  description: '',
  status: 'draft',
});

export const emptyLessonForm = (sectionId = ''): LessonFormState => ({
  section_id: sectionId,
  title: '',
  description: '',
  type: 'video',
  duration: '',
  content: '',
  code_language: 'markdown',
  code_sample: '',
  exercise_instructions: '',
  is_preview: false,
  status: 'draft',
});

export const emptyAssetForm = (lessonId = ''): AssetFormState => ({
  lesson_id: lessonId,
  title: '',
  asset_type: 'link',
  url: '',
  thumbnail_url: '',
  mime_type: '',
  size_bytes: '',
  status: 'ready',
});

export function formatBytes(value: number | null | undefined) {
  if (!value) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getFieldClass(hasError?: boolean) {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
  }`;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateSectionForm(form: SectionFormState) {
  const errors: SectionFormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = 'Le titre de la section est obligatoire.';
  else if (title.length < 2) errors.title = 'Le titre doit contenir au moins 2 caractères.';
  if (form.description.length > 500) errors.description = 'La description ne peut pas dépasser 500 caractères.';
  return errors;
}

export function validateLessonForm(form: LessonFormState, availableSectionIds: Set<string>) {
  const errors: LessonFormErrors = {};
  const title = form.title.trim();
  if (!String(form.section_id).trim()) errors.section_id = 'La section est obligatoire.';
  else if (!availableSectionIds.has(String(form.section_id))) errors.section_id = 'Sélectionnez une section valide.';
  if (!title) errors.title = 'Le titre de la leçon est obligatoire.';
  else if (title.length < 2) errors.title = 'Le titre doit contenir au moins 2 caractères.';
  if (form.description.length > 1000) errors.description = 'La description ne peut pas dépasser 1000 caractères.';
  if (form.duration.trim().length > 40) errors.duration = 'La durée est trop longue.';
  if (['article', 'practice', 'coding'].includes(form.type) && form.content.trim().length === 0) {
    errors.content = 'Ajoutez un contenu rédigé pour cette leçon.';
  }
  if (form.type === 'coding' && form.code_sample.trim().length === 0) {
    errors.code_sample = 'Ajoutez un extrait de code ou un énoncé technique.';
  }
  if (['assignment', 'practice'].includes(form.type) && form.exercise_instructions.trim().length === 0) {
    errors.exercise_instructions = 'Ajoutez les consignes de l’exercice.';
  }
  return errors;
}

export function validateAssetForm(form: AssetFormState, availableLessonIds: Set<string>) {
  const errors: AssetFormErrors = {};
  const title = form.title.trim();
  const url = form.url.trim();
  const thumbnailUrl = form.thumbnail_url.trim();
  const sizeValue = form.size_bytes.trim();

  if (!String(form.lesson_id).trim()) errors.lesson_id = 'La leçon est obligatoire.';
  else if (!availableLessonIds.has(String(form.lesson_id))) errors.lesson_id = 'Sélectionnez une leçon valide.';
  if (!title) errors.title = 'Le titre du contenu est obligatoire.';
  else if (title.length < 2) errors.title = 'Le titre doit contenir au moins 2 caractères.';
  if (!url) errors.url = 'Ajoutez un lien ou importez un fichier.';
  else if (!isValidHttpUrl(url)) errors.url = 'L’URL du contenu doit être une URL http(s) valide.';
  if (thumbnailUrl && !isValidHttpUrl(thumbnailUrl)) errors.thumbnail_url = 'La miniature doit être une URL http(s) valide.';
  if (sizeValue) {
    const size = Number(sizeValue);
    if (!Number.isFinite(size) || size < 0) errors.size_bytes = 'La taille doit être un nombre positif.';
  }
  return errors;
}
