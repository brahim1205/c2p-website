import type { Exam } from './types';

export const DEFAULT_NEW_EXAM: Partial<Exam> = {
  type: 'quiz',
  status: 'ongoing',
  max_grade: 20,
  participants: 0,
  submitted: 0,
  course_id: null,
  course_name: '',
  attachments: [],
};
