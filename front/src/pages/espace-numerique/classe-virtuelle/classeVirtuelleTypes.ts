export interface VirtualClass {
  id: number;
  title: string;
  course_id: number;
  course_name: string;
  class_date: string;
  class_time: string;
  duration: string;
  max_students: number;
  students_count: number;
  status: string;
  room_link: string | null;
  recording_url: string | null;
  recording_status?: 'none' | 'pending' | 'processing' | 'ready';
  instructor_notes?: string | null;
  provider?: 'jitsi' | 'custom';
}

export interface Course {
  id: number;
  title: string;
  category: string;
  modules: number;
  duration: string;
  description: string | null;
}

export interface Lesson {
  id: string;
  sectionId?: string;
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'exercise' | 'pdf' | 'article' | 'live' | 'coding' | 'practice' | 'assignment';
  completed: boolean;
  locked: boolean;
  progress?: number;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface LessonProgressRecord {
  id: string | number;
  lesson_id: string | number;
  section_id?: string | number;
  progress: number;
  completed: boolean;
}

export interface LessonComment {
  id: string | number;
  user_name: string;
  user_role: string;
  content: string;
  created_at: string;
  pinned?: boolean;
}

export interface EspaceLessonRow {
  id: string | number;
  section_id: string | number;
  title: string;
  duration: string | null;
  type: Lesson['type'];
  is_preview?: boolean;
}
