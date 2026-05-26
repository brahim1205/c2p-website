import type { CourseWorkflowStatus } from '@/lib/courseWorkflow';

export interface Course {
  id: number | string;
  title: string;
  category: string | null;
  description: string | null;
  status: CourseWorkflowStatus;
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
  price: number | null;
}

export interface Enrollment {
  id: number;
  student_id: string;
  student_name: string;
  student_email: string | null;
  progress: number;
  last_active: string;
  course_id: number;
  course_name?: string | null;
  attention_level?: 'on_track' | 'watch' | 'at_risk' | 'completed' | string;
  pending_grading_count?: number;
  certificate_status?: string;
  days_since_active?: number;
}

export interface Exam {
  id: number;
  title: string;
  type: string;
  course_id: number;
  course_name?: string | null;
  status: string;
  max_grade: number;
  submitted?: number;
  avg_grade?: number | null;
  questions_count?: number;
  open_questions_count?: number;
  auto_gradable?: boolean;
}

export interface Submission {
  id: number;
  exam_id: number;
  student_id: string;
  student_name?: string | null;
  status: string;
  submitted_at: string | null;
  grade: number | null;
}

export interface CourseInsight extends Course {
  readinessIssues: string[];
  workflowActionLabel: string | null;
}

export interface ExamWithInsights extends Exam {
  pendingCorrections: number;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
  icon: string;
  surface: string;
}

export interface DashboardQuickLink {
  label: string;
  icon: string;
  path: string;
  tone: string;
}

export function formatCurrency(amount: number) {
  if (!amount) return '0 FCFA';
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function getDaysSince(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

export function formatRelativeActivity(value: string | null | undefined) {
  const days = getDaysSince(value);
  if (days === null) return '-';
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return `Il y a ${days} j`;
}

export function getExamTypeLabel(type: string) {
  const labels: Record<string, string> = {
    quiz: 'Quiz',
    assignment: 'Devoir',
    project: 'Projet',
    oral: 'Oral',
  };
  return labels[type] || type;
}
