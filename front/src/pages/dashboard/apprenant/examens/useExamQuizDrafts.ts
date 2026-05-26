import { useCallback, useEffect, useState } from 'react';
import {
  isSingleAnswerType,
  type EntityId,
  type QuizAnswerDraft,
} from './examensModel';
import type { ApprenantQuizQuestion as QuizQuestion } from '@/lib/apprenantDashboardApi';

type UseExamQuizDraftsArgs = {
  questions: QuizQuestion[] | undefined;
  selectedExamType: string | undefined;
  showSubmitModal: boolean;
};

export function useExamQuizDrafts({
  questions,
  selectedExamType,
  showSubmitModal,
}: UseExamQuizDraftsArgs) {
  const [quizAnswerDrafts, setQuizAnswerDrafts] = useState<Record<string, QuizAnswerDraft>>({});

  const resetQuizDrafts = useCallback(() => {
    setQuizAnswerDrafts({});
  }, []);

  const initializeQuizDrafts = useCallback((nextQuestions: QuizQuestion[]) => {
    setQuizAnswerDrafts(
      Object.fromEntries(
        nextQuestions.map((question) => [
          String(question.id),
          {
            answer_text: '',
            selected_choice_ids: [],
          } satisfies QuizAnswerDraft,
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    if (!showSubmitModal || selectedExamType !== 'quiz' || !questions) return;
    initializeQuizDrafts(questions);
  }, [initializeQuizDrafts, questions, selectedExamType, showSubmitModal]);

  const handleQuizChoiceToggle = (question: QuizQuestion, choiceId: EntityId, checked: boolean) => {
    setQuizAnswerDrafts((current) => {
      const existing = current[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
      const nextSelected = isSingleAnswerType(question.type)
        ? (checked ? [String(choiceId)] : [])
        : (checked
          ? Array.from(new Set([...existing.selected_choice_ids, String(choiceId)]))
          : existing.selected_choice_ids.filter((entry) => entry !== String(choiceId)));

      return {
        ...current,
        [String(question.id)]: {
          ...existing,
          selected_choice_ids: nextSelected,
        },
      };
    });
  };

  const handleQuizOpenAnswerChange = (question: QuizQuestion, value: string) => {
    setQuizAnswerDrafts((current) => {
      const existing = current[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
      return {
        ...current,
        [String(question.id)]: {
          ...existing,
          answer_text: value,
        },
      };
    });
  };

  return {
    handleQuizChoiceToggle,
    handleQuizOpenAnswerChange,
    quizAnswerDrafts,
    resetQuizDrafts,
  };
}
