import type { UploadResourceType } from '@/lib/uploadApi';

export type EntityId = number | string;
export type ExamType = 'quiz' | 'assignment' | 'project';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open';
export type CourseDeliveryMode = 'online' | 'onsite' | 'hybrid';

export interface ExamAttachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  resourceType: UploadResourceType;
}

export interface Exam {
  id: EntityId;
  course_id: EntityId | null;
  instructor_id?: string | null;
  title: string;
  instructions?: string | null;
  attachments?: ExamAttachment[] | null;
  course_name: string | null;
  type: ExamType;
  exam_date: string | null;
  participants: number;
  submitted: number;
  avg_grade: number | null;
  status: string;
  max_grade: number;
  questions_count?: number;
  open_questions_count?: number;
  auto_gradable?: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: EntityId;
  exam_id: EntityId;
  prompt: string;
  type: QuestionType;
  points: number;
  explanation: string;
  required: boolean;
  position: number;
  choices_count?: number;
  correct_choices_count?: number;
}

export interface QuizChoice {
  id: EntityId;
  question_id: EntityId;
  exam_id: EntityId;
  label: string;
  value: string;
  is_correct: boolean;
  position: number;
  question_type?: QuestionType;
}

export interface QuizAnswer {
  question_id: EntityId;
  question_prompt: string;
  question_type: QuestionType;
  answer_text: string | null;
  selected_choice_ids: string[];
}

export interface Submission {
  id: EntityId;
  exam_id: EntityId;
  student_id: string;
  student_name: string;
  student_avatar: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  status: string;
  file_name: string | null;
  file_url: string | null;
  answers?: QuizAnswer[] | null;
}

export interface CourseOption {
  id: EntityId;
  title: string;
  delivery_mode?: CourseDeliveryMode;
}

export interface QuestionDraft {
  prompt: string;
  type: QuestionType;
  points: number;
  explanation: string;
  required: boolean;
}

export interface ChoiceDraft {
  label: string;
  value: string;
  is_correct: boolean;
}

export type ExamFormErrors = Partial<Record<'title' | 'course_id' | 'exam_date' | 'participants' | 'max_grade', string>>;
export type GradeFormErrors = Partial<Record<'gradeValue' | 'feedbackValue', string>>;
