import type { FormateurCourse } from './core';

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
