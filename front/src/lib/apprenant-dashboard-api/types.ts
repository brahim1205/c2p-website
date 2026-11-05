import type { BookingRequestType } from '@/lib/clientDashboard';

export interface ApprenantEnrollmentCourse {
  id: number;
  title: string;
  category: string;
  description?: string | null;
  modules: number | null;
  duration: string | null;
  thumbnail: string | null;
  price?: number | null;
}

export interface ApprenantEnrollment {
  id: number;
  course_id: number;
  student_name?: string;
  student_email?: string | null;
  progress: number;
  grade: number | null;
  status: string;
  last_active: string;
  enrolled_at?: string;
  course_name?: string | null;
  course_category?: string | null;
  course_lessons_count?: number;
  completed_lessons_estimate?: number;
  learning_time_seconds?: number;
  pending_grading_count?: number;
  certificate_status?: string;
  courses: ApprenantEnrollmentCourse | null;
}

export interface ApprenantCertificate {
  id: number;
  student_id: string;
  student_name?: string | null;
  title: string;
  course_name: string | null;
  final_grade?: number | null;
  grade: number | null;
  status: string;
  certificate_id: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  completion_date?: string | null;
  course_id?: number | string;
  instructor_name?: string | null;
  course_duration?: string | null;
  progress_percent?: number;
  /** Server-computed progress towards the certificate (status `in_progress`). */
  requirements?: CertificateRequirements | null;
}

export interface CertificateRequirements {
  lessons: { completed: boolean; progress: number };
  exams: Array<{
    exam_id: string;
    title: string;
    status: 'passed' | 'failed' | 'pending_review' | 'resubmit' | 'not_submitted';
    grade: number | null;
    max_grade: number;
    pass_grade: number;
  }>;
  pass_percentage: number;
  ready: boolean;
}

export interface ApprenantSubmission {
  id: number;
  exam_id: number;
  submitted_at: string | null;
  grade: number | null;
  status: string;
  feedback?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  answers?: ApprenantSubmittedAnswer[] | null;
  /** Attempt number (1 = first submission). */
  attempt?: number;
  /** Pass mark of the exam this submission belongs to. */
  pass_grade?: number | null;
  /** True after a "new version" request, or for a failed quiz with attempts left. */
  can_retry?: boolean;
}

export type ApprenantExamType = 'quiz' | 'assignment' | 'project';
export type ApprenantQuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open';

export interface ApprenantExam {
  id: number | string;
  course_id: number | string;
  title: string;
  instructions?: string | null;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    mimeType: string;
    resourceType: string;
  }> | null;
  course_name: string | null;
  instructor_id: string | null;
  type: ApprenantExamType;
  exam_date: string | null;
  max_grade: number;
  status: string;
  questions_count?: number;
  pass_grade?: number;
  max_attempts?: number;
  created_at: string;
}

export interface ApprenantQuizQuestion {
  id: number | string;
  exam_id: number | string;
  prompt: string;
  type: ApprenantQuestionType;
  points: number;
  explanation: string;
  required: boolean;
  position: number;
}

export interface ApprenantQuizChoice {
  id: number | string;
  question_id: number | string;
  exam_id: number | string;
  label: string;
  value: string;
  is_correct?: boolean;
  position: number;
}

export interface ApprenantQuizAnswerPayload {
  question_id: number | string;
  answer_text: string | null;
  selected_choice_ids: string[];
}

export interface ApprenantSubmittedAnswer {
  question_id: number | string;
  question_prompt: string;
  question_type: ApprenantQuestionType;
  answer_text: string | null;
  selected_choice_ids: string[];
  correct_choice_ids?: string[];
  selected_choice_labels?: string[];
  correct_choice_labels?: string[];
  is_correct?: boolean | null;
  points?: number;
  earned_points?: number | null;
}

export interface ApprenantLessonComment {
  id: number | string;
  lesson_id: number | string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  pinned?: boolean;
  parent_id?: number | string | null;
  created_at: string;
}

export type ApprenantBookingRequestType = BookingRequestType;
