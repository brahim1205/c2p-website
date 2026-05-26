import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchFormateurQuizStructure,
  gradeFormateurSubmission,
} from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  computeSuggestedGrade,
  groupQuizChoicesByQuestion,
  orderByPosition,
  validateGradeForm,
  type EntityId,
  type Exam,
  type GradeFormErrors,
  type QuizChoice,
  type QuizQuestion,
  type Submission,
} from './evaluationModel';
import type { GradeSubmissionModalProps } from './GradeSubmissionModal';

type ToastFn = (title: string, message?: string) => void;

interface SubscriptionGate {
  allowed: boolean;
  title: string;
  message: string;
}

interface UseGradeSubmissionSessionParams {
  userId?: string;
  exams: Exam[];
  subscriptionGate: SubscriptionGate;
  isMountedRef: MutableRefObject<boolean>;
  refreshEvaluations: () => Promise<void>;
  success: ToastFn;
  error: ToastFn;
}

export function useGradeSubmissionSession({
  userId,
  exams,
  subscriptionGate,
  isMountedRef,
  refreshEvaluations,
  success,
  error,
}: UseGradeSubmissionSessionParams) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [gradeErrors, setGradeErrors] = useState<GradeFormErrors>({});
  const [gradeFormMessage, setGradeFormMessage] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);

  const selectedExam = selectedSubmission ? exams.find((exam) => String(exam.id) === String(selectedSubmission.exam_id)) || null : null;
  const selectedExamMaxGrade = selectedExam?.max_grade || 20;
  const selectedSubmissionQuizExamId = selectedExam?.type === 'quiz' ? selectedExam.id : null;

  const selectedSubmissionQuizStructureQuery = useQuery({
    queryKey: queryKeys.formateur.examQuiz(userId, selectedSubmissionQuizExamId),
    queryFn: async () => {
      if (!userId || selectedSubmissionQuizExamId == null) {
        return { questions: [] as QuizQuestion[], choices: [] as QuizChoice[] };
      }
      const structure = await fetchFormateurQuizStructure(userId, selectedSubmissionQuizExamId);
      return {
        questions: orderByPosition(structure.questions as QuizQuestion[]),
        choices: orderByPosition(structure.choices as QuizChoice[]),
      };
    },
    enabled: showGradeModal && Boolean(userId) && Boolean(selectedSubmissionQuizExamId),
  });

  useEffect(() => {
    if (selectedSubmissionQuizStructureQuery.isError) {
      error('Erreur', 'Impossible de charger la correction automatique du quiz.');
    }
  }, [error, selectedSubmissionQuizStructureQuery.isError]);

  const selectedSubmissionQuestions = useMemo(
    () => selectedSubmissionQuizStructureQuery.data?.questions ?? [],
    [selectedSubmissionQuizStructureQuery.data?.questions],
  );
  const selectedSubmissionChoices = useMemo(
    () => selectedSubmissionQuizStructureQuery.data?.choices ?? [],
    [selectedSubmissionQuizStructureQuery.data?.choices],
  );
  const selectedSubmissionChoicesByQuestion = useMemo(
    () => groupQuizChoicesByQuestion(selectedSubmissionChoices),
    [selectedSubmissionChoices],
  );
  const selectedSubmissionAnswers = useMemo(
    () => (selectedSubmission && Array.isArray(selectedSubmission.answers) ? selectedSubmission.answers : []),
    [selectedSubmission],
  );
  const selectedSubmissionSuggestedGrade = useMemo(
    () => computeSuggestedGrade(
      selectedSubmissionAnswers,
      selectedSubmissionQuestions,
      selectedSubmissionChoices,
      selectedExamMaxGrade,
    ),
    [selectedExamMaxGrade, selectedSubmissionAnswers, selectedSubmissionChoices, selectedSubmissionQuestions],
  );

  const closeGradeModal = () => {
    setShowGradeModal(false);
    setSelectedSubmission(null);
    setGradeValue('');
    setFeedbackValue('');
    setGradeErrors({});
    setGradeFormMessage(null);
  };

  const useSuggestedGrade = () => {
    if (selectedSubmissionSuggestedGrade == null) return;
    setGradeValue(String(selectedSubmissionSuggestedGrade));
    setGradeErrors((current) => ({ ...current, gradeValue: undefined }));
    setGradeFormMessage(null);
  };

  const updateGradeValue = (value: string) => {
    setGradeValue(value);
    setGradeErrors((current) => ({ ...current, gradeValue: undefined }));
    setGradeFormMessage(null);
  };

  const updateFeedbackValue = (value: string) => {
    setFeedbackValue(value);
    setGradeErrors((current) => ({ ...current, feedbackValue: undefined }));
    setGradeFormMessage(null);
  };

  const handleGrade = (submission: Submission) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setSelectedSubmission(submission);
    setGradeValue(submission.grade != null ? submission.grade.toString() : '');
    setFeedbackValue(submission.feedback || '');
    setGradeErrors({});
    setGradeFormMessage(null);
    setShowGradeModal(true);
  };

  const confirmGrade = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedSubmission) return;
    const nextErrors = validateGradeForm(gradeValue, feedbackValue, selectedExamMaxGrade);
    setGradeErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setGradeFormMessage('Corrigez les champs signalés avant d’attribuer la note.');
      return;
    }
    const grade = parseFloat(gradeValue);

    setIsGrading(true);
    try {
      if (!userId || !selectedExam) throw new Error('Évaluation introuvable.');
      await gradeFormateurSubmission(userId, {
        submissionId: selectedSubmission.id,
        examId: selectedSubmission.exam_id,
        studentId: selectedSubmission.student_id,
        examTitle: selectedExam.title || 'Examen',
        grade,
        maxGrade: selectedExamMaxGrade,
        feedback: feedbackValue,
      });
      if (!isMountedRef.current) return;
      success('Note attribuée', `La note de ${grade}/${selectedExamMaxGrade} a été attribuée avec succès.`);

      setShowGradeModal(false);
      setSelectedSubmission(null);
      setGradeValue('');
      setFeedbackValue('');
      setGradeErrors({});
      setGradeFormMessage(null);
      await refreshEvaluations();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setGradeFormMessage('Impossible d attribuer la note.');
      error('Erreur', 'Impossible d attribuer la note.');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setIsGrading(false);
      }
    }
  };

  const gradeSubmissionModalProps: GradeSubmissionModalProps | null = showGradeModal && selectedSubmission
    ? {
      submission: selectedSubmission,
      exam: selectedExam,
      examMaxGrade: selectedExamMaxGrade,
      questions: selectedSubmissionQuestions,
      choicesByQuestion: selectedSubmissionChoicesByQuestion,
      answers: selectedSubmissionAnswers,
      suggestedGrade: selectedSubmissionSuggestedGrade,
      gradeValue,
      feedbackValue,
      errors: gradeErrors,
      message: gradeFormMessage,
      isGrading,
      onClose: closeGradeModal,
      onConfirm: confirmGrade,
      onUseSuggestedGrade: useSuggestedGrade,
      onGradeValueChange: updateGradeValue,
      onFeedbackValueChange: updateFeedbackValue,
    }
    : null;

  return {
    handleGrade,
    gradeSubmissionModalProps,
  };
}
