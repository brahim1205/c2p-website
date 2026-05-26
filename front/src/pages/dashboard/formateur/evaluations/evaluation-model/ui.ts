import type { CourseDeliveryMode, ExamType, QuestionType, Submission } from './types';

export function getFieldClass(hasError?: boolean) {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
  }`;
}

export function formatExamGrade(grade: number | null, maxGrade: number) {
  return grade != null ? `${grade}/${maxGrade}` : '-';
}

export function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return 'Fichier';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} Mo`;
}

export function isHumanCorrectedExamType(type: ExamType) {
  return type === 'assignment' || type === 'project';
}

export function isExamTypeAllowedForDelivery(type: ExamType, deliveryMode?: CourseDeliveryMode) {
  if (type === 'quiz') return true;
  return deliveryMode === 'hybrid' || deliveryMode === 'onsite';
}

export function getCourseDeliveryLabel(deliveryMode?: CourseDeliveryMode) {
  if (deliveryMode === 'hybrid') return 'Hybride';
  if (deliveryMode === 'onsite') return 'Présentiel';
  return 'En ligne';
}

export function getExamTypeLabel(type: ExamType) {
  if (type === 'assignment') return 'Devoir';
  if (type === 'project') return 'Projet';
  return 'Quiz';
}

export function getExamStatusMeta(status: string) {
  const styles: Record<string, string> = {
    upcoming: 'bg-blue-100 text-blue-700',
    ongoing: 'bg-green-100 text-green-700',
    graded: 'bg-purple-100 text-purple-700',
    closed: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    upcoming: 'À venir',
    ongoing: 'En cours',
    graded: 'Noté',
    closed: 'Clôturé',
  };
  return {
    className: styles[status] || 'bg-gray-100 text-gray-700',
    label: labels[status] || status,
  };
}

export function getSubmissionStatusMeta(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    graded: 'bg-green-100 text-green-700',
    late: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: 'À corriger',
    graded: 'Corrigé',
    late: 'En retard',
  };
  return {
    className: styles[status] || 'bg-gray-100 text-gray-700',
    label: labels[status] || status,
  };
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

export function isReadableDocumentUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

export function getTextSubmissionContent(submission: Submission) {
  if (!submission.file_url || isReadableDocumentUrl(submission.file_url)) return null;
  return submission.file_url;
}

export function getDocumentSubmissionUrl(submission: Submission) {
  return isReadableDocumentUrl(submission.file_url) ? submission.file_url : null;
}
