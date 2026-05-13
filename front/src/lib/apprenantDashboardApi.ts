import { backendClient } from '@/lib/backendClient';
import { notifyFormateurNewSubmission } from '@/hooks/useCreateNotification';

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
  pending_grading_count?: number;
  certificate_status?: string;
  courses: ApprenantEnrollmentCourse | null;
}

export interface ApprenantCertificate {
  id: number;
  student_id: string;
  title: string;
  course_name: string | null;
  final_grade?: number | null;
  grade: number | null;
  status: string;
  certificate_id: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  completion_date?: string | null;
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
}

export type ApprenantExamType = 'quiz' | 'assignment' | 'project';
export type ApprenantQuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open';

export interface ApprenantExam {
  id: number | string;
  course_id: number | string;
  title: string;
  course_name: string | null;
  instructor_id: string | null;
  type: ApprenantExamType;
  exam_date: string | null;
  max_grade: number;
  status: string;
  questions_count?: number;
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
  is_correct: boolean;
  position: number;
}

export interface ApprenantQuizAnswerPayload {
  question_id: number | string;
  answer_text: string | null;
  selected_choice_ids: string[];
}

function throwApiError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message || 'Backend request failed.');
  }
}

export async function fetchApprenantEnrollments(userId: string, options?: { limit?: number }) {
  const query = backendClient
    .from<ApprenantEnrollment>('course_enrollments')
    .select('*, courses(id, title, category, description, modules, duration, thumbnail, price)')
    .eq('student_id', userId)
    .order('last_active', { ascending: false });

  if (options?.limit) {
    query.limit(options.limit);
  }

  const { data, error } = await query;
  throwApiError(error);
  return data || [];
}

export async function fetchApprenantCertificates(
  userId: string,
  options?: { limit?: number; status?: 'issued' | 'ready' | 'pending' },
) {
  const query = backendClient
    .from<ApprenantCertificate>('certificates')
    .select('*')
    .eq('student_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query.eq('status', options.status);
  }

  if (options?.limit) {
    query.limit(options.limit);
  }

  const { data, error } = await query;
  throwApiError(error);
  return data || [];
}

export async function fetchApprenantDashboardSnapshot(userId: string) {
  const [enrollments, certificates] = await Promise.all([
    fetchApprenantEnrollments(userId, { limit: 5 }),
    fetchApprenantCertificates(userId, { limit: 5, status: 'issued' }),
  ]);

  return { enrollments, certificates };
}

export async function fetchApprenantProgressionSnapshot(userId: string) {
  const [enrollments, certificates, submissions] = await Promise.all([
    fetchApprenantEnrollments(userId),
    fetchApprenantCertificates(userId),
    backendClient
      .from<ApprenantSubmission>('submissions')
      .select('*')
      .eq('student_id', userId)
      .order('submitted_at', { ascending: false }),
  ]);

  throwApiError(submissions.error);

  return {
    enrollments,
    certificates,
    submissions: submissions.data || [],
  };
}

export async function fetchApprenantExamensSnapshot(userId: string) {
  const [examsRes, submissions] = await Promise.all([
    backendClient
      .from<ApprenantExam>('exams')
      .select('*')
      .eq('status', 'ongoing')
      .order('exam_date', { ascending: false }),
    backendClient
      .from<ApprenantSubmission>('submissions')
      .select('*')
      .eq('student_id', userId)
      .order('submitted_at', { ascending: false }),
  ]);

  throwApiError(examsRes.error);
  throwApiError(submissions.error);

  return {
    exams: examsRes.data || [],
    submissions: submissions.data || [],
  };
}

export async function fetchApprenantQuizStructure(examId: string | number) {
  const [questionsRes, choicesRes] = await Promise.all([
    backendClient
      .from<ApprenantQuizQuestion>('quiz_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('position', { ascending: true }),
    backendClient
      .from<ApprenantQuizChoice>('quiz_choices')
      .select('*')
      .eq('exam_id', examId)
      .order('position', { ascending: true }),
  ]);

  throwApiError(questionsRes.error);
  throwApiError(choicesRes.error);

  return {
    questions: questionsRes.data || [],
    choices: choicesRes.data || [],
  };
}

export async function submitApprenantExamAnswer(input: {
  userId: string;
  studentName: string;
  exam: Pick<ApprenantExam, 'id' | 'title' | 'instructor_id' | 'type'>;
  submissionPayload: Record<string, unknown>;
}) {
  const { error } = await backendClient.from('submissions').insert(input.submissionPayload);
  throwApiError(error);

  if (input.exam.instructor_id) {
    await notifyFormateurNewSubmission(input.exam.instructor_id, input.exam.title);
  }
}
