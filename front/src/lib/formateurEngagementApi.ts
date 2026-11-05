import { apiRequest } from '@/lib/api';

export interface FormateurReview {
  id: string | number;
  course_id: string | number;
  course_name: string | null;
  student_id: string | null;
  student_name?: string | null;
  student_avatar?: string | null;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
  instructor_response?: string | null;
  instructor_response_at?: string | null;
}

export interface FormateurAnnouncement {
  id: string | number;
  course_id: string | number;
  course_name: string | null;
  title: string;
  message: string;
  recipients_count: number;
  delivered_count?: number;
  created_at: string;
}

export async function fetchFormateurReviews() {
  return apiRequest<{ courses: Array<{ id: string | number; title: string }>; reviews: FormateurReview[] }>('/learning/formateur/reviews');
}

export async function respondToFormateurReview(reviewId: string | number, response: string) {
  return apiRequest<FormateurReview>(`/learning/formateur/reviews/${encodeURIComponent(String(reviewId))}/response`, {
    method: 'PATCH',
    body: JSON.stringify({ response }),
  });
}

export async function fetchFormateurAnnouncements() {
  return apiRequest<{
    courses: Array<{ id: string | number; title: string; learners: number }>;
    announcements: FormateurAnnouncement[];
  }>('/learning/formateur/announcements');
}

export async function createFormateurAnnouncement(courseId: string | number, input: { title: string; message: string }) {
  return apiRequest<FormateurAnnouncement>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/announcements`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
