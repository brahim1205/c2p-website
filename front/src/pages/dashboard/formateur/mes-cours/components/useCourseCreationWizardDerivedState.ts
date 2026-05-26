import { useMemo } from 'react';
import {
  getExamDeliveryRestrictionMessage,
  type WizardDraftState,
} from './courseWizardModel';

export function useCourseCreationWizardDerivedState(wizard: WizardDraftState) {
  const selectedLesson = useMemo(
    () => wizard.sections.flatMap((section) => section.lessons).find((lesson) => lesson.id === wizard.selectedLessonId) ?? null,
    [wizard.sections, wizard.selectedLessonId],
  );

  const selectedExam = useMemo(
    () => wizard.exams.find((exam) => exam.id === wizard.selectedExamId) ?? null,
    [wizard.exams, wizard.selectedExamId],
  );

  const lessonOptions = useMemo(
    () => wizard.sections.flatMap((section) => section.lessons.map((lesson) => ({
      sectionId: section.id,
      sectionTitle: section.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    }))),
    [wizard.sections],
  );

  return {
    examDeliveryRestrictionMessage: getExamDeliveryRestrictionMessage(wizard.course.delivery_mode),
    hasUploadErrors: wizard.assets.some((asset) => asset.queueStatus === 'error'),
    lessonOptions,
    pendingUploadsCount: wizard.assets.filter((asset) => asset.queueStatus === 'queued' || asset.queueStatus === 'uploading').length,
    selectedExam,
    selectedLesson,
    uploadedAssetsCount: wizard.assets.filter((asset) => asset.queueStatus === 'ready').length,
  };
}
