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
  objectives?: string[];
  prerequisites?: string[];
  tools?: string[];
}

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

export function getCourseStatusBadge(status: string) {
  return {
    label: courseStatusLabels[status as CourseWorkflowStatus] || status,
    className: courseStatusClasses[status as CourseWorkflowStatus] || 'bg-gray-100 text-gray-700',
  };
}

export function getDeliveryLabel(deliveryMode: CourseDeliveryMode) {
  return getCourseDeliveryLabel(deliveryMode);
}

export function getWorkflowSuccessMessage(status: CourseWorkflowStatus, title: string) {
  return `La formation "${title}" est passée en ${courseStatusLabels[status].toLowerCase()}.`;
}
