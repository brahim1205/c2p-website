import { useRef, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import {
  createFormateurCourseBundle,
  deleteFormateurCourseWizardDraft,
} from '@/lib/formateurDashboardApi';
import {
  makeDefaultWizardState,
  normalizeSections,
  validateCourseBasics,
  validateExams,
  validateLessonEditors,
  validateStructure,
  type CourseCreationWizardProps,
  type CourseFieldErrors,
  type ExamDraft,
  type WizardDraftState,
} from './courseWizardModel';
import { useCourseCreationWizardDerivedState } from './useCourseCreationWizardDerivedState';
import { useCourseWizardAssets } from './useCourseWizardAssets';
import { useCourseWizardBasicsControls } from './useCourseWizardBasicsControls';
import { useCourseWizardDraftSync } from './useCourseWizardDraftSync';
import { useCourseWizardEvaluations } from './useCourseWizardEvaluations';
import { useCourseWizardProgram } from './useCourseWizardProgram';
import { clearWizardDraft } from './wizardStorage';

type CourseCreationWizardSessionArgs = Pick<CourseCreationWizardProps, 'open' | 'userId' | 'onClose' | 'onCreated'>;

export function useCourseCreationWizardSession({
  open,
  userId,
  onClose,
  onCreated,
}: CourseCreationWizardSessionArgs) {
  const { success, error, info } = useToast();
  const [wizard, setWizard] = useState<WizardDraftState>(makeDefaultWizardState());
  const [courseErrors, setCourseErrors] = useState<CourseFieldErrors>({});
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragLessonPayload, setDragLessonPayload] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const trailerInputRef = useRef<HTMLInputElement>(null);

  const derivedState = useCourseCreationWizardDerivedState(wizard);
  const {
    examDeliveryRestrictionMessage,
    hasUploadErrors,
    lessonOptions,
    pendingUploadsCount,
    selectedExam,
    selectedLesson,
    uploadedAssetsCount,
  } = derivedState;

  const { savingDraftAt } = useCourseWizardDraftSync({
    open,
    userId,
    wizard,
    setWizard,
    onDraftLoadStart: () => {
      setCourseErrors({});
      setStepMessage(null);
    },
  });

  const {
    addCourseListItem,
    removeCourseListItem,
    updateCourse,
    updateCourseListItem,
  } = useCourseWizardBasicsControls({
    setCourseErrors,
    setStepMessage,
    setWizard,
  });

  const programControls = useCourseWizardProgram({
    selectedLesson,
    setStepMessage,
    setWizard,
  });

  const assetControls = useCourseWizardAssets({
    userId,
    wizard,
    selectedLesson,
    lessonOptions,
    setWizard,
    setStepMessage,
    updateCourse,
    success,
    error,
  });

  const updateExams = (updater: (exams: ExamDraft[]) => ExamDraft[]) => {
    setWizard((current) => {
      const nextExams = updater(current.exams);
      const nextSelectedExamId = nextExams.some((exam) => exam.id === current.selectedExamId)
        ? current.selectedExamId
        : nextExams[0]?.id ?? '';
      return {
        ...current,
        exams: nextExams,
        selectedExamId: nextSelectedExamId,
      };
    });
    setStepMessage(null);
  };

  const evaluationControls = useCourseWizardEvaluations({
    setWizard,
    updateExams,
  });

  const validateCurrentStep = (step: number) => {
    if (step === 1) {
      const nextErrors = validateCourseBasics(wizard.course);
      setCourseErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        setStepMessage('Corrigez les informations de base avant de continuer.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const structureError = validateStructure(wizard.sections);
      if (structureError) {
        setStepMessage(structureError);
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (pendingUploadsCount > 0) {
        setStepMessage('Attendez la fin des uploads avant de passer à l étape suivante.');
        return false;
      }
      if (hasUploadErrors) {
        setStepMessage('Corrigez ou retirez les contenus en erreur avant de continuer.');
        return false;
      }
      const message = validateLessonEditors(wizard.sections);
      if (message) {
        setStepMessage(message);
        return false;
      }
      return true;
    }

    if (step === 4) {
      const message = validateExams(wizard.exams, wizard.course.delivery_mode);
      if (message) {
        setStepMessage(message);
        return false;
      }
      return true;
    }

    return true;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep(wizard.step)) return;
    setStepMessage(null);
    setWizard((current) => ({
      ...current,
      step: Math.min(5, current.step + 1),
    }));
  };

  const goToPreviousStep = () => {
    setStepMessage(null);
    setWizard((current) => ({
      ...current,
      step: Math.max(1, current.step - 1),
    }));
  };

  const resetWizard = () => {
    if (userId) {
      clearWizardDraft(userId);
      void deleteFormateurCourseWizardDraft(userId).catch((reason: unknown) => {
        console.warn('Unable to clear remote course wizard draft', reason);
      });
    }
    setWizard(makeDefaultWizardState());
    setCourseErrors({});
    setStepMessage(null);
  };

  const submitWizard = async () => {
    if (!userId) {
      error('Session invalide', 'Impossible d identifier le formateur.');
      return;
    }

    const step1Valid = validateCurrentStep(1);
    const step2Valid = validateCurrentStep(2);
    const step3Valid = validateCurrentStep(3);
    const step4Valid = validateCurrentStep(4);
    if (!step1Valid || !step2Valid || !step3Valid || !step4Valid) {
      return;
    }

    setIsSubmitting(true);
    setStepMessage(null);

    try {
      const createdPayload = await createFormateurCourseBundle(userId, {
        course: wizard.course,
        sections: normalizeSections(wizard.sections),
        assets: wizard.assets,
        exams: wizard.exams,
      });

      success('Parcours de création terminé', `La formation "${wizard.course.title}" a été créée avec son programme initial.`);
      resetWizard();
      onClose();
      await onCreated({
        id: createdPayload.id,
        title: createdPayload.title,
        category: createdPayload.category || wizard.course.category,
        description: createdPayload.description || wizard.course.description,
        level: createdPayload.level || wizard.course.level,
        delivery_mode: createdPayload.delivery_mode || wizard.course.delivery_mode,
        duration: createdPayload.duration || wizard.course.duration,
        is_free: Boolean(createdPayload.is_free ?? wizard.course.is_free),
        price: Number(createdPayload.price ?? wizard.course.price),
        promotion_percentage: Number(createdPayload.promotion_percentage ?? wizard.course.promotion_percentage),
        trailer_url: createdPayload.trailer_url ?? wizard.course.trailer_url,
        thumbnail: createdPayload.thumbnail ?? wizard.course.thumbnail,
        modules: Number(createdPayload.modules ?? wizard.sections.length),
      });
    } catch (reason) {
      console.error(reason);
      const detail = reason && typeof reason === 'object' && 'message' in reason
        ? String(reason.message)
        : 'Impossible de finaliser la création de la formation.';
      setStepMessage(detail);
      error('Création incomplète', detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    ...derivedState,
    ...assetControls,
    ...evaluationControls,
    ...programControls,
    addCourseListItem,
    courseErrors,
    dragLessonPayload,
    dragSectionId,
    goToNextStep,
    goToPreviousStep,
    isSubmitting,
    removeCourseListItem,
    resetWizard,
    savingDraftAt,
    selectExam: (examId: string) => setWizard((current) => ({ ...current, selectedExamId: examId })),
    selectLesson: (lessonId: string) => setWizard((current) => ({ ...current, selectedLessonId: lessonId })),
    setDragLessonPayload,
    setDragSectionId,
    setStepMessage,
    setWizard,
    showAutosaveStatus: () => info('Brouillon synchronisé', 'Vous pouvez fermer le wizard, le brouillon est conservé sur votre compte.'),
    stepMessage,
    submitWizard,
    trailerInputRef,
    updateCourse,
    updateCourseListItem,
    uploadInputRef,
    validateCurrentStep,
    wizard,
    openLessonContent: (lessonId: string) => setWizard((current) => ({
      ...current,
      selectedLessonId: lessonId,
      step: Math.max(current.step, 3),
    })),
  };
}
