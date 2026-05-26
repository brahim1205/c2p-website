import type {
  ChoiceDraft,
  Exam,
  QuestionDraft,
  QuestionType,
  QuizAnswer,
  QuizChoice,
  QuizQuestion,
  Submission,
} from './types';

export function makeQuestionDraft(type: QuestionType = 'single_choice'): QuestionDraft {
  return {
    prompt: '',
    type,
    points: 10,
    explanation: '',
    required: true,
  };
}

export function makeChoiceDraft(): ChoiceDraft {
  return {
    label: '',
    value: '',
    is_correct: false,
  };
}

export function orderByPosition<T extends { position?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

export function groupQuizChoicesByQuestion(choices: QuizChoice[]) {
  const grouped = new Map<string, QuizChoice[]>();
  for (const choice of choices) {
    const key = String(choice.question_id);
    grouped.set(key, [...(grouped.get(key) ?? []), choice]);
  }
  return grouped;
}

export function computeEvaluationStats(exams: Exam[], submissions: Submission[]) {
  const pendingCount = submissions.filter((submission) => submission.status === 'pending').length;
  const gradedExams = exams.filter((exam) => exam.avg_grade != null && exam.max_grade > 0);
  const averageGradePercent = gradedExams.length
    ? Math.round(
      gradedExams.reduce((sum, exam) => sum + (((exam.avg_grade || 0) / exam.max_grade) * 100), 0)
      / gradedExams.length,
    )
    : 0;

  return {
    averageGradePercent,
    pendingCount,
  };
}

export function isSingleAnswerType(type: QuestionType) {
  return type === 'single_choice' || type === 'true_false';
}

export function buildQuestionDrafts(questions: QuizQuestion[]) {
  return Object.fromEntries(
    questions.map((question) => [
      String(question.id),
      {
        prompt: question.prompt,
        type: question.type,
        points: question.points,
        explanation: question.explanation || '',
        required: Boolean(question.required),
      } satisfies QuestionDraft,
    ]),
  );
}

export function buildChoiceDrafts(choices: QuizChoice[]) {
  return Object.fromEntries(
    choices.map((choice) => [
      String(choice.id),
      {
        label: choice.label,
        value: choice.value || choice.label,
        is_correct: Boolean(choice.is_correct),
      } satisfies ChoiceDraft,
    ]),
  );
}

export function sameSelection(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right.map(String));
  return left.every((value) => rightSet.has(String(value)));
}

export function computeSuggestedGrade(
  answers: QuizAnswer[],
  questions: QuizQuestion[],
  choices: QuizChoice[],
  maxGrade: number,
) {
  const questionsById = new Map(questions.map((question) => [String(question.id), question]));
  const choicesByQuestion = groupQuizChoicesByQuestion(choices);

  let totalPoints = 0;
  let earnedPoints = 0;
  for (const answer of answers) {
    if (answer.question_type === 'open') continue;
    const question = questionsById.get(String(answer.question_id));
    const questionPoints = Number(question?.points ?? 0);
    if (questionPoints <= 0) continue;

    const correctChoiceIds = (choicesByQuestion.get(String(answer.question_id)) ?? [])
      .filter((choice) => choice.is_correct)
      .map((choice) => String(choice.id));
    if (correctChoiceIds.length === 0) continue;

    totalPoints += questionPoints;
    if (sameSelection(answer.selected_choice_ids.map(String), correctChoiceIds)) {
      earnedPoints += questionPoints;
    }
  }

  if (totalPoints <= 0) return null;
  return Math.round(((earnedPoints / totalPoints) * maxGrade) * 2) / 2;
}
