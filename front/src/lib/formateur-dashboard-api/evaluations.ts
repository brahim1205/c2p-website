import { apiRequest } from '@/lib/api';
import type {
  FormateurEvaluationSnapshot,
  FormateurEvaluationSubmission,
  FormateurExam,
  FormateurQuizChoice,
  FormateurQuizQuestion,
} from '../formateurDashboardTypes';

export async function fetchFormateurEvaluations(userId: string): Promise<FormateurEvaluationSnapshot> {
  void userId;
  return apiRequest<FormateurEvaluationSnapshot>('/learning/formateur/evaluations');
}

export async function fetchFormateurQuizStructure(userId: string, examId: string | number) {
  void userId;
  return apiRequest<{ questions: FormateurQuizQuestion[]; choices: FormateurQuizChoice[] }>(
    `/learning/formateur/exams/${encodeURIComponent(String(examId))}/quiz`,
  );
}

export async function gradeFormateurSubmission(userId: string, input: {
  submissionId: string | number;
  examId: string | number;
  studentId: string;
  examTitle: string;
  grade: number;
  maxGrade: number;
  feedback: string;
}) {
  void userId;
  return apiRequest<FormateurEvaluationSubmission>(
    `/learning/formateur/submissions/${encodeURIComponent(String(input.submissionId))}/grade`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export async function createFormateurExam(userId: string, payload: {
  course_id: string | number;
  title: string;
  course_name: string;
  type: string;
  instructions?: string | null;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    mimeType: string;
    resourceType: string;
  }> | null;
  exam_date: string | null | undefined;
  participants: number;
  submitted: number;
  status: string;
  max_grade: number;
}) {
  void userId;
  return apiRequest<FormateurExam>('/learning/formateur/exams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteFormateurExam(userId: string, examId: string | number) {
  void userId;
  return apiRequest<FormateurExam>(`/learning/formateur/exams/${encodeURIComponent(String(examId))}`, {
    method: 'DELETE',
  });
}

export async function createFormateurQuizQuestion(userId: string, input: {
  examId: string | number;
  prompt: string;
  type: FormateurQuizQuestion['type'];
  points: number;
  explanation: string;
  required: boolean;
}) {
  void userId;
  return apiRequest<FormateurQuizQuestion>(
    `/learning/formateur/exams/${encodeURIComponent(String(input.examId))}/quiz/questions`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateFormateurQuizQuestion(userId: string, question: Pick<FormateurQuizQuestion, 'id' | 'exam_id'>, draft: {
  prompt: string;
  type: FormateurQuizQuestion['type'];
  points: number;
  explanation: string;
  required: boolean;
}, existingChoicesCount: number) {
  void userId;
  return apiRequest<FormateurQuizQuestion>(
    `/learning/formateur/quiz/questions/${encodeURIComponent(String(question.id))}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ...draft, existingChoicesCount }),
    },
  );
}

export async function deleteFormateurQuizQuestion(userId: string, question: Pick<FormateurQuizQuestion, 'id' | 'exam_id'>) {
  void userId;
  void question.exam_id;
  return apiRequest<FormateurQuizQuestion>(
    `/learning/formateur/quiz/questions/${encodeURIComponent(String(question.id))}`,
    { method: 'DELETE' },
  );
}

export async function reorderFormateurQuizQuestion(userId: string, examId: string | number, current: Pick<FormateurQuizQuestion, 'id' | 'position'>, target: Pick<FormateurQuizQuestion, 'id' | 'position'>) {
  void userId;
  return apiRequest<FormateurQuizQuestion[]>(
    `/learning/formateur/exams/${encodeURIComponent(String(examId))}/quiz/questions/reorder`,
    {
      method: 'PATCH',
      body: JSON.stringify({ currentId: current.id, targetId: target.id }),
    },
  );
}

export async function createFormateurQuizChoice(userId: string, input: {
  examId: string | number;
  questionId: string | number;
  label: string;
  value: string;
  is_correct: boolean;
  resetOtherCorrectChoices?: Array<string | number>;
}) {
  void userId;
  return apiRequest<FormateurQuizChoice>(
    `/learning/formateur/exams/${encodeURIComponent(String(input.examId))}/quiz/choices`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateFormateurQuizChoice(userId: string, input: {
  examId: string | number;
  choiceId: string | number;
  label: string;
  value: string;
  is_correct: boolean;
  resetOtherCorrectChoices?: Array<string | number>;
}) {
  void userId;
  return apiRequest<FormateurQuizChoice>(
    `/learning/formateur/quiz/choices/${encodeURIComponent(String(input.choiceId))}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export async function deleteFormateurQuizChoice(userId: string, examId: string | number, choiceId: string | number) {
  void userId;
  return apiRequest<FormateurQuizChoice>(
    `/learning/formateur/exams/${encodeURIComponent(String(examId))}/quiz/choices/${encodeURIComponent(String(choiceId))}`,
    { method: 'DELETE' },
  );
}

export async function reorderFormateurQuizChoice(userId: string, examId: string | number, current: Pick<FormateurQuizChoice, 'id' | 'position'>, target: Pick<FormateurQuizChoice, 'id' | 'position'>) {
  void userId;
  return apiRequest<FormateurQuizChoice[]>(
    `/learning/formateur/exams/${encodeURIComponent(String(examId))}/quiz/choices/reorder`,
    {
      method: 'PATCH',
      body: JSON.stringify({ currentId: current.id, targetId: target.id }),
    },
  );
}
