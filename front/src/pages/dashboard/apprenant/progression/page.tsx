import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { backendClient } from '@/lib/backendClient';
import {
  getCurrentStreak,
  loadCourseHistory,
  loadDailyXP,
  loadLearningDays,
  loadSessionTime,
  loadTotalLearningTime,
  loadUnlockedBadges,
  loadXP,
  type CourseHistoryEntry,
} from '../cours/[id]/storage';

interface CourseRelation {
  id: number;
  title: string;
  category: string | null;
  duration: string | null;
  modules: number | null;
  thumbnail: string | null;
}

interface Enrollment {
  id: number;
  course_id: number;
  progress: number;
  grade: number | null;
  status: string;
  last_active: string;
  course_name?: string | null;
  course_category?: string | null;
  course_lessons_count?: number;
  completed_lessons_estimate?: number;
  pending_grading_count?: number;
  certificate_status?: string;
  courses?: CourseRelation | null;
}

interface Certificate {
  id: number;
  course_id: number;
  course_name: string | null;
  status: string;
  issued_at: string | null;
  grade: number | null;
  certificate_number: string | null;
}

interface Submission {
  id: number;
  exam_id: number;
  submitted_at: string | null;
  grade: number | null;
  status: string;
}

interface ProgressionSettings {
  weeklyGoal: number;
  streakGoal: number;
  focusGoal: string;
}

interface LearningCourse {
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

interface FocusArea {
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

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  detail: string;
}

interface WeeklyActivityPoint {
  date: string;
  label: string;
  value: number;
  caption: string;
}

const PROGRESSION_SETTINGS_KEY = 'c2p-progression-settings';

const DEFAULT_SETTINGS: ProgressionSettings = {
  weeklyGoal: 250,
  streakGoal: 7,
  focusGoal: 'Rester régulier sur mes cours actifs',
};

function loadSettings(): ProgressionSettings {
  try {
    const raw = localStorage.getItem(PROGRESSION_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ProgressionSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: ProgressionSettings) {
  localStorage.setItem(PROGRESSION_SETTINGS_KEY, JSON.stringify(settings));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function getDaysSince(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function formatRelativeActivity(value: string | null | undefined) {
  const daysSince = getDaysSince(value);
  if (daysSince === null) return '-';
  if (daysSince === 0) return "Aujourd'hui";
  if (daysSince === 1) return 'Hier';
  if (daysSince < 7) return `Il y a ${daysSince} jours`;
  return `Il y a ${daysSince} j`;
}

function formatLearningTime(totalSeconds: number) {
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

function buildWeeklyActivity(
  enrollments: Enrollment[],
  submissions: Submission[],
  certificates: Certificate[],
): { points: WeeklyActivityPoint[]; total: number; unitLabel: string } {
  const today = new Date();
  const learningDays = loadLearningDays();
  const hasLocalXp = learningDays.length > 0;
  const points: WeeklyActivityPoint[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = date.toISOString().split('T')[0];
    const label = date.toLocaleDateString('fr-FR', { weekday: 'short' });

    if (hasLocalXp) {
      const xp = loadDailyXP(dateKey);
      points.push({
        date: dateKey,
        label,
        value: xp,
        caption: `${xp} XP`,
      });
      continue;
    }

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
    unitLabel: hasLocalXp ? 'XP cette semaine' : 'signaux cette semaine',
  };
}

function buildAchievements(
  courses: LearningCourse[],
  certificates: Certificate[],
  submissions: Submission[],
  xp: number,
  streak: number,
  unlockedBadges: string[],
): Achievement[] {
  const categoriesCount = new Set(courses.map((course) => course.category)).size;
  const startedCourses = courses.filter((course) => course.progress > 0).length;
  const completedCourses = courses.filter((course) => course.progress >= 100).length;
  const totalCompletedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const averageProgress = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length)
    : 0;

  return [
    {
      id: 'first-step',
      title: 'Premier pas',
      description: 'Avoir démarré au moins une formation',
      icon: 'ri-footprint-line',
      color: 'bg-teal-500',
      unlocked: startedCourses > 0,
      detail: startedCourses > 0 ? `${startedCourses} formation(s) déjà lancée(s)` : 'Démarrez une première formation',
    },
    {
      id: 'streak',
      title: 'Régularité',
      description: 'Maintenir 7 jours consécutifs d’activité',
      icon: 'ri-fire-line',
      color: 'bg-orange-500',
      unlocked: streak >= 7 || unlockedBadges.includes('streak-7'),
      detail: `${streak} jour(s) de streak actuel`,
    },
    {
      id: 'first-certificate',
      title: 'Premier certificat',
      description: 'Obtenir au moins un certificat',
      icon: 'ri-award-line',
      color: 'bg-yellow-500',
      unlocked: certificates.length > 0,
      detail: certificates.length > 0 ? `${certificates.length} certificat(s) déjà émis` : 'Finalisez une première formation',
    },
    {
      id: 'finisher',
      title: 'Terminator',
      description: 'Terminer un cours à 100%',
      icon: 'ri-medal-line',
      color: 'bg-emerald-500',
      unlocked: completedCourses > 0 || unlockedBadges.includes('finisher'),
      detail: `${completedCourses} formation(s) terminée(s)`,
    },
    {
      id: 'polyvalent',
      title: 'Polyvalent',
      description: 'Progresser dans 3 catégories distinctes',
      icon: 'ri-global-line',
      color: 'bg-sky-500',
      unlocked: categoriesCount >= 3 || unlockedBadges.includes('courses-5'),
      detail: `${categoriesCount} catégorie(s) actives`,
    },
    {
      id: 'evalue',
      title: 'Évalué',
      description: 'Soumettre 3 évaluations',
      icon: 'ri-file-list-3-line',
      color: 'bg-violet-500',
      unlocked: submissions.length >= 3,
      detail: `${submissions.length} soumission(s) enregistrée(s)`,
    },
    {
      id: 'xp',
      title: 'Apprenti passionné',
      description: 'Atteindre 1000 XP',
      icon: 'ri-vip-crown-line',
      color: 'bg-amber-500',
      unlocked: xp >= 1000 || unlockedBadges.includes('xp-1000'),
      detail: `${xp} XP cumulés`,
    },
    {
      id: 'mastery',
      title: 'Cap confirmé',
      description: 'Dépasser 80% de progression moyenne',
      icon: 'ri-trophy-line',
      color: 'bg-rose-500',
      unlocked: averageProgress >= 80,
      detail: `${averageProgress}% de progression moyenne`,
    },
    {
      id: 'lessons',
      title: 'Rythme installé',
      description: 'Compléter au moins 10 leçons',
      icon: 'ri-check-double-line',
      color: 'bg-blue-500',
      unlocked: totalCompletedLessons >= 10,
      detail: `${totalCompletedLessons} leçon(s) complétée(s)`,
    },
  ];
}

export default function ApprenantProgressionPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<ProgressionSettings>(DEFAULT_SETTINGS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<ProgressionSettings>(DEFAULT_SETTINGS);
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setEnrollments([]);
      setCertificates([]);
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [enrollmentRes, certificateRes, submissionRes] = await Promise.all([
        backendClient
          .from('course_enrollments')
          .select('*, courses(id, title, category, duration, modules, thumbnail)')
          .eq('student_id', user.id)
          .order('last_active', { ascending: false }),
        backendClient
          .from('certificates')
          .select('*')
          .eq('student_id', user.id)
          .order('issued_at', { ascending: false }),
        backendClient
          .from('submissions')
          .select('*')
          .eq('student_id', user.id)
          .order('submitted_at', { ascending: false }),
      ]);

      if (enrollmentRes.error) throw enrollmentRes.error;
      if (certificateRes.error) throw certificateRes.error;
      if (submissionRes.error) throw submissionRes.error;

      setEnrollments((enrollmentRes.data || []) as Enrollment[]);
      setCertificates((certificateRes.data || []) as Certificate[]);
      setSubmissions((submissionRes.data || []) as Submission[]);
      const storedSettings = loadSettings();
      setSettings(storedSettings);
      setSettingsDraft(storedSettings);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de charger votre progression.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const history = useMemo(() => loadCourseHistory(), []);
  const historyByCourseId = useMemo(() => new Map<number, CourseHistoryEntry>(history.map((entry) => [entry.courseId, entry])), [history]);
  const totalLearningTimeSeconds = useMemo(() => loadTotalLearningTime(), []);
  const xp = useMemo(() => loadXP(), []);
  const streak = useMemo(() => getCurrentStreak(), []);
  const unlockedBadges = useMemo(() => loadUnlockedBadges(), []);

  const courses = useMemo<LearningCourse[]>(() => enrollments.map((enrollment) => {
    const historyEntry = historyByCourseId.get(enrollment.course_id);
    const totalLessons = Math.max(
      historyEntry?.totalLessons ?? 0,
      enrollment.course_lessons_count ?? 0,
      enrollment.courses?.modules ?? 0,
      1,
    );
    const completedLessons = Math.max(
      historyEntry?.completedLessons ?? 0,
      enrollment.completed_lessons_estimate ?? Math.round((enrollment.progress / 100) * totalLessons),
    );

    return {
      courseId: enrollment.course_id,
      title: enrollment.courses?.title || enrollment.course_name || historyEntry?.title || 'Formation',
      category: enrollment.courses?.category || enrollment.course_category || historyEntry?.category || 'Général',
      progress: Math.max(historyEntry?.progress ?? 0, enrollment.progress ?? 0),
      totalLessons,
      completedLessons,
      lastActive: historyEntry?.lastAccessed || enrollment.last_active,
      learningTimeSeconds: loadSessionTime(enrollment.course_id),
      certificateStatus: enrollment.certificate_status || 'pending',
      pendingGradingCount: enrollment.pending_grading_count || 0,
      thumbnail: enrollment.courses?.thumbnail || historyEntry?.thumbnail || null,
      duration: enrollment.courses?.duration || null,
    };
  }), [enrollments, historyByCourseId]);

  const weeklyActivity = useMemo(
    () => buildWeeklyActivity(enrollments, submissions, certificates),
    [certificates, enrollments, submissions],
  );

  const focusAreas = useMemo<FocusArea[]>(() => {
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
  }, [courses]);

  const achievements = useMemo(
    () => buildAchievements(courses, certificates, submissions, xp, streak, unlockedBadges),
    [certificates, courses, streak, submissions, unlockedBadges, xp],
  );

  const completedCourses = courses.filter((course) => course.progress >= 100).length;
  const inProgressCourses = courses.filter((course) => course.progress > 0 && course.progress < 100).length;
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const totalCompletedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const fallbackEstimatedTimeSeconds = courses.reduce((sum, course) => {
    const durationMinutes = parseDurationToMinutes(course.duration);
    if (durationMinutes <= 0 || course.totalLessons <= 0) return sum;
    return sum + Math.round((durationMinutes / course.totalLessons) * course.completedLessons * 60);
  }, 0);
  const effectiveLearningTimeSeconds = totalLearningTimeSeconds > 0 ? totalLearningTimeSeconds : fallbackEstimatedTimeSeconds;
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;

  const priorities = useMemo(
    () => [...courses]
      .filter((course) => course.progress < 100)
      .sort((left, right) => {
        const leftDays = getDaysSince(left.lastActive) ?? 99;
        const rightDays = getDaysSince(right.lastActive) ?? 99;
        if (leftDays !== rightDays) return rightDays - leftDays;
        return left.progress - right.progress;
      })
      .slice(0, 3),
    [courses],
  );

  const maxWeeklyValue = useMemo(
    () => Math.max(1, ...weeklyActivity.points.map((point) => point.value)),
    [weeklyActivity.points],
  );

  const weeklyGoalProgress = Math.min(
    100,
    settings.weeklyGoal > 0 ? Math.round((weeklyActivity.total / settings.weeklyGoal) * 100) : 0,
  );
  const streakGoalProgress = Math.min(
    100,
    settings.streakGoal > 0 ? Math.round((streak / settings.streakGoal) * 100) : 0,
  );

  const handleSaveSettings = () => {
    saveSettings(settingsDraft);
    setSettings(settingsDraft);
    setShowSettingsModal(false);
    success('Objectifs enregistrés', 'Vos objectifs de progression ont été mis à jour.');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Ma progression' }]} />

        <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Ma progression</h1>
            <p className="text-gray-600 text-sm md:text-base">
              Vue consolidée de vos cours, de votre cadence d&apos;apprentissage et de vos prochaines priorités.
            </p>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <i className="ri-settings-3-line"></i>
            Configurer mes objectifs
          </button>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <SkeletonCard count={5} />
            </div>
            <SkeletonList count={6} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Temps cumulé', value: formatLearningTime(effectiveLearningTimeSeconds), icon: 'ri-time-line', color: 'bg-teal-500' },
                { label: 'Leçons complétées', value: String(totalCompletedLessons), icon: 'ri-check-double-line', color: 'bg-green-500' },
                { label: 'Cours en cours', value: String(inProgressCourses), icon: 'ri-book-open-line', color: 'bg-blue-500' },
                { label: 'Certificats', value: String(certificates.filter((certificate) => certificate.status === 'issued').length), icon: 'ri-award-line', color: 'bg-violet-500' },
                { label: 'Succès débloqués', value: `${unlockedAchievements}/${achievements.length}`, icon: 'ri-trophy-line', color: 'bg-amber-500' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className={`${stat.icon} text-white text-sm`}></i>
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-600">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 mb-8">
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Engagement hebdomadaire</h2>
                    <p className="text-sm text-gray-500">{weeklyActivity.unitLabel}: {weeklyActivity.total}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-teal-600">{weeklyGoalProgress}% de l&apos;objectif</p>
                    <p className="text-xs text-gray-500">Objectif: {settings.weeklyGoal} points</p>
                  </div>
                </div>

                <div className="flex items-end gap-3 h-52">
                  {weeklyActivity.points.map((point) => (
                    <div key={point.date} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '150px' }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-teal-500 rounded-lg transition-all duration-500"
                          style={{ height: `${Math.max((point.value / maxWeeklyValue) * 100, point.value > 0 ? 8 : 0)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600 capitalize">{point.label.replace('.', '')}</span>
                      <span className="text-[11px] text-gray-400">{point.caption}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Objectifs actifs</h2>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Objectif hebdo</span>
                      <span className="text-sm font-semibold text-gray-900">{weeklyActivity.total}/{settings.weeklyGoal}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-teal-500 h-2.5 rounded-full transition-all" style={{ width: `${weeklyGoalProgress}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Streak visé</span>
                      <span className="text-sm font-semibold text-gray-900">{streak}/{settings.streakGoal} jours</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-orange-500 h-2.5 rounded-full transition-all" style={{ width: `${streakGoalProgress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Record personnel: {streak} jour(s) consécutif(s) actuellement.</p>
                  </div>

                  <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                    <p className="text-xs font-medium text-teal-800 mb-1">Focus du moment</p>
                    <p className="text-sm text-teal-900">{settings.focusGoal}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/dashboard/apprenant/mes-cours" className="rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center">
                      Reprendre mes cours
                    </Link>
                    <Link to="/dashboard/apprenant/certificats" className="rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center">
                      Voir mes certificats
                    </Link>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Mes compétences par domaine</h2>
                    <p className="text-sm text-gray-500">Basé sur vos formations suivies et votre progression réelle.</p>
                  </div>
                  <span className="text-sm text-gray-500">{focusAreas.length} domaine(s)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {focusAreas.map((focus) => (
                    <button
                      key={focus.key}
                      type="button"
                      aria-label={`Voir le détail de ${focus.label}`}
                      onClick={() => setSelectedFocus(focus)}
                      className="text-left p-4 border border-gray-100 rounded-lg hover:border-teal-200 hover:shadow-sm transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${focus.iconBg} rounded-lg flex items-center justify-center`}>
                            <i className={`${focus.icon} ${focus.iconColor} text-lg`}></i>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 text-sm">{focus.label}</h3>
                            <p className="text-xs text-gray-500">{focus.coursesCount} cours</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-teal-600">{focus.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            focus.progress >= 80 ? 'bg-green-500' : focus.progress >= 50 ? 'bg-teal-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${focus.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {focus.completedLessons}/{focus.totalLessons} leçons estimées • {focus.completedCourses} terminé(s)
                      </p>
                    </button>
                  ))}

                  {focusAreas.length === 0 && (
                    <div className="md:col-span-2 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                      Aucune compétence consolidée pour le moment. Commencez par suivre un cours.
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Priorités du moment</h2>
                    <p className="text-sm text-gray-500">Cours à reprendre ou à terminer.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {priorities.map((course) => (
                    <div key={course.courseId} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{course.title}</p>
                          <p className="text-xs text-gray-500">{course.category}</p>
                        </div>
                        <span className="text-sm font-semibold text-teal-600">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${course.progress}%` }}></div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                        <span>{course.completedLessons}/{course.totalLessons} leçons</span>
                        <span>{formatRelativeActivity(course.lastActive)}</span>
                        {course.pendingGradingCount > 0 && <span>{course.pendingGradingCount} correction(s) en attente</span>}
                      </div>
                      <Link
                        to={`/dashboard/apprenant/cours/${course.courseId}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                      >
                        Continuer
                        <i className="ri-arrow-right-line"></i>
                      </Link>
                    </div>
                  ))}

                  {priorities.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                      Aucun cours prioritaire pour le moment.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Succès débloqués</h2>
                  <p className="text-sm text-gray-500">Calculés à partir de votre activité réelle et de vos badges locaux.</p>
                </div>
                <span className="text-sm text-gray-500">{unlockedAchievements}/{achievements.length}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      achievement.unlocked ? 'border-transparent hover:shadow-md bg-white' : 'border-gray-100 bg-gray-50 opacity-70'
                    }`}
                  >
                    <div className={`w-12 h-12 ${achievement.unlocked ? achievement.color : 'bg-gray-300'} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                      <i className={`${achievement.icon} text-xl text-white`}></i>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{achievement.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">{achievement.description}</p>
                    <p className="text-[11px] text-gray-400">{achievement.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {selectedFocus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${selectedFocus.iconBg} rounded-xl flex items-center justify-center`}>
                    <i className={`${selectedFocus.icon} ${selectedFocus.iconColor} text-xl`}></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedFocus.label}</h3>
                    <p className="text-sm text-gray-600">{selectedFocus.coursesCount} cours suivis</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFocus(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Fermer le détail de la compétence"
                >
                  <i className="ri-close-line text-gray-500 text-xl"></i>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progression moyenne</span>
                  <span className="text-lg font-bold text-teal-600">{selectedFocus.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      selectedFocus.progress >= 80 ? 'bg-green-500' : selectedFocus.progress >= 50 ? 'bg-teal-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${selectedFocus.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Leçons estimées</p>
                  <p className="text-sm font-medium text-gray-900">{selectedFocus.completedLessons}/{selectedFocus.totalLessons}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Cours terminés</p>
                  <p className="text-sm font-medium text-gray-900">{selectedFocus.completedCourses}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Temps cumulé estimé</p>
                  <p className="text-sm font-medium text-gray-900">{formatLearningTime(selectedFocus.learningTimeSeconds)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  {selectedFocus.progress >= 80
                    ? 'Vous êtes en zone de maîtrise. Le bon levier maintenant est de finaliser les derniers cours et de capitaliser sur les certificats.'
                    : selectedFocus.progress >= 50
                      ? 'La base est bien installée. Gardez un rythme régulier et reprenez les cours laissés à mi-parcours pour consolider ce domaine.'
                      : 'Le domaine est encore en construction. Reprenez en priorité les cours les moins avancés pour remettre la progression sur des bases solides.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Configurer mes objectifs</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Fermer la configuration des objectifs"
                >
                  <i className="ri-close-line text-gray-500 text-xl"></i>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objectif hebdomadaire</label>
                  <input
                    type="number"
                    min="0"
                    value={settingsDraft.weeklyGoal}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, weeklyGoal: Number(event.target.value) || 0 }))}
                    placeholder="Ex: 250"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Utilise vos XP si disponibles, sinon vos signaux d&apos;activité sur 7 jours.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objectif de streak</label>
                  <input
                    type="number"
                    min="0"
                    value={settingsDraft.streakGoal}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, streakGoal: Number(event.target.value) || 0 }))}
                    placeholder="Ex: 7"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Focus personnel</label>
                  <textarea
                    value={settingsDraft.focusGoal}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, focusGoal: event.target.value }))}
                    placeholder="Ex: Reprendre mes cours React avant vendredi"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-24 resize-none"
                  />
                </div>

                <div className="bg-teal-50 rounded-lg p-4">
                  <p className="text-sm text-teal-800">
                    <i className="ri-information-line mr-1"></i>
                    Ces objectifs sont conservés localement pour personnaliser votre pilotage d&apos;apprentissage.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
