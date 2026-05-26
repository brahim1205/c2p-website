import type { CourseBasicsDraft, CourseDeliveryMode, CourseFieldErrors, ExamDraft, SectionDraft } from '../courseWizardTypes';
import { getExamDeliveryRestrictionMessage, isExamTypeAllowedForDelivery, isHumanCorrectedExamType } from './examRules';
import { EXAM_TYPE_LABELS } from './labels';

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateCourseBasics(course: CourseBasicsDraft) {
  const errors: CourseFieldErrors = {};
  if (!course.title.trim()) {
    errors.title = 'Le titre est obligatoire.';
  } else if (course.title.trim().length < 3) {
    errors.title = 'Le titre doit contenir au moins 3 caractères.';
  }

  if (!course.category.trim()) {
    errors.category = 'La catégorie est obligatoire.';
  } else if (course.category.trim().length < 2) {
    errors.category = 'La catégorie doit contenir au moins 2 caractères.';
  }

  if (course.description.trim().length > 500) {
    errors.description = 'La description ne peut pas dépasser 500 caractères.';
  }

  if (!['online', 'onsite', 'hybrid'].includes(course.delivery_mode)) {
    errors.delivery_mode = 'Sélectionnez un format valide.';
  }

  if (!course.duration.trim()) {
    errors.duration = 'La durée estimée est obligatoire.';
  }

  if (!course.is_free && (!Number.isFinite(course.price) || course.price <= 0)) {
    errors.price = 'Renseignez un prix supérieur à 0 pour une formation payante.';
  }

  if (!Number.isFinite(course.promotion_percentage) || course.promotion_percentage < 0 || course.promotion_percentage > 100) {
    errors.promotion_percentage = 'La promotion doit être comprise entre 0 et 100%.';
  }

  if (course.thumbnail.trim() && !isValidHttpUrl(course.thumbnail.trim())) {
    errors.thumbnail = 'La couverture doit être une URL http(s) valide.';
  }

  if (course.trailer_url.trim() && !isValidHttpUrl(course.trailer_url.trim())) {
    errors.trailer_url = 'La bande-annonce doit être une URL http(s) valide.';
  }

  return errors;
}

export function validateStructure(sections: SectionDraft[]) {
  if (sections.length === 0) {
    return 'Ajoutez au moins une partie.';
  }

  for (const section of sections) {
    if (!section.title.trim()) {
      return 'Chaque partie doit avoir un titre.';
    }
    if (section.lessons.length === 0) {
      return `Ajoutez au moins une leçon dans "${section.title}".`;
    }
    for (const lesson of section.lessons) {
      if (!lesson.title.trim()) {
        return `Chaque leçon de "${section.title}" doit avoir un titre.`;
      }
    }
  }

  return null;
}

export function validateLessonEditors(sections: SectionDraft[]) {
  for (const section of sections) {
    for (const lesson of section.lessons) {
      if (['article', 'practice', 'coding'].includes(lesson.type) && !lesson.content.trim()) {
        return `Ajoutez un contenu rédigé pour "${lesson.title}".`;
      }
      if (lesson.type === 'coding' && !lesson.code_sample.trim()) {
        return `Ajoutez un exemple de code pour "${lesson.title}".`;
      }
      if (['assignment', 'practice'].includes(lesson.type) && !lesson.exercise_instructions.trim()) {
        return `Ajoutez les consignes pour "${lesson.title}".`;
      }
    }
  }
  return null;
}

export function validateExams(exams: ExamDraft[], deliveryMode: CourseDeliveryMode) {
  for (const exam of exams) {
    if (!isExamTypeAllowedForDelivery(exam.type, deliveryMode)) {
      return getExamDeliveryRestrictionMessage(deliveryMode) ?? `Le type "${EXAM_TYPE_LABELS[exam.type]}" n est pas disponible pour ce format.`;
    }
    if (!exam.title.trim()) {
      return 'Chaque évaluation doit avoir un titre.';
    }
    if (!exam.exam_date.trim()) {
      return `Ajoutez une date pour "${exam.title}".`;
    }
    if (!Number.isFinite(exam.max_grade) || exam.max_grade < 1 || exam.max_grade > 100) {
      return `La note maximale de "${exam.title}" doit être comprise entre 1 et 100.`;
    }
    if (isHumanCorrectedExamType(exam.type)) {
      continue;
    }

    for (const question of exam.questions) {
      if (!question.prompt.trim()) {
        return `Chaque question de "${exam.title}" doit avoir un intitulé.`;
      }
      if (question.type !== 'open') {
        if (question.choices.length === 0) {
          return `Ajoutez des choix pour "${question.prompt}".`;
        }
        if (!question.choices.some((choice) => choice.is_correct)) {
          return `Sélectionnez au moins une bonne réponse pour "${question.prompt}".`;
        }
      }
    }
  }
  return null;
}
