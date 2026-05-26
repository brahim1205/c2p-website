import type { Dispatch, SetStateAction } from 'react';
import {
  isHumanCorrectedExamType,
  makeChoiceDraft,
  makeExamDraft,
  makeQuestionDraft,
  type ExamDraft,
  type ExamType,
  type QuestionChoiceDraft,
  type QuestionDraft,
  type QuestionType,
  type WizardDraftState,
} from './courseWizardModel';

interface UseCourseWizardEvaluationsParams {
  setWizard: Dispatch<SetStateAction<WizardDraftState>>;
  updateExams: (updater: (exams: ExamDraft[]) => ExamDraft[]) => void;
}

export function useCourseWizardEvaluations({
  setWizard,
  updateExams,
}: UseCourseWizardEvaluationsParams) {
  const addExam = () => {
    const exam = makeExamDraft();
    setWizard((current) => ({
      ...current,
      exams: [...current.exams, exam],
      selectedExamId: exam.id,
    }));
  };

  const updateExam = <K extends keyof ExamDraft>(examId: string, field: K, value: ExamDraft[K]) => {
    updateExams((exams) => exams.map((exam) => (
      exam.id === examId
        ? {
          ...exam,
          [field]: value,
          ...(field === 'type' && isHumanCorrectedExamType(value as ExamType)
            ? { auto_correction: false, questions: [] }
            : field === 'type' && value === 'quiz' && exam.questions.length === 0
              ? { auto_correction: true, questions: [makeQuestionDraft()] }
              : {}),
        }
        : exam
    )));
  };

  const addQuestion = (examId: string) => {
    updateExams((exams) => exams.map((exam) => (
      exam.id === examId
        ? { ...exam, questions: [...exam.questions, makeQuestionDraft()] }
        : exam
    )));
  };

  const updateQuestion = <K extends keyof QuestionDraft>(examId: string, questionId: string, field: K, value: QuestionDraft[K]) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => {
          if (question.id !== questionId) return question;
          if (field === 'type') {
            const nextType = value as QuestionType;
            return {
              ...question,
              type: nextType,
              choices: nextType === 'open'
                ? []
                : nextType === 'true_false'
                  ? [makeChoiceDraft('Vrai', 'true'), makeChoiceDraft('Faux', 'false')]
                  : question.choices.length > 0
                    ? question.choices
                    : [makeChoiceDraft()],
            };
          }
          return { ...question, [field]: value };
        }),
      };
    }));
  };

  const removeQuestion = (examId: string, questionId: string) => {
    updateExams((exams) => exams.map((exam) => (
      exam.id === examId
        ? { ...exam, questions: exam.questions.filter((question) => question.id !== questionId) }
        : exam
    )));
  };

  const addChoice = (examId: string, questionId: string) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => (
          question.id === questionId
            ? { ...question, choices: [...question.choices, makeChoiceDraft()] }
            : question
        )),
      };
    }));
  };

  const updateChoice = <K extends keyof QuestionChoiceDraft>(
    examId: string,
    questionId: string,
    choiceId: string,
    field: K,
    value: QuestionChoiceDraft[K],
  ) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => {
          if (question.id !== questionId) return question;
          return {
            ...question,
            choices: question.choices.map((choice) => {
              if (choice.id !== choiceId) {
                if (field === 'is_correct' && value === true && ['single_choice', 'true_false'].includes(question.type)) {
                  return { ...choice, is_correct: false };
                }
                return choice;
              }
              return {
                ...choice,
                [field]: value,
              };
            }),
          };
        }),
      };
    }));
  };

  const removeChoice = (examId: string, questionId: string, choiceId: string) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => (
          question.id === questionId
            ? { ...question, choices: question.choices.filter((choice) => choice.id !== choiceId) }
            : question
        )),
      };
    }));
  };

  return {
    addChoice,
    addExam,
    addQuestion,
    removeChoice,
    removeQuestion,
    updateChoice,
    updateExam,
    updateQuestion,
  };
}
