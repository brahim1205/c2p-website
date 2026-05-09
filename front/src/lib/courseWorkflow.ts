export type CourseWorkflowStatus = 'draft' | 'review' | 'published' | 'rejected' | 'archived';

export type CourseWorkflowAction = 'submit' | 'withdraw' | 'archive' | 'reopen';

export interface CourseReadinessInput {
  description?: string | null;
  duration?: string | null;
  thumbnail?: string | null;
  sectionCount: number;
  lessonCount: number;
}

export const courseStatusLabels: Record<CourseWorkflowStatus, string> = {
  draft: 'Brouillon',
  review: 'En révision',
  published: 'Publiée',
  rejected: 'Rejetée',
  archived: 'Archivée',
};

export const courseStatusClasses: Record<CourseWorkflowStatus, string> = {
  draft: 'bg-amber-100 text-amber-700',
  review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-gray-200 text-gray-700',
};

export function getCourseReadinessIssues(course: CourseReadinessInput) {
  const issues: string[] = [];
  if (!String(course.description ?? '').trim()) {
    issues.push('une description');
  }
  if (!String(course.duration ?? '').trim()) {
    issues.push('une durée');
  }
  if (!String(course.thumbnail ?? '').trim()) {
    issues.push('une miniature');
  }
  if (course.sectionCount <= 0) {
    issues.push('au moins une section');
  }
  if (course.lessonCount <= 0) {
    issues.push('au moins une leçon');
  }
  return issues;
}

export function getInstructorWorkflowAction(status: CourseWorkflowStatus): {
  action: CourseWorkflowAction;
  nextStatus: CourseWorkflowStatus;
  label: string;
  description: string;
} | null {
  switch (status) {
    case 'draft':
      return {
        action: 'submit',
        nextStatus: 'review',
        label: 'Soumettre',
        description: 'Envoyer en révision',
      };
    case 'review':
      return {
        action: 'withdraw',
        nextStatus: 'draft',
        label: 'Retirer',
        description: 'Revenir en brouillon',
      };
    case 'published':
      return {
        action: 'archive',
        nextStatus: 'archived',
        label: 'Archiver',
        description: 'Retirer du catalogue',
      };
    case 'rejected':
    case 'archived':
      return {
        action: 'reopen',
        nextStatus: 'draft',
        label: 'Reprendre',
        description: 'Repasser en brouillon',
      };
    default:
      return null;
  }
}
