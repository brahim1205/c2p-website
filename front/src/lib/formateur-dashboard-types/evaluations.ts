import type { FormateurCourseDeliveryMode, FormateurExam, FormateurSubmission } from './core';

export interface FormateurQuizQuestion {
  id: number | string;
  exam_id: number | string;
  prompt: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'open';
  points: number;
  explanation: string;
  required: boolean;
  position: number;
  choices_count?: number;
  correct_choices_count?: number;
}

export interface FormateurQuizChoice {
  id: number | string;
  question_id: number | string;
  exam_id: number | string;
  label: string;
  value: string;
  is_correct: boolean;
  position: number;
}

export interface FormateurSubmissionAnswer {
  question_id: number | string;
  question_prompt: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'open';
  answer_text: string | null;
  selected_choice_ids: string[];
}

export interface FormateurEvaluationSubmission extends FormateurSubmission {
  student_avatar: string | null;
  feedback: string | null;
  file_name: string | null;
  file_url: string | null;
  answers?: FormateurSubmissionAnswer[] | null;
}

export interface FormateurEvaluationSnapshot {
  exams: FormateurExam[];
  submissions: FormateurEvaluationSubmission[];
  courses: Array<{ id: string | number; title: string; delivery_mode?: FormateurCourseDeliveryMode }>;
}
