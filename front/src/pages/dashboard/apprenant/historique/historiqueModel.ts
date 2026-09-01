import type { ApprenantEnrollment } from '@/lib/apprenantDashboardApi';

export type LearningHistoryEntry = {
  courseId: number;
  title: string;
  category: string;
  thumbnail: string;
  instructor: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  lastAccessed: string;
};

export type LearningHistoryStats = {
  completedCourses: number;
  globalProgress: number;
  totalCompleted: number;
  totalLessons: number;
};

export function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseCourseId(enrollment: ApprenantEnrollment) {
  return enrollment.courses?.id ?? enrollment.course_id;
}

export function mergeHistoryWithEnrollments(enrollments: ApprenantEnrollment[]): LearningHistoryEntry[] {
  return enrollments
    .map((enrollment) => {
      const courseId = parseCourseId(enrollment);
      const backendProgress = clampProgress(Number(enrollment.progress || 0));
      const backendCompleted = Math.max(0, enrollment.completed_lessons_estimate ?? 0);

      const totalLessons = Math.max(
        enrollment.course_lessons_count ?? 0,
        enrollment.courses?.modules ?? 0,
        backendCompleted,
        1,
      );

      return {
        courseId,
        title: enrollment.courses?.title || enrollment.course_name || 'Formation',
        category: enrollment.courses?.category || enrollment.course_category || 'Général',
        thumbnail: enrollment.courses?.thumbnail || '/images/home/front-view-stacked-book-with-glasses-academic-cap-optimized.webp',
        instructor: 'C2P Formation',
        totalLessons,
        completedLessons: backendCompleted,
        progress: backendProgress,
        lastAccessed: enrollment.last_active || new Date().toISOString(),
      };
    })
    .filter((entry) => entry.courseId)
    .map((entry) => ({
      ...entry,
      progress: clampProgress(entry.progress),
      completedLessons: Math.max(0, Math.min(entry.totalLessons, entry.completedLessons)),
    }))
    .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
}

export function getLearningHistoryStats(history: LearningHistoryEntry[]): LearningHistoryStats {
  const totalCompleted = history.reduce((sum, entry) => sum + entry.completedLessons, 0);
  const totalLessons = history.reduce((sum, entry) => sum + entry.totalLessons, 0);

  return {
    totalCompleted,
    totalLessons,
    completedCourses: history.filter((entry) => entry.progress === 100).length,
    globalProgress: totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0,
  };
}

export function formatLastAccessed(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 'Dernière activité inconnue';

  const diffMs = Date.now() - timestamp;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 1) return 'Il y a quelques minutes';
  if (diffHours < 24) return `Il y a ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;

  return new Date(value).toLocaleDateString('fr-FR');
}
