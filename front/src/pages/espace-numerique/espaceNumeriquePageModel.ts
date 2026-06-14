import {
  normalizeCourseBranch,
} from '@/lib/courseBranch';

export interface Course {
  id: string | number;
  title: string;
  category: string;
  description: string | null;
  instructor_id: string | null;
  modules: number | null;
  duration: string | null;
  students_count: number | null;
  price: number | null;
  current_price?: number | null;
  thumbnail: string | null;
  status: string;
  level?: string | null;
  rating?: number | null;
  access_type?: 'free' | 'paid' | null;
  is_free?: boolean | null;
  delivery_mode?: string | null;
  program_branch?: string | null;
  instructor_name?: string | null;
  created_at: string;
}

export const courseCategories = [
  { id: 'all', name: 'Toutes les formations', icon: 'ri-apps-line' },
  { id: 'langues', name: 'Langues', icon: 'ri-translate-2' },
  { id: 'informatique', name: 'Informatique', icon: 'ri-computer-line' },
  { id: 'entrepreneuriat', name: 'Entrepreneuriat', icon: 'ri-lightbulb-line' },
  { id: 'commerce', name: 'Commerce', icon: 'ri-store-line' },
  { id: 'communication', name: 'Communication', icon: 'ri-chat-3-line' },
  { id: 'gestion', name: 'Gestion de Projet', icon: 'ri-task-line' },
];

export function getCourseLevelLabel(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'debutant' || normalized === 'beginner') return 'Débutant';
  if (normalized === 'avance' || normalized === 'advanced') return 'Avancé';
  if (normalized === 'tous niveaux' || normalized === 'all_levels') return 'Tous niveaux';
  return 'Intermédiaire';
}

export function getPublicBranchLabel(value: unknown) {
  return normalizeCourseBranch(value) === 'end' ? 'Parcours accompagnés' : 'Formation continue';
}

export function formatCoursePrice(price: number | null) {
  if (!price || price === 0) return 'Gratuit';
  return price.toLocaleString('fr-FR') + ' FCFA';
}

export function getCategoryLabel(category: string) {
  const found = courseCategories.find((item) => item.id.toLowerCase() === category.toLowerCase());
  return found ? found.name : category;
}

export function getCourseImage(course: Course) {
  if (course.thumbnail) return course.thumbnail;
  const categoryImages: Record<string, string> = {
    informatique: '/images/brand/image3.jpeg',
    langues: '/images/brand/images12.jpeg',
    entrepreneuriat: '/images/brand/image8.jpeg',
    commerce: '/images/brand/image2.jpeg',
    communication: '/images/brand/images11.jpeg',
    gestion: '/images/brand/image7.jpeg',
  };
  return categoryImages[(course.category || '').toLowerCase()] || categoryImages.informatique;
}
