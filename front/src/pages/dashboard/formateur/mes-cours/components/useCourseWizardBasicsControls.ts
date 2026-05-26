import type { Dispatch, SetStateAction } from 'react';
import {
  isHumanCorrectedExamType,
  makeQuestionDraft,
  type CourseBasicsDraft,
  type CourseDeliveryMode,
  type CourseFieldErrors,
  type ExamType,
  type WizardDraftState,
} from './courseWizardModel';

type CourseListField = 'objectives' | 'prerequisites' | 'tools';

type CourseWizardBasicsControlsArgs = {
  setCourseErrors: Dispatch<SetStateAction<CourseFieldErrors>>;
  setStepMessage: Dispatch<SetStateAction<string | null>>;
  setWizard: Dispatch<SetStateAction<WizardDraftState>>;
};

export function useCourseWizardBasicsControls({
  setCourseErrors,
  setStepMessage,
  setWizard,
}: CourseWizardBasicsControlsArgs) {
  const updateCourse = <K extends keyof CourseBasicsDraft>(field: K, value: CourseBasicsDraft[K]) => {
    setWizard((current) => {
      const nextCourse = { ...current.course, [field]: value };
      if (field === 'is_free' && value === true) {
        nextCourse.price = 0;
      }
      if (field === 'price' && Number(value) > 0) {
        nextCourse.is_free = false;
      }
      const nextDeliveryMode = field === 'delivery_mode' ? value as CourseDeliveryMode : current.course.delivery_mode;
      const nextExams = nextDeliveryMode === 'online'
        ? current.exams.map((exam) => (
          isHumanCorrectedExamType(exam.type)
            ? {
              ...exam,
              type: 'quiz' as ExamType,
              auto_correction: true,
              questions: exam.questions.length ? exam.questions : [makeQuestionDraft()],
            }
            : exam
        ))
        : current.exams;

      return { ...current, course: nextCourse, exams: nextExams };
    });
    setCourseErrors((current) => ({ ...current, [field]: undefined }));
    setStepMessage(null);
  };

  const updateCourseListItem = (
    field: CourseListField,
    index: number,
    value: string,
  ) => {
    setWizard((current) => {
      const nextItems = [...current.course[field]];
      nextItems[index] = value;
      return {
        ...current,
        course: {
          ...current.course,
          [field]: nextItems,
        },
      };
    });
    setStepMessage(null);
  };

  const addCourseListItem = (field: CourseListField) => {
    setWizard((current) => ({
      ...current,
      course: {
        ...current.course,
        [field]: [...current.course[field], ''],
      },
    }));
  };

  const removeCourseListItem = (field: CourseListField, index: number) => {
    setWizard((current) => {
      const nextItems = current.course[field].filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        course: {
          ...current.course,
          [field]: nextItems.length ? nextItems : [''],
        },
      };
    });
  };

  return {
    addCourseListItem,
    removeCourseListItem,
    updateCourse,
    updateCourseListItem,
  };
}
