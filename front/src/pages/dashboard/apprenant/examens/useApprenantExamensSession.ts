import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  fetchApprenantExamensSnapshot,
  fetchApprenantQuizStructure,
  submitApprenantExamAnswer,
  type ApprenantExam as Exam,
  type ApprenantQuizAnswerPayload as QuizAnswerPayload,
  type ApprenantQuizChoice as QuizChoice,
  type ApprenantQuizQuestion as QuizQuestion,
  type ApprenantSubmission as Submission,
} from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import { uploadFileToServer } from '@/lib/uploadApi';
import {
  getUploadResourceType,
  orderByPosition,
  type ExamFilter,
  type ExamWithStatus,
} from './examensModel';
import type { ExamSubmitModalProps } from './ExamSubmitModal';
import { useExamQuizDrafts } from './useExamQuizDrafts';

export function useApprenantExamensSession() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState<ExamFilter>('all');
  const [submitting, setSubmitting] = useState(false);
  const [selectedResultSubmission, setSelectedResultSubmission] = useState<Submission | null>(null);
  const answerFileInputRef = useRef<HTMLInputElement | null>(null);
  const studentId = user?.id ?? null;
  const studentName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const apprenantQueryKey = queryKeys.apprenant.root(studentId);
  const examensQueryKey = queryKeys.apprenant.examens(studentId);
  const selectedQuizExamId = selectedExam?.type === 'quiz' ? selectedExam.id : null;

  const { data: examensSnapshot, isLoading: loading } = useQuery({
    queryKey: examensQueryKey,
    queryFn: () => fetchApprenantExamensSnapshot(studentId ?? ''),
    enabled: Boolean(studentId),
  });

  const quizStructureQuery = useQuery({
    queryKey: queryKeys.apprenant.examQuiz(studentId, selectedQuizExamId),
    queryFn: async () => {
      if (!selectedQuizExamId) {
        return { questions: [], choices: [] };
      }
      const structure = await fetchApprenantQuizStructure(selectedQuizExamId);
      return {
        questions: orderByPosition(structure.questions as QuizQuestion[]),
        choices: orderByPosition(structure.choices as QuizChoice[]),
      };
    },
    enabled: showSubmitModal && Boolean(studentId) && selectedExam?.type === 'quiz' && Boolean(selectedQuizExamId),
  });

  const quizQuestions = useMemo(() => quizStructureQuery.data?.questions ?? [], [quizStructureQuery.data?.questions]);
  const quizChoices = useMemo(() => quizStructureQuery.data?.choices ?? [], [quizStructureQuery.data?.choices]);
  const loadingQuizStructure = quizStructureQuery.isLoading || quizStructureQuery.isFetching;
  const submissions = useMemo(() => examensSnapshot?.submissions || [], [examensSnapshot?.submissions]);
  const {
    handleQuizChoiceToggle,
    handleQuizOpenAnswerChange,
    quizAnswerDrafts,
    resetQuizDrafts,
  } = useExamQuizDrafts({
    questions: quizStructureQuery.data?.questions,
    selectedExamType: selectedExam?.type,
    showSubmitModal,
  });

  const exams = useMemo<ExamWithStatus[]>(() => {
    return (examensSnapshot?.exams || []).map((exam) => {
      const mySubmission = submissions.find((submission: Submission) => String(submission.exam_id) === String(exam.id));
      return {
        ...exam,
        submitted: !!mySubmission,
        myGrade: mySubmission?.grade ?? null,
        myStatus: mySubmission?.status ?? null,
      };
    });
  }, [examensSnapshot?.exams, submissions]);

  const quizChoicesByQuestion = useMemo(() => {
    const grouped = new Map<string, QuizChoice[]>();
    for (const choice of quizChoices) {
      const key = String(choice.question_id);
      const bucket = grouped.get(key) ?? [];
      bucket.push(choice);
      grouped.set(key, bucket);
    }
    return grouped;
  }, [quizChoices]);

  const resetSubmitState = useCallback(() => {
    setShowSubmitModal(false);
    setSelectedExam(null);
    setAnswerText('');
    setAnswerFile(null);
    setUploadProgress(0);
    resetQuizDrafts();
  }, [resetQuizDrafts]);

  const openSubmit = (exam: Exam) => {
    if (exam.type === 'quiz' && (exam.questions_count ?? 0) === 0) {
      toastError('Quiz indisponible', 'Ce quiz n est pas encore configure par le formateur.');
      return;
    }

    setSelectedExam(exam);
    setShowSubmitModal(true);
    setAnswerText('');
    setAnswerFile(null);
    setUploadProgress(0);
    resetQuizDrafts();
  };

  const handleAnswerFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAnswerFile(file);
    setUploadProgress(0);
    event.target.value = '';
  };

  const examStats = useMemo(() => {
    const todo = exams.filter((exam) => !exam.submitted).length;
    const pending = submissions.filter((submission) => submission.status === 'pending').length;
    const graded = submissions.filter((submission) => submission.status === 'graded').length;
    return { total: exams.length, todo, pending, graded };
  }, [exams, submissions]);

  const filteredExams = useMemo(() => {
    if (filter === 'todo') return exams.filter((exam) => !exam.submitted);
    if (filter === 'pending') return exams.filter((exam) => exam.myStatus === 'pending');
    if (filter === 'graded') return exams.filter((exam) => exam.myStatus === 'graded');
    return exams;
  }, [exams, filter]);

  const latestSubmissions = useMemo(() => submissions.slice(0, 4), [submissions]);

  const handleSubmitExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedExam) return;
    if (!studentId || !studentName) {
      toastError('Session invalide', 'Impossible d identifier votre compte apprenant.');
      return;
    }

    let submissionPayload: Record<string, unknown>;

    if (selectedExam.type === 'quiz') {
      if (quizQuestions.length === 0) {
        toastError('Quiz indisponible', 'Ce quiz ne contient pas encore de questions.');
        return;
      }

      const answers: QuizAnswerPayload[] = quizQuestions.map((question) => {
        const draft = quizAnswerDrafts[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
        return {
          question_id: question.id,
          answer_text: question.type === 'open' ? draft.answer_text.trim() || null : null,
          selected_choice_ids: question.type === 'open' ? [] : draft.selected_choice_ids,
        };
      });

      const hasInvalidRequiredAnswer = quizQuestions.some((question) => {
        const draft = quizAnswerDrafts[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
        if (!question.required) return false;
        return question.type === 'open'
          ? draft.answer_text.trim().length === 0
          : draft.selected_choice_ids.length === 0;
      });

      if (hasInvalidRequiredAnswer) {
        toastError('Réponses incomplètes', 'Veuillez répondre à toutes les questions obligatoires avant de soumettre.');
        return;
      }

      submissionPayload = {
        exam_id: selectedExam.id,
        student_id: studentId,
        student_name: studentName,
        status: 'pending',
        answers,
      };
    } else {
      if (!answerText.trim() && !answerFile) {
        toastError('Réponse vide', 'Ajoutez un fichier ou écrivez votre réponse avant de soumettre.');
        return;
      }

      submissionPayload = {
        exam_id: selectedExam.id,
        student_id: studentId,
        student_name: studentName,
        file_name: answerFile?.name || 'Reponse texte',
        file_url: answerText.trim(),
        answer_text: answerText.trim() || null,
        status: 'pending',
      };
    }

    setSubmitting(true);
    try {
      if (selectedExam.type !== 'quiz' && answerFile) {
        const uploaded = await uploadFileToServer(answerFile, {
          folder: 'apprenant/soumissions',
          filename: answerFile.name.replace(/\.[^.]+$/, ''),
          resourceType: getUploadResourceType(answerFile),
          onProgress: setUploadProgress,
        });
        submissionPayload = {
          ...submissionPayload,
          file_name: uploaded.originalName || answerFile.name,
          file_url: uploaded.url,
        };
      }

      const submitted = await submitApprenantExamAnswer({
        userId: studentId,
        studentName,
        exam: selectedExam,
        submissionPayload,
      });

      success(
        selectedExam.type === 'quiz' && submitted?.status === 'graded' ? 'Quiz corrigé' : 'Soumission envoyée',
        selectedExam.type === 'quiz'
          ? submitted?.status === 'graded'
            ? `Résultat automatique : ${submitted.grade}/${selectedExam.max_grade}.`
            : 'Vos réponses ont été enregistrées. Les questions ouvertes seront corrigées par le formateur.'
          : 'Votre réponse a été soumise avec succès. Le formateur la corrigera prochainement.',
      );

      resetSubmitState();
      await queryClient.invalidateQueries({ queryKey: apprenantQueryKey });
    } catch (err: unknown) {
      toastError('Erreur', 'Impossible de soumettre votre réponse.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const submitModalProps: ExamSubmitModalProps | null = showSubmitModal && selectedExam
    ? {
      exam: selectedExam,
      answerText,
      answerFile,
      uploadProgress,
      submitting,
      loadingQuizStructure,
      quizStructureError: quizStructureQuery.isError,
      quizQuestions,
      quizChoicesByQuestion,
      quizAnswerDrafts,
      answerFileInputRef,
      onClose: resetSubmitState,
      onSubmit: (event) => {
        void handleSubmitExam(event);
      },
      onAnswerTextChange: setAnswerText,
      onAnswerFileChange: handleAnswerFileChange,
      onRemoveAnswerFile: () => setAnswerFile(null),
      onRetryQuizStructure: () => {
        void quizStructureQuery.refetch();
      },
      onQuizChoiceToggle: handleQuizChoiceToggle,
      onQuizOpenAnswerChange: handleQuizOpenAnswerChange,
    }
    : null;

  return {
    loading,
    filter,
    setFilter,
    examStats,
    exams,
    filteredExams,
    submissions,
    latestSubmissions,
    selectedResultSubmission,
    setSelectedResultSubmission,
    openSubmit,
    submitModalProps,
  };
}
