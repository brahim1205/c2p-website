import { apiRequest } from '../api';
import type { ApprenantLessonComment } from './types';

export async function fetchApprenantLessonComments(lessonId: string | number) {
  return apiRequest<ApprenantLessonComment[]>(
    `/learning/apprenant/lessons/${encodeURIComponent(String(lessonId))}/comments`,
  );
}

export async function createApprenantLessonComment(lessonId: string | number, content: string) {
  return apiRequest<ApprenantLessonComment>(
    `/learning/apprenant/lessons/${encodeURIComponent(String(lessonId))}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  );
}
