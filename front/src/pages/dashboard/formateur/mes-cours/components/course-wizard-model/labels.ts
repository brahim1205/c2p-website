import type {
  AssetType,
  CourseDeliveryMode,
  CourseLevel,
  ExamType,
  LessonType,
  QuestionType,
} from '../courseWizardTypes';

export const STEP_LABELS = [
  'Infos',
  'Programme',
  'Contenus',
  'Quiz fin chapitre',
  'Validation',
] as const;

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  all_levels: 'Tous niveaux',
};

export const COURSE_DELIVERY_LABELS: Record<CourseDeliveryMode, string> = {
  online: 'En ligne',
  onsite: 'Présentiel',
  hybrid: 'Hybride',
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: 'Leçon vidéo',
  article: 'Article',
  pdf: 'PDF',
  quiz: 'Quiz de fin de chapitre',
  assignment: 'Devoir',
  live: 'Live session',
  practice: 'Exercice pratique',
  coding: 'Coding challenge',
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  video: 'Vidéo',
  pdf: 'PDF',
  audio: 'Audio',
  archive: 'ZIP',
  slides: 'Slides',
  link: 'Lien externe',
  code: 'Fichier de code',
};

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  quiz: 'Quiz de fin de chapitre',
  assignment: 'Devoir',
  project: 'Projet',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Choix unique',
  multiple_choice: 'Choix multiples',
  true_false: 'Vrai / Faux',
  open: 'Réponse ouverte',
};
