import type {
  ApprenantCertificate,
  ApprenantEnrollment,
  ApprenantSubmission,
} from './apprenantDashboardApi';

export interface LearningBadge {
  id: string;
  icon: string;
  name: string;
  description: string;
  color: string;
}

export const LEARNING_BADGES: LearningBadge[] = [
  { id: 'starter', icon: 'ri-flashlight-line', name: 'Premier pas', description: 'Avoir complété au moins 1 leçon', color: 'amber' },
  { id: 'halfway', icon: 'ri-trophy-line', name: 'À mi-parcours', description: 'Atteindre 50% de progression dans un cours', color: 'teal' },
  { id: 'finisher', icon: 'ri-award-line', name: 'Finisher', description: 'Compléter 100% d’un cours', color: 'emerald' },
  { id: 'quiz-master', icon: 'ri-medal-line', name: 'Quiz validés', description: 'Réussir plusieurs évaluations corrigées', color: 'violet' },
  { id: 'xp-1000', icon: 'ri-fire-line', name: 'Apprenti passionné', description: 'Atteindre 1000 XP estimés', color: 'orange' },
  { id: 'xp-5000', icon: 'ri-vip-crown-line', name: 'Expert', description: 'Atteindre 5000 XP estimés', color: 'amber' },
  { id: 'streak-7', icon: 'ri-calendar-check-line', name: 'Régularité', description: 'Apprendre 7 jours consécutifs', color: 'teal' },
  { id: 'streak-30', icon: 'ri-calendar-todo-line', name: 'Discipline', description: 'Apprendre 30 jours consécutifs', color: 'emerald' },
  { id: 'courses-5', icon: 'ri-stack-line', name: 'Explorateur', description: 'Commencer 5 cours différents', color: 'sky' },
  { id: 'courses-3-done', icon: 'ri-star-line', name: 'Triple réussite', description: 'Terminer 3 cours à 100%', color: 'amber' },
];

export function getEnrollmentCompletedLessons(enrollment: ApprenantEnrollment) {
  const totalLessons = Math.max(enrollment.course_lessons_count ?? enrollment.courses?.modules ?? 0, 1);
  return Math.max(
    0,
    Math.min(totalLessons, enrollment.completed_lessons_estimate ?? Math.round((enrollment.progress / 100) * totalLessons)),
  );
}

export function deriveLearningXp(input: {
  enrollments: ApprenantEnrollment[];
  submissions?: ApprenantSubmission[];
  certificates?: ApprenantCertificate[];
}) {
  const lessonXp = input.enrollments.reduce((sum, enrollment) => sum + getEnrollmentCompletedLessons(enrollment) * 15, 0);
  const completedCourseXp = input.enrollments.filter((enrollment) => Number(enrollment.progress) >= 100).length * 200;
  const submissionXp = (input.submissions ?? []).length * 25;
  const certificateXp = (input.certificates ?? []).filter((certificate) => certificate.issued_at).length * 100;
  return lessonXp + completedCourseXp + submissionXp + certificateXp;
}

export function deriveLearningStreak(enrollments: ApprenantEnrollment[]) {
  const activeDays = Array.from(new Set(
    enrollments
      .map((enrollment) => String(enrollment.last_active ?? '').slice(0, 10))
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));
  if (activeDays.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (!activeDays.includes(today) && !activeDays.includes(yesterday)) return 0;

  let streak = 0;
  let expected = activeDays.includes(today) ? new Date(`${today}T00:00:00`) : new Date(`${yesterday}T00:00:00`);
  const activeDaySet = new Set(activeDays);
  while (activeDaySet.has(expected.toISOString().slice(0, 10))) {
    streak += 1;
    expected = new Date(expected.getTime() - 86_400_000);
  }
  return streak;
}

export function deriveUnlockedLearningBadges(input: {
  enrollments: ApprenantEnrollment[];
  submissions?: ApprenantSubmission[];
  certificates?: ApprenantCertificate[];
}) {
  const unlocked = new Set<string>();
  const completedLessons = input.enrollments.reduce((sum, enrollment) => sum + getEnrollmentCompletedLessons(enrollment), 0);
  const completedCourses = input.enrollments.filter((enrollment) => Number(enrollment.progress) >= 100).length;
  const xp = deriveLearningXp(input);
  const streak = deriveLearningStreak(input.enrollments);
  const gradedSubmissions = (input.submissions ?? []).filter((submission) => submission.grade !== null && submission.grade !== undefined);

  if (completedLessons >= 1) unlocked.add('starter');
  if (input.enrollments.some((enrollment) => Number(enrollment.progress) >= 50)) unlocked.add('halfway');
  if (completedCourses >= 1) unlocked.add('finisher');
  if (gradedSubmissions.length >= 3) unlocked.add('quiz-master');
  if (xp >= 1000) unlocked.add('xp-1000');
  if (xp >= 5000) unlocked.add('xp-5000');
  if (streak >= 7) unlocked.add('streak-7');
  if (streak >= 30) unlocked.add('streak-30');
  if (input.enrollments.length >= 5) unlocked.add('courses-5');
  if (completedCourses >= 3) unlocked.add('courses-3-done');

  return Array.from(unlocked);
}
