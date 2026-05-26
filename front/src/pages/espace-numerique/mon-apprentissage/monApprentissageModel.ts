export interface Enrollment {
  id: number;
  course_id: number;
  student_name: string;
  student_email: string | null;
  progress: number;
  grade: number | null;
  status: string;
  last_active: string;
  enrolled_at: string;
  courses: {
    id: number;
    title: string;
    category: string;
    description: string | null;
    modules: number | null;
    duration: string | null;
    thumbnail: string | null;
    delivery_mode?: string | null;
  } | null;
}

export interface Certificate {
  id: number;
  title: string;
  course_name: string | null;
  final_grade: number | null;
  grade: number | null;
  status: string;
  certificate_number: string | null;
  issued_at: string | null;
  completion_date: string | null;
}

export function getCourseImage(course: Enrollment['courses']) {
  if (course?.thumbnail) return course.thumbnail;
  return '/images/home/academy.jpg';
}

export function formatLastAccessed(dateStr: string) {
  if (!dateStr) return 'Jamais';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Il y a quelques minutes';
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Il y a ${diffD} jour${diffD > 1 ? 's' : ''}`;
  return date.toLocaleDateString('fr-FR');
}

export function buildLearningStats(enrollments: Enrollment[], certificates: Certificate[]) {
  return {
    totalCourses: enrollments.length,
    inProgress: enrollments.filter((course) => course.progress > 0 && course.progress < 100).length,
    completed: enrollments.filter((course) => course.progress >= 100).length,
    certificates: certificates.filter((certificate) => certificate.status === 'issued').length,
  };
}
