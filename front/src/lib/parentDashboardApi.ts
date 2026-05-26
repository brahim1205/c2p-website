import { apiRequest } from './api';

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  relationship?: string | null;
  status?: string | null;
  alert_channel?: string | null;
  created_at?: string | null;
}

export interface ParentEnrollmentCourse {
  id: number;
  title?: string | null;
  category?: string | null;
  duration?: string | null;
  delivery_mode?: string | null;
  program_branch?: string | null;
}

export interface ParentEnrollment {
  id: number;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  course_id: number;
  progress: number;
  grade?: number | null;
  status?: string | null;
  last_active?: string | null;
  enrolled_at?: string | null;
  courses?: ParentEnrollmentCourse | null;
}

export interface ParentCertificate {
  id: number;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  course_id: number;
  course_name?: string | null;
  title?: string | null;
  grade?: number | null;
  status?: string | null;
  issued_at?: string | null;
  completion_date?: string | null;
}

export async function fetchParentDashboardSnapshot(userId: string) {
  void userId;
  return apiRequest<{
    links: ParentStudentLink[];
    enrollments: ParentEnrollment[];
    certificates: ParentCertificate[];
  }>('/learning/parent/dashboard');
}
