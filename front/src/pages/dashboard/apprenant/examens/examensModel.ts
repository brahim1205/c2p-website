import type {
  ApprenantExam as Exam,
  ApprenantSubmission,
  ApprenantExamType as ExamType,
  ApprenantQuestionType as QuestionType,
} from '@/lib/apprenantDashboardApi';
import type { UploadResourceType } from '@/lib/uploadApi';

export type EntityId = number | string;
export type ExamFilter = 'all' | 'todo' | 'pending' | 'graded';

export interface ExamWithStatus extends Exam {
  submitted: boolean;
  myGrade: number | null;
  myStatus: string | null;
  /** A new attempt is allowed (new version requested, or failed quiz with attempts left). */
  canRetry: boolean;
  attempt: number;
  myFeedback: string | null;
}

export interface QuizAnswerDraft {
  answer_text: string;
  selected_choice_ids: string[];
}

export function getTypeLabel(type: ExamType) {
  if (type === 'assignment') return 'Devoir';
  if (type === 'project') return 'Projet';
  return 'Quiz';
}

export function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return 'Fichier';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} Mo`;
}

export function getUploadResourceType(file: File): UploadResourceType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'raw';
}

export function getStatusLabel(status: string | null) {
  if (status === 'graded') return 'Corrigé';
  if (status === 'resubmit') return 'Nouvelle version demandée';
  if (status === 'pending') return 'À corriger';
  if (status === 'late') return 'En retard';
  return 'À faire';
}

export function getStatusClass(status: string | null) {
  if (status === 'graded') return 'bg-green-100 text-green-700';
  if (status === 'resubmit') return 'bg-blue-100 text-blue-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  if (status === 'late') return 'bg-red-100 text-red-700';
  return 'bg-blue-100 text-blue-700';
}

export function getQuestionTypeLabel(type: QuestionType) {
  switch (type) {
    case 'single_choice':
      return 'Choix unique';
    case 'multiple_choice':
      return 'Choix multiples';
    case 'true_false':
      return 'Vrai/Faux';
    case 'open':
      return 'Réponse ouverte';
    default:
      return type;
  }
}

export function orderByPosition<T extends { position?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

export function isSingleAnswerType(type: QuestionType) {
  return type === 'single_choice' || type === 'true_false';
}

/** Counters of the learner's exams page (an exam awaiting a new attempt counts as "to do"). */
export function computeExamStats(exams: ExamWithStatus[], submissions: Array<{ status: string }>) {
  return {
    total: exams.length,
    todo: exams.filter((exam) => !exam.submitted || exam.canRetry).length,
    pending: submissions.filter((submission) => submission.status === 'pending').length,
    graded: submissions.filter((submission) => submission.status === 'graded').length,
  };
}

export function filterExams(exams: ExamWithStatus[], filter: ExamFilter) {
  if (filter === 'todo') return exams.filter((exam) => !exam.submitted || exam.canRetry);
  if (filter === 'pending') return exams.filter((exam) => exam.myStatus === 'pending');
  if (filter === 'graded') return exams.filter((exam) => exam.myStatus === 'graded');
  return exams;
}

/** Each exam with the learner's own submission state (status, grade, retry rights...). */
export function withMyStatus(exams: Exam[], submissions: ApprenantSubmission[]): ExamWithStatus[] {
  return exams.map((exam) => {
    const mine = submissions.find((submission) => String(submission.exam_id) === String(exam.id));
    return {
      ...exam,
      submitted: Boolean(mine),
      myGrade: mine?.grade ?? null,
      myStatus: mine?.status ?? null,
      canRetry: Boolean(mine?.can_retry),
      attempt: mine?.attempt ?? (mine ? 1 : 0),
      myFeedback: mine?.feedback ?? null,
    };
  });
}
