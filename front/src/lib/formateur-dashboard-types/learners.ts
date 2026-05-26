import type { FormateurEnrollment, FormateurExam, FormateurSubmission } from './core';
import type { FormateurCourseRelation } from './course-program';

export interface FormateurLearnerEnrollment extends FormateurEnrollment {
  grade: number | null;
  student_avatar: string | null;
  enrolled_at: string;
  course_name?: string | null;
  course_category?: string | null;
  course_sections_count?: number;
  course_lessons_count?: number;
  completed_sections_estimate?: number;
  remaining_sections_estimate?: number;
  completed_lessons_estimate?: number;
  remaining_lessons_estimate?: number;
  submissions_count?: number;
  graded_submissions_count?: number;
  avg_submission_grade?: number | null;
  latest_submission_at?: string | null;
  certificate_status?: 'issued' | 'ready' | 'pending' | string;
  certificate_issued_at?: string | null;
  certificate_number?: string | null;
  courses?: FormateurCourseRelation | null;
}

export interface FormateurLearnerCertificate {
  id: number;
  course_id: number;
  course_name: string | null;
  status: string;
  issued_at: string | null;
  final_grade: number | null;
  certificate_number: string | null;
}

export interface FormateurLearnerDetail {
  enrollments: FormateurLearnerEnrollment[];
  submissions: Array<FormateurSubmission & { exam?: FormateurExam | null }>;
  certificates: FormateurLearnerCertificate[];
}
