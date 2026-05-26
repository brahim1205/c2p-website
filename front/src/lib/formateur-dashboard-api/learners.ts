import { apiRequest } from '@/lib/api';
import type {
  FormateurCourse,
  FormateurLearnerDetail,
  FormateurLearnerEnrollment,
} from '../formateurDashboardTypes';

export async function fetchFormateurLearners(userId: string) {
  void userId;
  return apiRequest<{ courses: FormateurCourse[]; enrollments: FormateurLearnerEnrollment[] }>('/learning/formateur/learners');
}

export async function fetchFormateurLearnerDetail(userId: string, studentId: string): Promise<FormateurLearnerDetail> {
  void userId;
  return apiRequest<FormateurLearnerDetail>(`/learning/formateur/learners/${encodeURIComponent(studentId)}`);
}
