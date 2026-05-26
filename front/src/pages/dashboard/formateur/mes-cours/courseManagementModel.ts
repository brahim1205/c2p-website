import {
  courseStatusClasses,
  courseStatusLabels,
  type CourseWorkflowStatus,
} from '@/lib/courseWorkflow';
import { getCourseDeliveryLabel, type CourseDeliveryMode } from '@/lib/courseDelivery';

export interface Course {
  id: string | number;
  title: string;
  category: string;
  description: string | null;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  delivery_mode: CourseDeliveryMode;
  access_type: 'free' | 'paid';
  is_free: boolean;
  promotion_percentage: number;
  trailer_url: string | null;
  students_count: number;
  completion_rate: number;
  status: CourseWorkflowStatus;
  revenue: number;
  modules: number;
  duration: string | null;
  updated_at: string;
  thumbnail: string | null;
  price: number;
  current_price?: number;
}

export type CourseFormErrors = Partial<Record<
  'title' | 'category' | 'description' | 'level' | 'delivery_mode' | 'modules' | 'duration' | 'price' | 'promotion_percentage' | 'thumbnail' | 'trailer_url',
  string
>>;

export const COURSE_LEVEL_LABELS: Record<Course['level'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  all_levels: 'Tous niveaux',
};

export const COURSE_DELIVERY_LABELS: Record<CourseDeliveryMode, string> = {
  online: 'En ligne',
  onsite: 'Présentiel',
  hybrid: 'Hybride',
};

export function getCourseFieldClass(hasError?: boolean) {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
  }`;
}

export function getCourseStatusBadge(status: string) {
  return {
    label: courseStatusLabels[status as CourseWorkflowStatus] || status,
    className: courseStatusClasses[status as CourseWorkflowStatus] || 'bg-gray-100 text-gray-700',
  };
}

export function getDeliveryLabel(deliveryMode: CourseDeliveryMode) {
  return getCourseDeliveryLabel(deliveryMode);
}

export function formatCourseRevenue(revenue: number) {
  if (!revenue) return '0 FCFA';
  return `${revenue.toLocaleString('fr-FR')} FCFA`;
}

export function getWorkflowSuccessMessage(status: CourseWorkflowStatus, title: string) {
  return `La formation "${title}" est passée en ${courseStatusLabels[status].toLowerCase()}.`;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateCourseForm(form: Partial<Course>) {
  const errors: CourseFormErrors = {};
  const title = String(form.title ?? '').trim();
  const category = String(form.category ?? '').trim();
  const description = String(form.description ?? '');
  const duration = String(form.duration ?? '').trim();
  const modules = Number(form.modules ?? 0);
  const price = Number(form.price ?? 0);
  const promotionPercentage = Number(form.promotion_percentage ?? 0);
  const thumbnail = String(form.thumbnail ?? '').trim();
  const trailerUrl = String(form.trailer_url ?? '').trim();
  const level = String(form.level ?? '').trim();
  const deliveryMode = String(form.delivery_mode ?? '').trim();
  const isFree = Boolean(form.is_free);

  if (!title) errors.title = 'Le titre est obligatoire.';
  else if (title.length < 3) errors.title = 'Le titre doit contenir au moins 3 caractères.';

  if (!category) errors.category = 'La catégorie est obligatoire.';
  else if (category.length < 2) errors.category = 'La catégorie doit contenir au moins 2 caractères.';

  if (description.length > 500) errors.description = 'La description ne peut pas dépasser 500 caractères.';
  if (!['beginner', 'intermediate', 'advanced', 'all_levels'].includes(level)) {
    errors.level = 'Sélectionnez un niveau valide.';
  }
  if (!['online', 'onsite', 'hybrid'].includes(deliveryMode)) {
    errors.delivery_mode = 'Sélectionnez un format valide.';
  }
  if (!duration) errors.duration = 'La durée est obligatoire.';
  if (!Number.isFinite(modules) || modules < 1 || modules > 200) errors.modules = 'Le nombre de modules doit être compris entre 1 et 200.';
  if (!Number.isFinite(price) || price < 0) errors.price = 'Le prix doit être supérieur ou égal à 0.';
  if (!isFree && price <= 0) errors.price = 'Renseignez un prix supérieur à 0 pour une formation payante.';
  if (!Number.isFinite(promotionPercentage) || promotionPercentage < 0 || promotionPercentage > 100) {
    errors.promotion_percentage = 'La promotion doit être comprise entre 0 et 100%.';
  }
  if (thumbnail && !isValidHttpUrl(thumbnail)) errors.thumbnail = 'La miniature doit être une URL http(s) valide.';
  if (trailerUrl && !isValidHttpUrl(trailerUrl)) errors.trailer_url = 'La bande-annonce doit être une URL http(s) valide.';

  return errors;
}
