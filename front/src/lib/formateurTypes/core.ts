import type { FinanceSnapshot, PayoutAccount, PayoutRequest } from '@/lib/saasApi';

export type FormateurCourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type FormateurCourseDeliveryMode = 'online' | 'onsite' | 'hybrid';

export interface FormateurDashboardUser {
  id: string;
  role: string;
}

export interface FormateurCourse {
  id: number | string;
  title: string;
  category: string | null;
  description: string | null;
  level: FormateurCourseLevel;
  delivery_mode: FormateurCourseDeliveryMode;
  access_type?: 'free' | 'paid';
  is_free: boolean;
  promotion_percentage: number;
  trailer_url: string | null;
  status: string;
  students_count: number;
  completion_rate: number;
  revenue: number;
  modules: number;
  lessons_count?: number;
  assets_count?: number;
  preview_lessons_count?: number;
  published_lessons_count?: number;
  duration: string | null;
  updated_at: string;
  thumbnail: string | null;
  price?: number | null;
  current_price?: number | null;
  views?: number;
  instructor_id?: string;
}

export interface FormateurEnrollment {
  id: number | string;
  student_id: string;
  student_name: string;
  student_email: string | null;
  progress: number;
  last_active: string;
  course_id: number | string;
  course_name?: string | null;
  attention_level?: 'on_track' | 'watch' | 'at_risk' | 'completed' | string;
  pending_grading_count?: number;
  certificate_status?: string;
  days_since_active?: number;
  status?: string;
  enrolled_at?: string;
}

export interface FormateurExam {
  id: number | string;
  title: string;
  instructions?: string | null;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    mimeType: string;
    resourceType: string;
  }> | null;
  type: string;
  course_id: number | string;
  course_name?: string | null;
  status: string;
  max_grade: number;
  submitted?: number;
  avg_grade?: number | null;
  questions_count?: number;
  open_questions_count?: number;
  auto_gradable?: boolean;
  exam_date?: string;
}

export interface FormateurSubmission {
  id: number | string;
  exam_id: number | string;
  student_id: string;
  student_name?: string | null;
  status: string;
  submitted_at: string | null;
  grade: number | null;
}

export interface FormateurCertificate {
  id: number;
  student_name: string;
  student_avatar: string | null;
  course_id: number | null;
  course_name: string | null;
  completion_date: string | null;
  final_grade: number | null;
  status: string;
  certificate_id: string | null;
  issued_at: string | null;
  created_at: string;
}

export interface FormateurDashboardSnapshot {
  courses: FormateurCourse[];
  students: FormateurEnrollment[];
  exams: FormateurExam[];
  submissions: FormateurSubmission[];
  finance: FinanceSnapshot | null;
}

export interface FormateurRevenueSnapshot {
  courses: FormateurCourse[];
  accounts: PayoutAccount[];
  requests: PayoutRequest[];
}
