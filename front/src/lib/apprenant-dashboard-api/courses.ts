import type { Course, QuizAttempt } from '@/pages/dashboard/apprenant/cours/[id]/types';
import { apiRequest, toApiError } from '../api';
import type { ApprenantEnrollment } from './types';

export async function fetchApprenantEnrollments(userId: string, options?: { limit?: number }) {
  void userId;
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  return apiRequest<ApprenantEnrollment[]>(`/learning/apprenant/enrollments${query ? `?${query}` : ''}`);
}

export async function fetchApprenantCourseDetail(userId: string, courseId: string | number): Promise<Course | null> {
  void userId;
  try {
    return await apiRequest<Course>(`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}`);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 404) return null;
    throw apiError;
  }
}

export async function updateApprenantEnrollmentProgress(
  userId: string,
  courseId: string | number,
  input: { progress: number; completedLessons: number; completedLessonIds?: number[] },
) {
  const progress = Math.max(0, Math.min(100, Math.round(input.progress)));
  void userId;
  return apiRequest<ApprenantEnrollment>(`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({
      progress,
      completedLessons: Math.max(0, input.completedLessons),
      completedLessonIds: input.completedLessonIds ?? [],
    }),
  });
}

export async function updateApprenantLessonProgress(
  userId: string,
  courseId: string | number,
  lessonId: string | number,
  input: {
    section_id?: string | number | null;
    progress?: number;
    completed?: boolean;
    bookmarked?: boolean;
    note?: string | null;
    videoPositionSeconds?: number;
  },
) {
  void userId;
  return apiRequest<{
    id: number | string;
    course_id: number | string;
    section_id?: number | string | null;
    lesson_id: number | string;
    student_id: string;
    progress: number;
    completed: boolean;
    bookmarked?: boolean;
    note?: string | null;
    video_position_seconds?: number;
    status: string;
    last_viewed_at: string;
    completed_at?: string | null;
  }>(
    `/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/lessons/${encodeURIComponent(String(lessonId))}/progress`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export async function submitApprenantCourseQuizAttempt(
  userId: string,
  courseId: string | number,
  input: { answers: Record<number, number> | Record<string, number> },
) {
  void userId;
  return apiRequest<QuizAttempt>(
    `/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/quiz-attempts`,
    {
      method: 'POST',
      body: JSON.stringify({ answers: input.answers }),
    },
  );
}

export async function updateApprenantCourseActivity(
  userId: string,
  courseId: string | number,
  input: { learningTimeSecondsDelta: number },
) {
  void userId;
  return apiRequest<ApprenantEnrollment>(
    `/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/activity`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        learningTimeSecondsDelta: Math.max(0, Math.floor(input.learningTimeSecondsDelta)),
      }),
    },
  );
}
