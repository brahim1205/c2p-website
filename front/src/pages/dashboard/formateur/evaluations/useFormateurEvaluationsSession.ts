import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import {
  deleteFormateurExam,
  fetchFormateurEvaluations,
  fetchFormateurQuizStructure,
} from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildChoiceDrafts,
  buildQuestionDrafts,
  computeEvaluationStats,
  groupQuizChoicesByQuestion,
  makeChoiceDraft,
  makeQuestionDraft,
  orderByPosition,
  type ChoiceDraft,
  type CourseOption,
  type EntityId,
  type Exam,
  type QuestionDraft,
  type QuizChoice,
  type QuizQuestion,
  type Submission,
} from './evaluationModel';
import { useCreateExamSession } from './useCreateExamSession';
import { useGradeSubmissionSession } from './useGradeSubmissionSession';
import { useQuizBuilderActions } from './useQuizBuilderActions';

export function useFormateurEvaluationsSession() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { gateFor } = useSubscriptionAccess(user);
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions'>('exams');
  const [showQuizBuilderModal, setShowQuizBuilderModal] = useState(false);
  const [selectedQuizExam, setSelectedQuizExam] = useState<Exam | null>(null);
  const [newQuestionDraft, setNewQuestionDraft] = useState<QuestionDraft>(makeQuestionDraft());
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
  const [choiceDrafts, setChoiceDrafts] = useState<Record<string, ChoiceDraft>>({});
  const [newChoiceDrafts, setNewChoiceDrafts] = useState<Record<string, ChoiceDraft>>({});
  const isMountedRef = useRef(true);
  const subscriptionGate = gateFor('trainer_assessments_manage');
  const evaluationsQueryKey = useMemo(() => queryKeys.formateur.evaluations(user?.id), [user?.id]);

  const {
    data: evaluationsSnapshot,
    isError: evaluationsError,
    isLoading: loading,
  } = useQuery({
    queryKey: evaluationsQueryKey,
    queryFn: () => fetchFormateurEvaluations(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });

  const exams = useMemo(() => (evaluationsSnapshot?.exams ?? []) as Exam[], [evaluationsSnapshot?.exams]);
  const submissions = useMemo(() => (evaluationsSnapshot?.submissions ?? []) as Submission[], [evaluationsSnapshot?.submissions]);
  const instructorCourses = useMemo(() => (evaluationsSnapshot?.courses ?? []) as CourseOption[], [evaluationsSnapshot?.courses]);

  useEffect(() => {
    if (evaluationsError) {
      error('Erreur', 'Impossible de charger les évaluations formateur.');
    }
  }, [error, evaluationsError]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshEvaluations = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: evaluationsQueryKey });
  }, [evaluationsQueryKey, queryClient]);

  const { openCreateExamModal, createExamModalProps } = useCreateExamSession({
    userId: user?.id,
    instructorCourses,
    subscriptionGate,
    isMountedRef,
    refreshEvaluations,
    success,
    error,
  });

  const { handleGrade, gradeSubmissionModalProps } = useGradeSubmissionSession({
    userId: user?.id,
    exams,
    subscriptionGate,
    isMountedRef,
    refreshEvaluations,
    success,
    error,
  });

  const fetchQuizStructure = useCallback(async (examId: EntityId | null) => {
    if (!user?.id || examId == null) {
      return { questions: [] as QuizQuestion[], choices: [] as QuizChoice[] };
    }
    const structure = await fetchFormateurQuizStructure(user.id, examId);
    return {
      questions: orderByPosition(structure.questions as QuizQuestion[]),
      choices: orderByPosition(structure.choices as QuizChoice[]),
    };
  }, [user?.id]);

  const selectedQuizExamId = selectedQuizExam?.id ?? null;
  const quizBuilderStructureQuery = useQuery({
    queryKey: queryKeys.formateur.examQuiz(user?.id, selectedQuizExamId),
    queryFn: () => fetchQuizStructure(selectedQuizExamId),
    enabled: showQuizBuilderModal && Boolean(user?.id) && Boolean(selectedQuizExamId),
  });

  const refreshQuizStructure = useCallback(async (examId: EntityId) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.formateur.examQuiz(user?.id, examId) });
  }, [queryClient, user?.id]);

  const quizQuestions = useMemo(() => quizBuilderStructureQuery.data?.questions ?? [], [quizBuilderStructureQuery.data?.questions]);
  const quizChoices = useMemo(() => quizBuilderStructureQuery.data?.choices ?? [], [quizBuilderStructureQuery.data?.choices]);
  const loadingQuizBuilder = quizBuilderStructureQuery.isLoading || quizBuilderStructureQuery.isFetching;

  useEffect(() => {
    if (!showQuizBuilderModal || !selectedQuizExam || !quizBuilderStructureQuery.data) return;

    const { questions, choices } = quizBuilderStructureQuery.data;
    setQuestionDrafts(buildQuestionDrafts(questions));
    setChoiceDrafts(buildChoiceDrafts(choices));
    setNewChoiceDrafts((previous) => {
      const next: Record<string, ChoiceDraft> = {};
      for (const question of questions) {
        next[String(question.id)] = previous[String(question.id)] ?? makeChoiceDraft();
      }
      return next;
    });
  }, [quizBuilderStructureQuery.data, selectedQuizExam, showQuizBuilderModal]);

  useEffect(() => {
    if (quizBuilderStructureQuery.isError) {
      error('Erreur', 'Impossible de charger les questions du quiz.');
    }
  }, [error, quizBuilderStructureQuery.isError]);

  const quizChoicesByQuestion = useMemo(() => groupQuizChoicesByQuestion(quizChoices), [quizChoices]);
  const { averageGradePercent, pendingCount } = useMemo(
    () => computeEvaluationStats(exams, submissions),
    [exams, submissions],
  );

  const resetQuizBuilder = () => {
    setShowQuizBuilderModal(false);
    setSelectedQuizExam(null);
    setNewQuestionDraft(makeQuestionDraft());
    setQuestionDrafts({});
    setChoiceDrafts({});
    setNewChoiceDrafts({});
  };

  const openQuizBuilder = (exam: Exam) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (exam.type !== 'quiz') return;
    setSelectedQuizExam(exam);
    setShowQuizBuilderModal(true);
  };

  const handleDeleteExam = async (exam: Exam) => {
    if (!user?.id) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer "${exam.title}" ?`)) return;

    try {
      await deleteFormateurExam(user.id, exam.id);
      if (!isMountedRef.current) return;
      success('Supprimé', `"${exam.title}" a été supprimé.`);
      await refreshEvaluations();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de supprimer l examen.');
      console.error(err);
    }
  };

  const {
    handleCreateChoice,
    handleCreateQuestion,
    handleDeleteChoice,
    handleDeleteQuestion,
    handleMoveChoice,
    handleMoveQuestion,
    handleSaveChoice,
    handleSaveQuestion,
  } = useQuizBuilderActions({
    userId: user?.id,
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
  });

  const quizBuilderModalProps = showQuizBuilderModal && selectedQuizExam
    ? {
      exam: selectedQuizExam,
      questions: quizQuestions,
      choicesByQuestion: quizChoicesByQuestion,
      loading: loadingQuizBuilder,
      newQuestionDraft,
      questionDrafts,
      choiceDrafts,
      newChoiceDrafts,
      onClose: resetQuizBuilder,
      onCreateQuestion: handleCreateQuestion,
      onSaveQuestion: handleSaveQuestion,
      onDeleteQuestion: handleDeleteQuestion,
      onMoveQuestion: handleMoveQuestion,
      onCreateChoice: handleCreateChoice,
      onSaveChoice: handleSaveChoice,
      onDeleteChoice: handleDeleteChoice,
      onMoveChoice: handleMoveChoice,
      setNewQuestionDraft,
      setQuestionDrafts,
      setChoiceDrafts,
      setNewChoiceDrafts,
    }
    : null;

  return {
    activeTab,
    setActiveTab,
    exams,
    submissions,
    loading,
    pendingCount,
    averageGradePercent,
    subscriptionGate,
    openCreateExamModal,
    openQuizBuilder,
    handleDeleteExam,
    handleGrade,
    createExamModalProps,
    quizBuilderModalProps,
    gradeSubmissionModalProps,
  };
}
