import type { CourseDeliveryMode, ExamType } from '../courseWizardTypes';

export function isHumanCorrectedExamType(type: ExamType) {
  return type === 'assignment' || type === 'project';
}

export function isExamTypeAllowedForDelivery(type: ExamType, deliveryMode: CourseDeliveryMode) {
  if (type === 'quiz') return true;
  return deliveryMode === 'hybrid' || deliveryMode === 'onsite';
}

export function getExamDeliveryRestrictionMessage(deliveryMode: CourseDeliveryMode) {
  if (deliveryMode === 'online') {
    return 'Pour une formation en ligne, utilisez surtout des quiz. Les devoirs et projets sont réservés aux formats hybride ou présentiel, car ils demandent une correction humaine.';
  }
  return null;
}
