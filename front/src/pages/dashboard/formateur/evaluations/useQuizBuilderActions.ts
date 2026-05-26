import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import {
  createFormateurQuizChoice,
  createFormateurQuizQuestion,
  deleteFormateurQuizChoice,
  deleteFormateurQuizQuestion,
  reorderFormateurQuizChoice,
  reorderFormateurQuizQuestion,
  updateFormateurQuizChoice,
  updateFormateurQuizQuestion,
} from '@/lib/formateurDashboardApi';
import {
  isSingleAnswerType,
  makeChoiceDraft,
  makeQuestionDraft,
  orderByPosition,
  type ChoiceDraft,
  type EntityId,
  type Exam,
  type QuestionDraft,
  type QuizChoice,
  type QuizQuestion,
} from './evaluationModel';

type ToastFn = (title: string, message?: string) => void;

interface SubscriptionGate {
  allowed: boolean;
  title: string;
  message: string;
}

interface UseQuizBuilderActionsParams {
  userId?: string;
  subscriptionGate: SubscriptionGate;
  selectedQuizExam: Exam | null;
  newQuestionDraft: QuestionDraft;
  setNewQuestionDraft: Dispatch<SetStateAction<QuestionDraft>>;
  questionDrafts: Record<string, QuestionDraft>;
  choiceDrafts: Record<string, ChoiceDraft>;
  newChoiceDrafts: Record<string, ChoiceDraft>;
  setNewChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
  quizQuestions: QuizQuestion[];
  quizChoicesByQuestion: Map<string, QuizChoice[]>;
  isMountedRef: MutableRefObject<boolean>;
  refreshQuizStructure: (examId: EntityId) => Promise<void>;
  refreshEvaluations: () => Promise<void>;
  success: ToastFn;
  error: ToastFn;
}

export function useQuizBuilderActions({
  userId,
  subscriptionGate,
  selectedQuizExam,
  newQuestionDraft,
  setNewQuestionDraft,
  questionDrafts,
  choiceDrafts,
  newChoiceDrafts,
  setNewChoiceDrafts,
  quizQuestions,
  quizChoicesByQuestion,
  isMountedRef,
  refreshQuizStructure,
  refreshEvaluations,
  success,
  error,
}: UseQuizBuilderActionsParams) {
  const handleCreateQuestion = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedQuizExam) return;
    if (!newQuestionDraft.prompt.trim()) {
      error('Question invalide', 'L intitule de la question est obligatoire.');
      return;
    }

    try {
      if (!userId) throw new Error('Session invalide');
      await createFormateurQuizQuestion(userId, {
        examId: selectedQuizExam.id,
        prompt: newQuestionDraft.prompt,
        type: newQuestionDraft.type,
        points: newQuestionDraft.points,
        explanation: newQuestionDraft.explanation,
        required: newQuestionDraft.required,
      });

      success('Question ajoutée', 'La question a été ajoutée au quiz.');
      setNewQuestionDraft(makeQuestionDraft());
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), refreshEvaluations()]);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible d ajouter la question.');
      console.error(err);
    }
  };

  const handleSaveQuestion = async (question: QuizQuestion) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedQuizExam) return;
    const draft = questionDrafts[String(question.id)];
    if (!draft || !draft.prompt.trim()) {
      error('Question invalide', 'L intitule de la question est obligatoire.');
      return;
    }

    try {
      const existingChoices = quizChoicesByQuestion.get(String(question.id)) ?? [];
      if (!userId) throw new Error('Session invalide');
      await updateFormateurQuizQuestion(userId, question, draft, existingChoices.length);

      success('Question mise à jour', 'Les modifications ont été enregistrées.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), refreshEvaluations()]);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de mettre à jour la question.');
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (question: QuizQuestion) => {
    if (!userId) return;
    if (!selectedQuizExam) return;
    if (!window.confirm('Supprimer cette question du quiz ?')) return;

    try {
      await deleteFormateurQuizQuestion(userId, question);
      if (!isMountedRef.current) return;
      success('Question supprimée', 'La question a été retirée du quiz.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), refreshEvaluations()]);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de supprimer la question.');
      console.error(err);
    }
  };

  const handleMoveQuestion = async (question: QuizQuestion, direction: -1 | 1) => {
    if (!userId) return;
    if (!selectedQuizExam) return;
    const orderedQuestions = orderByPosition(quizQuestions);
    const currentIndex = orderedQuestions.findIndex((entry) => String(entry.id) === String(question.id));
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedQuestions.length) return;

    const targetQuestion = orderedQuestions[targetIndex];
    try {
      await reorderFormateurQuizQuestion(userId, selectedQuizExam.id, question, targetQuestion);
      await refreshQuizStructure(selectedQuizExam.id);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de reordonner les questions.');
      console.error(err);
    }
  };

  const handleCreateChoice = async (question: QuizQuestion) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedQuizExam) return;
    const draft = newChoiceDrafts[String(question.id)] ?? makeChoiceDraft();
    if (!draft.label.trim()) {
      error('Choix invalide', 'Le libelle du choix est obligatoire.');
      return;
    }

    const existingChoices = quizChoicesByQuestion.get(String(question.id)) ?? [];
    if (question.type === 'true_false' && existingChoices.length >= 2) {
      error('Limite atteinte', 'Une question vrai/faux ne peut contenir que deux choix.');
      return;
    }

    try {
      if (!userId) throw new Error('Session invalide');
      await createFormateurQuizChoice(userId, {
        examId: selectedQuizExam.id,
        questionId: question.id,
        label: draft.label,
        value: draft.value,
        is_correct: draft.is_correct,
        resetOtherCorrectChoices: draft.is_correct && isSingleAnswerType(question.type)
          ? existingChoices.filter((choice) => choice.is_correct).map((choice) => choice.id)
          : [],
      });
      success('Choix ajouté', 'Le choix a été ajouté à la question.');
      setNewChoiceDrafts((previous) => ({
        ...previous,
        [String(question.id)]: makeChoiceDraft(),
      }));
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), refreshEvaluations()]);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible d ajouter le choix.');
      console.error(err);
    }
  };

  const handleSaveChoice = async (question: QuizQuestion, choice: QuizChoice) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedQuizExam) return;
    const draft = choiceDrafts[String(choice.id)];
    if (!draft || !draft.label.trim()) {
      error('Choix invalide', 'Le libelle du choix est obligatoire.');
      return;
    }

    const siblingChoices = (quizChoicesByQuestion.get(String(question.id)) ?? []).filter(
      (entry) => String(entry.id) !== String(choice.id),
    );

    try {
      if (!userId) throw new Error('Session invalide');
      await updateFormateurQuizChoice(userId, {
        examId: selectedQuizExam.id,
        choiceId: choice.id,
        label: draft.label,
        value: draft.value,
        is_correct: draft.is_correct,
        resetOtherCorrectChoices: draft.is_correct && isSingleAnswerType(question.type)
          ? siblingChoices.filter((entry) => entry.is_correct).map((entry) => entry.id)
          : [],
      });
      if (!isMountedRef.current) return;
      success('Choix mis à jour', 'Le choix a été mis à jour.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), refreshEvaluations()]);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de mettre à jour le choix.');
      console.error(err);
    }
  };

  const handleDeleteChoice = async (choice: QuizChoice) => {
    if (!userId) return;
    if (!selectedQuizExam) return;
    if (!window.confirm('Supprimer ce choix ?')) return;

    try {
      await deleteFormateurQuizChoice(userId, selectedQuizExam.id, choice.id);
      if (!isMountedRef.current) return;
      success('Choix supprimé', 'Le choix a été retiré.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), refreshEvaluations()]);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de supprimer le choix.');
      console.error(err);
    }
  };

  const handleMoveChoice = async (question: QuizQuestion, choice: QuizChoice, direction: -1 | 1) => {
    if (!userId) return;
    if (!selectedQuizExam) return;
    const orderedChoices = orderByPosition(quizChoicesByQuestion.get(String(question.id)) ?? []);
    const currentIndex = orderedChoices.findIndex((entry) => String(entry.id) === String(choice.id));
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedChoices.length) return;

    const targetChoice = orderedChoices[targetIndex];
    try {
      await reorderFormateurQuizChoice(userId, selectedQuizExam.id, choice, targetChoice);
      await refreshQuizStructure(selectedQuizExam.id);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de reordonner les choix.');
      console.error(err);
    }
  };

  return {
    handleCreateChoice,
    handleCreateQuestion,
    handleDeleteChoice,
    handleDeleteQuestion,
    handleMoveChoice,
    handleMoveQuestion,
    handleSaveChoice,
    handleSaveQuestion,
  };
}
