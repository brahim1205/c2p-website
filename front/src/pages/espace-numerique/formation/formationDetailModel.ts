export interface Course {
  id: string | number;
  title: string;
  category: string;
  description: string | null;
  instructor_id: string | null;
  instructor_name?: string | null;
  modules: number | null;
  duration: string | null;
  students_count: number | null;
  price: number | null;
  current_price?: number | null;
  thumbnail: string | null;
  status: string;
  level?: string | null;
  rating?: number | null;
  is_free?: boolean | null;
  delivery_mode?: string | null;
  program_branch?: string | null;
  metadata?: {
    learning_objectives?: unknown;
    prerequisites?: unknown;
    tools?: unknown;
  } | null;
  created_at: string;
}

export interface CourseSection {
  id: string | number;
  title: string;
  description: string | null;
  position: number | null;
}

export interface CourseLesson {
  id: string | number;
  section_id: string | number | null;
  title: string;
  description: string | null;
  type: string | null;
  duration: string | null;
  is_preview: boolean | null;
  position: number | null;
}

export interface EnrollmentRecord {
  id: string | number;
  progress?: number;
  status?: string;
}

export interface CourseReview {
  id: string | number;
  course_id: string | number;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

export interface LessonProgressRecord {
  id: string | number;
  lesson_id: string | number;
  progress: number;
  completed: boolean;
}

export interface RelatedVirtualClass {
  id: string | number;
  title: string;
  class_date: string;
  class_time: string;
  status: string;
  recording_url?: string | null;
}

export type FormationDetailTab = 'overview' | 'curriculum' | 'reviews';

export interface CurriculumSection extends CourseSection {
  lessons: CourseLesson[];
}

export interface ReviewDraft {
  rating: number;
  comment: string;
}

export function normalizeCourseLevel(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'debutant' || normalized === 'beginner') return 'Débutant';
  if (normalized === 'avance' || normalized === 'advanced') return 'Avancé';
  if (normalized === 'all_levels' || normalized === 'tous niveaux') return 'Tous niveaux';
  return 'Intermédiaire';
}

export function getTypeIcon(type: string | null | undefined) {
  switch (type) {
    case 'video':
      return 'ri-play-circle-line';
    case 'quiz':
      return 'ri-question-line';
    case 'assignment':
      return 'ri-edit-box-line';
    case 'live':
      return 'ri-broadcast-line';
    case 'pdf':
      return 'ri-file-pdf-line';
    case 'article':
      return 'ri-article-line';
    default:
      return 'ri-file-line';
  }
}

export function getCourseImage(course: Course) {
  if (course.thumbnail) return course.thumbnail;
  const catImages: Record<string, string> = {
    informatique: '/images/brand/images11.jpeg',
    langues: '/images/brand/images12.jpeg',
    entrepreneuriat: '/images/brand/image8.jpeg',
    commerce: '/images/brand/image2.jpeg',
    communication: '/images/brand/image3.jpeg',
    gestion: '/images/brand/image7.jpeg',
  };
  return catImages[(course.category || '').toLowerCase()] || catImages.informatique;
}

export function readMetadataList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export function formatCoursePrice(course: Course) {
  const price = course.current_price ?? course.price;
  return price ? `${price.toLocaleString('fr-FR')} FCFA` : 'Gratuit';
}
