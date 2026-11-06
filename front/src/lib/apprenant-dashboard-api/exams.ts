import { apiRequest } from '../api';
import type { ApprenantExam, ApprenantQuizChoice, ApprenantQuizQuestion, ApprenantSubmission } from './types';

export async function fetchApprenantQuizStructure(examId: string | number) {
  return apiRequest<{ questions: ApprenantQuizQuestion[]; choices: ApprenantQuizChoice[] }>(
    `/learning/apprenant/exams/${encodeURIComponent(String(examId))}/quiz`,
  );
}

export async function submitApprenantExamAnswer(input: {
  userId: string;
  studentName: string;
  exam: Pick<ApprenantExam, 'id' | 'title' | 'instructor_id' | 'type'>;
  submissionPayload: Record<string, unknown>;
}) {
  return apiRequest<ApprenantSubmission>(
    `/learning/apprenant/exams/${encodeURIComponent(String(input.exam.id))}/submissions`,
    {
      method: 'POST',
      body: JSON.stringify(input.submissionPayload),
    },
  );
}

/** Starts (or resumes) a quiz attempt; for a timed quiz the server fixes the deadline. */
export async function startApprenantExam(examId: string | number) {
  return apiRequest<{ timer_minutes: number; started_at: string | null; deadline: string | null; attempt: number }>(
    `/learning/apprenant/exams/${encodeURIComponent(String(examId))}/start`,
    { method: 'POST' },
  );
}
