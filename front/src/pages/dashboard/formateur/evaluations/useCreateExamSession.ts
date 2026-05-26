import type { MutableRefObject } from 'react';
import { useMemo, useState } from 'react';
import { createFormateurExam } from '@/lib/formateurDashboardApi';
import {
  DEFAULT_NEW_EXAM,
  isExamTypeAllowedForDelivery,
  validateExamForm,
  type CourseOption,
  type Exam,
  type ExamFormErrors,
  type ExamType,
} from './evaluationModel';
import type { CreateExamModalProps } from './CreateExamModal';
import { useExamAttachmentManager } from './useExamAttachmentManager';

type ToastFn = (title: string, message?: string) => void;

interface SubscriptionGate {
  allowed: boolean;
  title: string;
  message: string;
}

interface UseCreateExamSessionParams {
  userId?: string;
  instructorCourses: CourseOption[];
  subscriptionGate: SubscriptionGate;
  isMountedRef: MutableRefObject<boolean>;
  refreshEvaluations: () => Promise<void>;
  success: ToastFn;
  error: ToastFn;
}

export function useCreateExamSession({
  userId,
  instructorCourses,
  subscriptionGate,
  isMountedRef,
  refreshEvaluations,
  success,
  error,
}: UseCreateExamSessionParams) {
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>(DEFAULT_NEW_EXAM);
  const [createExamErrors, setCreateExamErrors] = useState<ExamFormErrors>({});
  const [createExamMessage, setCreateExamMessage] = useState<string | null>(null);
  const [isCreatingExam, setIsCreatingExam] = useState(false);

  const availableCourseIds = useMemo(
    () => new Set(instructorCourses.map((course) => String(course.id))),
    [instructorCourses],
  );
  const selectedNewExamCourse = instructorCourses.find((course) => String(course.id) === String(newExam.course_id));

  const updateNewExam = <K extends keyof Exam>(field: K, value: Exam[K] | undefined) => {
    setNewExam((current) => ({ ...current, [field]: value }));
    setCreateExamErrors((current) => ({ ...current, [field]: undefined }));
    setCreateExamMessage(null);
  };

  const {
    examAttachmentInputRef,
    examAttachmentUploadProgress,
    handleExamAttachmentUpload,
    isUploadingExamAttachment,
    removeExamAttachment,
    setExamAttachmentUploadProgress,
    setIsUploadingExamAttachment,
  } = useExamAttachmentManager({
    attachments: newExam.attachments,
    setNewExam,
    onMessageClear: () => setCreateExamMessage(null),
    onUploadSuccess: success,
    onUploadError: error,
  });

  const openCreateExamModal = () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setShowCreateExamModal(true);
  };

  const handleCreateExam = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!userId) {
      error('Session invalide', 'Impossible d identifier le formateur.');
      return;
    }
    if (isUploadingExamAttachment) {
      setCreateExamMessage('Attendez la fin de l import des fichiers avant de créer l’évaluation.');
      return;
    }
    const nextErrors = validateExamForm(newExam, availableCourseIds);
    setCreateExamErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setCreateExamMessage('Corrigez les champs signalés avant de créer l’examen.');
      return;
    }

    const selectedCourse = instructorCourses.find((course) => String(course.id) === String(newExam.course_id));
    if (!selectedCourse) {
      setCreateExamErrors((current) => ({ ...current, course_id: 'Sélectionnez une formation valide.' }));
      setCreateExamMessage('Corrigez les champs signalés avant de créer l’examen.');
      error('Formation invalide', 'Veuillez selectionner une formation valide.');
      return;
    }
    if (!isExamTypeAllowedForDelivery((newExam.type || 'quiz') as ExamType, selectedCourse.delivery_mode)) {
      setCreateExamMessage('Les devoirs et projets sont réservés aux formations hybrides ou présentielles.');
      error('Format incompatible', 'Pour une formation en ligne, créez un quiz. Les devoirs/projets demandent une correction humaine.');
      return;
    }

    setIsCreatingExam(true);
    try {
      await createFormateurExam(userId, {
        course_id: newExam.course_id!,
        title: String(newExam.title || ''),
        instructions: String(newExam.instructions || '').trim() || null,
        attachments: newExam.attachments || [],
        course_name: selectedCourse.title,
        type: String(newExam.type || 'quiz'),
        exam_date: newExam.exam_date,
        participants: newExam.participants || 0,
        submitted: newExam.submitted || 0,
        status: newExam.status || 'ongoing',
        max_grade: newExam.max_grade || 20,
      });
      if (!isMountedRef.current) return;

      success(
        'Examen créé',
        newExam.type === 'quiz'
          ? `"${newExam.title}" a été ajouté. Configurez maintenant ses questions.`
          : `"${newExam.title}" a été ajouté avec succès.`,
      );
      setShowCreateExamModal(false);
      setNewExam(DEFAULT_NEW_EXAM);
      setCreateExamErrors({});
      setCreateExamMessage(null);
      await refreshEvaluations();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setCreateExamMessage('Impossible de créer l examen.');
      error('Erreur', 'Impossible de créer l examen.');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setIsCreatingExam(false);
      }
    }
  };

  const createExamModalProps: CreateExamModalProps | null = showCreateExamModal
    ? {
      newExam,
      selectedNewExamCourse,
      instructorCourses,
      createExamErrors,
      createExamMessage,
      isCreatingExam,
      isUploadingExamAttachment,
      examAttachmentUploadProgress,
      examAttachmentInputRef,
      updateNewExam,
      setNewExam,
      setShowCreateExamModal,
      setCreateExamErrors,
      setCreateExamMessage,
      setIsUploadingExamAttachment,
      setExamAttachmentUploadProgress,
      handleExamAttachmentUpload,
      removeExamAttachment,
      handleCreateExam,
    }
    : null;

  return {
    openCreateExamModal,
    createExamModalProps,
  };
}
