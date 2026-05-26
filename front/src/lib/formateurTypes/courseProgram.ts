import type { FormateurCourse, FormateurCourseLevel, FormateurCourseDeliveryMode } from './core';
import type { FormateurExam } from './core';
import type { FormateurQuizQuestion } from './evaluations';

export interface FormateurCourseRelation {
  id: number | string;
  title: string;
  category: string | null;
  modules: number | null;
  duration: string | null;
  status: string;
}

export interface FormateurCourseSection {
  id: string | number;
  course_id: string | number;
  title: string;
  description: string | null;
  position: number;
  status: 'draft' | 'published';
  lessons_count?: number;
}

export interface FormateurCourseLesson {
  id: string | number;
  course_id: string | number;
  section_id: string | number;
  title: string;
  description: string | null;
  type: 'video' | 'article' | 'pdf' | 'quiz' | 'assignment' | 'live' | 'practice' | 'coding';
  duration: string | null;
  content?: string | null;
  code_language?: string | null;
  code_sample?: string | null;
  exercise_instructions?: string | null;
  position: number;
  is_preview: boolean;
  status: 'draft' | 'published';
}

export interface FormateurLessonAsset {
  id: string | number;
  lesson_id: string | number;
  section_id: string | number;
  course_id: string | number;
  title: string;
  asset_type: 'video' | 'pdf' | 'audio' | 'archive' | 'slides' | 'link' | 'code';
  url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
  status: 'processing' | 'ready';
}

export interface FormateurCourseProgramSnapshot {
  course: FormateurCourse | null;
  sections: FormateurCourseSection[];
  lessons: FormateurCourseLesson[];
  assets: FormateurLessonAsset[];
}

export interface FormateurCourseBundleLessonInput {
  id: string;
  title: string;
  type: FormateurCourseLesson['type'];
  duration: string;
  description: string;
  content: string;
  code_language: string;
  code_sample: string;
  exercise_instructions: string;
  is_preview: boolean;
  status: FormateurCourseLesson['status'];
  position: number;
}

export interface FormateurCourseBundleSectionInput {
  id: string;
  title: string;
  description: string;
  status: FormateurCourseSection['status'];
  position: number;
  lessons: FormateurCourseBundleLessonInput[];
}

export interface FormateurCourseBundleAssetInput {
  lessonId: string;
  lessonTitle: string;
  asset_type: FormateurLessonAsset['asset_type'];
  title: string;
  url: string;
  thumbnail_url: string;
  mime_type: string;
  size_bytes: number | null;
}

export interface FormateurCourseBundleChoiceInput {
  label: string;
  value: string;
  is_correct: boolean;
}

export interface FormateurCourseBundleQuestionInput {
  prompt: string;
  type: FormateurQuizQuestion['type'];
  points: number;
  explanation: string;
  required: boolean;
  choices: FormateurCourseBundleChoiceInput[];
}

export interface FormateurCourseBundleExamInput {
  title: string;
  type: FormateurExam['type'];
  exam_date: string;
  participants: number;
  max_grade: number;
  questions: FormateurCourseBundleQuestionInput[];
}

export interface FormateurCourseBundleInput {
  course: {
    title: string;
    category: string;
    description: string;
    objectives?: string[];
    prerequisites?: string[];
    tools?: string[];
    level: FormateurCourseLevel;
    delivery_mode: FormateurCourseDeliveryMode;
    duration: string;
    is_free: boolean;
    price: number;
    promotion_percentage: number;
    trailer_url: string;
    thumbnail: string;
  };
  sections: FormateurCourseBundleSectionInput[];
  assets: FormateurCourseBundleAssetInput[];
  exams: FormateurCourseBundleExamInput[];
}
