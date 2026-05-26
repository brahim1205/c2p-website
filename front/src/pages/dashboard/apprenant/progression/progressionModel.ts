import {
  fetchApprenantProgressionSnapshot,
  type ApprenantCertificate as Certificate,
  type ApprenantEnrollment as Enrollment,
  type ApprenantSubmission as Submission,
} from '@/lib/apprenantDashboardApi';

export type ProgressionSnapshot = Awaited<ReturnType<typeof fetchApprenantProgressionSnapshot>>;

export interface CourseRelation {
  id: number;
  title: string;
  category: string | null;
  duration: string | null;
  modules: number | null;
  thumbnail: string | null;
}

export interface LearningCourse {
  courseId: number;
  title: string;
  category: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastActive: string;
  learningTimeSeconds: number;
  certificateStatus: string;
  pendingGradingCount: number;
  thumbnail: string | null;
  duration: string | null;
}

export interface FocusArea {
  key: string;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  progress: number;
  coursesCount: number;
  completedCourses: number;
  completedLessons: number;
  totalLessons: number;
  learningTimeSeconds: number;
}

export interface WeeklyActivityPoint {
  date: string;
  label: string;
  value: number;
  caption: string;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function getDaysSince(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

export function formatRelativeActivity(value: string | null | undefined) {
  const daysSince = getDaysSince(value);
  if (daysSince === null) return '-';
  if (daysSince === 0) return "Aujourd'hui";
  if (daysSince === 1) return 'Hier';
  if (daysSince < 7) return `Il y a ${daysSince} jours`;
  return `Il y a ${daysSince} j`;
}

export function formatLearningTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}`;
  return `${minutes} min`;
}

function parseDurationToMinutes(duration: string | null | undefined) {
  if (!duration) return 0;
  let total = 0;
  const hourMatch = duration.match(/(\d+)\s*h/);
  const minuteMatch = duration.match(/(\d+)\s*min/);
  if (hourMatch) total += Number(hourMatch[1]) * 60;
  if (minuteMatch) total += Number(minuteMatch[1]);
  if (total === 0) {
    const numeric = Number(duration.replace(/[^\d]/g, ''));
    if (Number.isFinite(numeric)) total = numeric;
  }
  return total;
}

function getCategoryPresentation(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('marketing') || normalized.includes('communication')) {
    return { icon: 'ri-megaphone-line', iconBg: 'bg-pink-100', iconColor: 'text-pink-600' };
  }
  if (normalized.includes('informat') || normalized.includes('react') || normalized.includes('tech')) {
    return { icon: 'ri-code-s-slash-line', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' };
  }
  if (normalized.includes('gestion') || normalized.includes('project')) {
    return { icon: 'ri-kanban-view-2', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' };
  }
  if (normalized.includes('finance') || normalized.includes('compta')) {
    return { icon: 'ri-money-dollar-circle-line', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' };
  }
  if (normalized.includes('design')) {
    return { icon: 'ri-palette-line', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' };
  }
  return { icon: 'ri-bar-chart-grouped-line', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' };
}

export function buildWeeklyActivity(
  enrollments: Enrollment[],
  submissions: Submission[],
  certificates: Certificate[],
): { points: WeeklyActivityPoint[]; total: number; unitLabel: string } {
  const today = new Date();
  const points: WeeklyActivityPoint[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = date.toISOString().split('T')[0];
    const label = date.toLocaleDateString('fr-FR', { weekday: 'short' });

    const activeCount = enrollments.filter((enrollment) => enrollment.last_active?.startsWith(dateKey)).length;
    const submissionCount = submissions.filter((submission) => submission.submitted_at?.startsWith(dateKey)).length;
    const certificateCount = certificates.filter((certificate) => certificate.issued_at?.startsWith(dateKey)).length;
    const value = activeCount + submissionCount * 2 + certificateCount * 3;

    points.push({
      date: dateKey,
      label,
      value,
      caption: `${value} signal${value > 1 ? 's' : ''}`,
    });
  }

  return {
    points,
    total: points.reduce((sum, point) => sum + point.value, 0),
    unitLabel: 'signaux cette semaine',
  };
}

export function buildLearningCourses(enrollments: (Enrollment & { courses?: CourseRelation | null })[]): LearningCourse[] {
  return enrollments.map((enrollment) => {
    const totalLessons = Math.max(
      enrollment.course_lessons_count ?? 0,
      enrollment.courses?.modules ?? 0,
      1,
    );
    const completedLessons = Math.max(
      enrollment.completed_lessons_estimate ?? Math.round((enrollment.progress / 100) * totalLessons),
    );

    return {
      courseId: enrollment.course_id,
      title: enrollment.courses?.title || enrollment.course_name || 'Formation',
      category: enrollment.courses?.category || enrollment.course_category || 'Général',
      progress: Math.max(0, Math.min(100, Math.round(enrollment.progress ?? 0))),
      totalLessons,
      completedLessons,
      lastActive: enrollment.last_active,
      learningTimeSeconds: Math.max(0, Math.floor(enrollment.learning_time_seconds ?? 0)),
      certificateStatus: enrollment.certificate_status || 'pending',
      pendingGradingCount: enrollment.pending_grading_count || 0,
      thumbnail: enrollment.courses?.thumbnail || null,
      duration: enrollment.courses?.duration || null,
    };
  });
}

export function buildFocusAreas(courses: LearningCourse[]): FocusArea[] {
  const groups = new Map<string, FocusArea>();

  for (const course of courses) {
    const current = groups.get(course.category) || {
      key: course.category,
      label: course.category,
      ...getCategoryPresentation(course.category),
      progress: 0,
      coursesCount: 0,
      completedCourses: 0,
      completedLessons: 0,
      totalLessons: 0,
      learningTimeSeconds: 0,
    };

    current.progress += course.progress;
    current.coursesCount += 1;
    current.completedCourses += course.progress >= 100 ? 1 : 0;
    current.completedLessons += course.completedLessons;
    current.totalLessons += course.totalLessons;
    current.learningTimeSeconds += course.learningTimeSeconds;
    groups.set(course.category, current);
  }

  return Array.from(groups.values())
    .map((entry) => ({
      ...entry,
      progress: entry.coursesCount ? Math.round(entry.progress / entry.coursesCount) : 0,
    }))
    .sort((left, right) => right.progress - left.progress)
    .slice(0, 6);
}

export function buildProgressionSummary(courses: LearningCourse[]) {
  const completedCourses = courses.filter((course) => course.progress >= 100).length;
  const inProgressCourses = courses.filter((course) => course.progress > 0 && course.progress < 100).length;
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const totalCompletedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const fallbackEstimatedTimeSeconds = courses.reduce((sum, course) => {
    const durationMinutes = parseDurationToMinutes(course.duration);
    if (durationMinutes <= 0 || course.totalLessons <= 0) return sum;
    return sum + Math.round((durationMinutes / course.totalLessons) * course.completedLessons * 60);
  }, 0);
  const persistedLearningTimeSeconds = courses.reduce((sum, course) => sum + course.learningTimeSeconds, 0);
  const effectiveLearningTimeSeconds = persistedLearningTimeSeconds > 0 ? persistedLearningTimeSeconds : fallbackEstimatedTimeSeconds;
  const averageProgress = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length)
    : 0;
  const pendingGradingCount = courses.reduce((sum, course) => sum + course.pendingGradingCount, 0);

  return {
    completedCourses,
    inProgressCourses,
    totalLessons,
    totalCompletedLessons,
    effectiveLearningTimeSeconds,
    averageProgress,
    pendingGradingCount,
  };
}

export function buildProgressionPriorities(courses: LearningCourse[]) {
  return [...courses]
    .filter((course) => course.progress < 100)
    .sort((left, right) => {
      const leftDays = getDaysSince(left.lastActive) ?? 99;
      const rightDays = getDaysSince(right.lastActive) ?? 99;
      if (leftDays !== rightDays) return rightDays - leftDays;
      return left.progress - right.progress;
    })
    .slice(0, 3);
}
