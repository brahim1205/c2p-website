import type { Exam, ExamFormErrors, GradeFormErrors } from './types';

export function isPastDate(value: string) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(`${value}T00:00:00`);
  return Number.isNaN(candidate.getTime()) || candidate.getTime() < today.getTime();
}

export function validateExamForm(form: Partial<Exam>, availableCourseIds: Set<string>) {
  const errors: ExamFormErrors = {};
  const title = String(form.title ?? '').trim();
  const courseId = String(form.course_id ?? '').trim();
  const examDate = String(form.exam_date ?? '').trim();
  const participants = Number(form.participants ?? 0);
  const maxGrade = Number(form.max_grade ?? 0);

  if (!title) errors.title = 'Le titre est obligatoire.';
  else if (title.length < 3) errors.title = 'Le titre doit contenir au moins 3 caractères.';

  if (!courseId) errors.course_id = 'La formation associée est obligatoire.';
  else if (!availableCourseIds.has(courseId)) errors.course_id = 'Sélectionnez une formation valide.';

  if (!examDate) errors.exam_date = 'La date est obligatoire.';
  else if (isPastDate(examDate)) errors.exam_date = 'Choisissez une date du jour ou future.';

  if (!Number.isFinite(participants) || participants < 0) {
    errors.participants = 'Le nombre de participants doit être positif.';
  }

  if (!Number.isFinite(maxGrade) || maxGrade < 1 || maxGrade > 100) {
    errors.max_grade = 'La note maximale doit être comprise entre 1 et 100.';
  }

  return errors;
}

export function validateGradeForm(gradeValue: string, feedbackValue: string, maxGrade: number) {
  const errors: GradeFormErrors = {};
  const grade = parseFloat(gradeValue);

  if (Number.isNaN(grade) || grade < 0 || grade > maxGrade) {
    errors.gradeValue = `La note doit être comprise entre 0 et ${maxGrade}.`;
  }
  if (feedbackValue.length > 500) {
    errors.feedbackValue = 'Le commentaire ne peut pas dépasser 500 caractères.';
  }

  return errors;
}
