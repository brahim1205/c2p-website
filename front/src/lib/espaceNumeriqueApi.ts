import { apiRequest } from './api';

export interface EspaceCourse {
  id: number;
  title: string;
  category: string;
  description: string | null;
  instructor_id: string | null;
  instructor_name?: string | null;
  modules: number | null;
  duration: string | null;
  students_count: number | null;
  price: number | null;
  current_price?: number | null;
  thumbnail: string | null;
  status: string;
  level?: string | null;
  rating?: number | null;
  access_type?: 'free' | 'paid' | null;
  is_free?: boolean | null;
  delivery_mode?: string | null;
  program_branch?: string | null;
  metadata?: {
    learning_objectives?: unknown;
    prerequisites?: unknown;
    tools?: unknown;
  } | null;
  created_at: string;
}

export interface EspaceCourseSection {
  id: number;
  title: string;
  description: string | null;
  position: number | null;
}

export interface EspaceCourseLesson {
  id: number;
  section_id: number | null;
  title: string;
  description: string | null;
  type: string | null;
  duration: string | null;
  is_preview: boolean | null;
  position: number | null;
}

export interface EspaceCourseReview {
  id: string | number;
  course_id: number;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

export interface EspaceVirtualClass {
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

export interface EspaceEnrollment {
  id: number;
  course_id: number;
  student_name?: string;
  student_email?: string | null;
  progress?: number;
  grade?: number | null;
  status?: string;
  last_active?: string;
  enrolled_at?: string;
  courses?: EspaceCourse | null;
}

export interface EspaceLessonProgress {
  id: string | number;
  lesson_id: number | string;
  section_id?: number | string;
  progress: number;
  completed: boolean;
}

export interface EspaceLessonComment {
  id: string | number;
  user_name: string;
  user_role: string;
  content: string;
  created_at: string;
  pinned?: boolean;
}

export interface EspaceCourseDetailSnapshot {
  course: EspaceCourse;
  sections: EspaceCourseSection[];
  lessons: EspaceCourseLesson[];
  reviews: EspaceCourseReview[];
  virtualClasses: EspaceVirtualClass[];
}

export interface EspaceCourseContext {
  enrollment: EspaceEnrollment | null;
  lessonProgress: EspaceLessonProgress[];
}

export async function fetchEspaceCourses() {
  return apiRequest<EspaceCourse[]>('/learning/public/courses');
}

export async function fetchEspaceCourseDetail(courseId: string | number) {
  return apiRequest<EspaceCourseDetailSnapshot>(`/learning/public/courses/${encodeURIComponent(String(courseId))}`);
}

export async function fetchEspaceCourseContext(courseId: string | number) {
  return apiRequest<EspaceCourseContext>(`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/context`);
}

export async function enrollEspaceCourse(courseId: string | number) {
  return apiRequest<EspaceEnrollment>(`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/enroll`, {
    method: 'POST',
  });
}

export async function publishEspaceCourseReview(courseId: string | number, payload: { rating: number; comment: string }) {
  return apiRequest<EspaceCourseReview>(`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchEspaceVirtualClass(classId: string | number, authenticated = false) {
  const path = `/learning/${authenticated ? '' : 'public/'}virtual-classes/${encodeURIComponent(String(classId))}`;
  const request = () => apiRequest<{
    virtualClass: EspaceVirtualClass;
    course: EspaceCourse | null;
    sections: EspaceCourseSection[];
    lessons: EspaceCourseLesson[];
  }>(path);

  try {
    return await request();
  } catch (error) {
    if (!authenticated || !error || typeof error !== 'object' || !('status' in error) || error.status !== 403) {
      throw error;
    }
    return apiRequest<Awaited<ReturnType<typeof request>>>(
      `/learning/public/virtual-classes/${encodeURIComponent(String(classId))}`,
    );
  }
}

export async function updateEspaceLessonProgress(
  courseId: string | number,
  lessonId: string | number,
  payload: { section_id?: string | number; progress: number; completed: boolean },
) {
  return apiRequest<EspaceLessonProgress>(
    `/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/lessons/${encodeURIComponent(String(lessonId))}/progress`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchEspaceLessonComments(lessonId: string | number) {
  return apiRequest<EspaceLessonComment[]>(`/learning/apprenant/lessons/${encodeURIComponent(String(lessonId))}/comments`);
}

export async function createEspaceLessonComment(lessonId: string | number, content: string) {
  return apiRequest<EspaceLessonComment>(`/learning/apprenant/lessons/${encodeURIComponent(String(lessonId))}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
