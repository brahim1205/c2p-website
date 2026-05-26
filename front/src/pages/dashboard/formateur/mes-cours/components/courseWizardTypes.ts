import type { CourseDeliveryMode } from '@/lib/courseDelivery';

export type { CourseDeliveryMode };

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type LessonType = 'video' | 'article' | 'pdf' | 'quiz' | 'assignment' | 'live' | 'practice' | 'coding';
export type AssetType = 'video' | 'pdf' | 'audio' | 'archive' | 'slides' | 'link' | 'code';
export type ExamType = 'quiz' | 'assignment' | 'project';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open';

export interface CourseCreationWizardProps {
  open: boolean;
  embedded?: boolean;
  userId?: string | null;
  onClose: () => void;
  onCreated: (payload: {
    id: string | number;
    title: string;
    category: string;
    description: string;
    level: CourseLevel;
    delivery_mode: CourseDeliveryMode;
    duration: string;
    is_free: boolean;
    price: number;
    promotion_percentage: number;
    trailer_url: string | null;
    thumbnail: string | null;
    modules: number;
  }) => Promise<void> | void;
}

export interface CourseBasicsDraft {
  title: string;
  category: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  tools: string[];
  level: CourseLevel;
  delivery_mode: CourseDeliveryMode;
  duration: string;
  is_free: boolean;
  price: number;
  promotion_percentage: number;
  thumbnail: string;
  trailer_url: string;
}

export interface LessonDraft {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  description: string;
  content: string;
  code_language: string;
  code_sample: string;
  exercise_instructions: string;
  is_preview: boolean;
  status: 'draft' | 'published';
  position: number;
}

export interface SectionDraft {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  position: number;
  lessons: LessonDraft[];
}

export interface AssetDraft {
  id: string;
  lessonId: string;
  lessonTitle: string;
  asset_type: AssetType;
  title: string;
  url: string;
  thumbnail_url: string;
  mime_type: string;
  size_bytes: number | null;
  status: 'processing' | 'ready';
  queueStatus: 'queued' | 'uploading' | 'ready' | 'error';
  progress: number;
  errorMessage: string | null;
}

export interface QuestionChoiceDraft {
  id: string;
  label: string;
  value: string;
  is_correct: boolean;
}

export interface QuestionDraft {
  id: string;
  prompt: string;
  type: QuestionType;
  points: number;
  explanation: string;
  required: boolean;
  choices: QuestionChoiceDraft[];
}

export interface ExamDraft {
  id: string;
  title: string;
  type: ExamType;
  exam_date: string;
  participants: number;
  max_grade: number;
  timer_minutes: number;
  auto_correction: boolean;
  question_bank: boolean;
  ai_generation: boolean;
  anti_cheat: boolean;
  questions: QuestionDraft[];
}

export interface WizardDraftState {
  draftId: string;
  step: number;
  course: CourseBasicsDraft;
  sections: SectionDraft[];
  assets: AssetDraft[];
  exams: ExamDraft[];
  selectedLessonId: string;
  selectedExamId: string;
}

export type CourseFieldErrors = Partial<Record<
  'title' | 'category' | 'description' | 'level' | 'delivery_mode' | 'duration' | 'price' | 'promotion_percentage' | 'thumbnail' | 'trailer_url',
  string
>>;
