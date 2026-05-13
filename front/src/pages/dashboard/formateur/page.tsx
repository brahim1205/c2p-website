import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import type { FinanceSnapshot } from '@/lib/saasApi';
import { fetchFormateurDashboardSnapshot } from '@/lib/formateurDashboardApi';
import {
  courseStatusClasses,
  courseStatusLabels,
  getCourseReadinessIssues,
  getInstructorWorkflowAction,
  type CourseWorkflowStatus,
} from '@/lib/courseWorkflow';

interface Course {
  id: number | string;
  title: string;
  category: string | null;
  description: string | null;
  status: CourseWorkflowStatus;
  students_count: number;
  completion_rate: number;
  revenue: number;
  modules: number;
  lessons_count?: number;
  assets_count?: number;
  preview_lessons_count?: number;
  published_lessons_count?: number;
  duration: string | null;
  updated_at: string;
  thumbnail: string | null;
  price: number | null;
}

interface Enrollment {
  id: number;
  student_id: string;
  student_name: string;
  student_email: string | null;
  progress: number;
  last_active: string;
  course_id: number;
  course_name?: string | null;
  attention_level?: 'on_track' | 'watch' | 'at_risk' | 'completed' | string;
  pending_grading_count?: number;
  certificate_status?: string;
  days_since_active?: number;
}

interface Exam {
  id: number;
  title: string;
  type: string;
  course_id: number;
  course_name?: string | null;
  status: string;
  max_grade: number;
  submitted?: number;
  avg_grade?: number | null;
  questions_count?: number;
  open_questions_count?: number;
  auto_gradable?: boolean;
}

interface Submission {
  id: number;
  exam_id: number;
  student_id: string;
  student_name?: string | null;
  status: string;
  submitted_at: string | null;
  grade: number | null;
}

interface CourseInsight extends Course {
  readinessIssues: string[];
  workflowActionLabel: string | null;
}

function formatCurrency(amount: number) {
  if (!amount) return '0 FCFA';
  return `${amount.toLocaleString('fr-FR')} FCFA`;
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
  const days = getDaysSince(value);
  if (days === null) return '-';
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return `Il y a ${days} j`;
}

function getAttentionBadge(level: string | undefined) {
  const styles: Record<string, string> = {
    on_track: 'bg-emerald-100 text-emerald-700',
    watch: 'bg-amber-100 text-amber-700',
    at_risk: 'bg-red-100 text-red-700',
    completed: 'bg-teal-100 text-teal-700',
  };
  const labels: Record<string, string> = {
    on_track: 'Sur la bonne voie',
    watch: 'À surveiller',
    at_risk: 'À relancer',
    completed: 'Terminé',
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${styles[level || 'watch'] || 'bg-gray-100 text-gray-700'}`}>
      {labels[level || 'watch'] || level}
    </span>
  );
}

function getExamTypeLabel(type: string) {
  const labels: Record<string, string> = {
    quiz: 'Quiz',
    assignment: 'Devoir',
    project: 'Projet',
    oral: 'Oral',
  };
  return labels[type] || type;
}

export default function FormateurDashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [finance, setFinance] = useState<FinanceSnapshot | null>(null);
  const isMountedRef = useRef(true);
  const subscriptionGate = gateFor('trainer_courses_manage');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      if (isMountedRef.current) {
        setCourses([]);
        setStudents([]);
        setExams([]);
        setSubmissions([]);
        setLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
    }
    try {
      const snapshot = await fetchFormateurDashboardSnapshot({ id: user.id, role: user.role });

      if (!isMountedRef.current) return;
      setCourses(snapshot.courses as Course[]);
      setStudents(snapshot.students as Enrollment[]);
      setExams(snapshot.exams as Exam[]);
      setSubmissions(snapshot.submissions as Submission[]);
      setFinance(snapshot.finance as FinanceSnapshot | null);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de charger les données du tableau de bord formateur.');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [error, user?.id, user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const courseInsights = useMemo<CourseInsight[]>(() => courses.map((course) => {
    const readinessIssues = getCourseReadinessIssues({
      description: course.description,
      duration: course.duration,
      thumbnail: course.thumbnail,
      sectionCount: Number(course.modules || 0),
      lessonCount: Number(course.lessons_count || 0),
    });
    const workflowAction = getInstructorWorkflowAction(course.status);
    return {
      ...course,
      readinessIssues,
      workflowActionLabel: workflowAction?.description ?? null,
    };
  }), [courses]);

  const pendingCorrectionsCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'pending').length,
    [submissions],
  );
  const atRiskEnrollments = useMemo(
    () => students.filter((student) => student.attention_level === 'at_risk').sort((left, right) => (right.days_since_active ?? getDaysSince(right.last_active) ?? 0) - (left.days_since_active ?? getDaysSince(left.last_active) ?? 0)),
    [students],
  );
  const watchEnrollments = useMemo(
    () => students.filter((student) => student.attention_level === 'watch'),
    [students],
  );
  const quizExams = useMemo(
    () => exams.filter((exam) => exam.type === 'quiz'),
    [exams],
  );
  const quizsToConfigureCount = useMemo(
    () => quizExams.filter((exam) => (exam.questions_count || 0) === 0).length,
    [quizExams],
  );
  const readyDraftCount = useMemo(
    () => courseInsights.filter((course) => course.status === 'draft' && course.readinessIssues.length === 0).length,
    [courseInsights],
  );
  const reviewCount = useMemo(
    () => courseInsights.filter((course) => course.status === 'review').length,
    [courseInsights],
  );
  const publishedCount = useMemo(
    () => courseInsights.filter((course) => course.status === 'published').length,
    [courseInsights],
  );

  const pipelineCourses = useMemo(
    () => [...courseInsights].sort((left, right) => {
      if (left.status !== right.status) {
        const priority: Record<CourseWorkflowStatus, number> = {
          draft: 0,
          rejected: 1,
          review: 2,
          published: 3,
          archived: 4,
        };
        return priority[left.status] - priority[right.status];
      }
      if (left.readinessIssues.length !== right.readinessIssues.length) {
        return left.readinessIssues.length - right.readinessIssues.length;
      }
      return Date.parse(right.updated_at) - Date.parse(left.updated_at);
    }).slice(0, 5),
    [courseInsights],
  );

  const examsWithInsights = useMemo(() => exams.map((exam) => ({
    ...exam,
    pendingCorrections: submissions.filter((submission) => submission.exam_id === exam.id && submission.status === 'pending').length,
  })), [exams, submissions]);

  const totalSections = useMemo(
    () => courses.reduce((sum, course) => sum + Number(course.modules || 0), 0),
    [courses],
  );
  const totalLessons = useMemo(
    () => courses.reduce((sum, course) => sum + Number(course.lessons_count || 0), 0),
    [courses],
  );
  const totalAssets = useMemo(
    () => courses.reduce((sum, course) => sum + Number(course.assets_count || 0), 0),
    [courses],
  );
  const totalPreviewLessons = useMemo(
    () => courses.reduce((sum, course) => sum + Number(course.preview_lessons_count || 0), 0),
    [courses],
  );
  const coursesMissingContentCount = useMemo(
    () => courseInsights.filter((course) => (course.assets_count || 0) === 0 || (course.lessons_count || 0) === 0).length,
    [courseInsights],
  );
  const latestUpdatedCourse = useMemo(
    () => [...courseInsights].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))[0] ?? null,
    [courseInsights],
  );

  const stats = [
    {
      label: 'Cours publiés',
      value: String(publishedCount),
      detail: `${readyDraftCount} brouillon(s) prêts`,
      icon: 'ri-presentation-line',
      surface: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'En révision',
      value: String(reviewCount),
      detail: `${courseInsights.filter((course) => course.status === 'draft').length} brouillon(s) actifs`,
      icon: 'ri-shield-check-line',
      surface: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Apprenants à relancer',
      value: String(new Set(atRiskEnrollments.map((student) => student.student_id)).size),
      detail: `${watchEnrollments.length} à surveiller`,
      icon: 'ri-alarm-warning-line',
      surface: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Corrections en attente',
      value: String(pendingCorrectionsCount),
      detail: `${quizsToConfigureCount} quiz à finaliser`,
      icon: 'ri-file-list-3-line',
      surface: 'bg-violet-50 text-violet-700',
    },
  ];

  const quickLinks = [
    { label: 'Mes formations', icon: 'ri-book-open-line', path: '/dashboard/formateur/mes-cours', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Programme', icon: 'ri-node-tree', path: latestUpdatedCourse ? `/dashboard/formateur/mes-cours/${latestUpdatedCourse.id}/programme` : '/dashboard/formateur/mes-cours', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Apprenants', icon: 'ri-group-line', path: '/dashboard/formateur/apprenants', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Évaluations', icon: 'ri-file-list-3-line', path: '/dashboard/formateur/evaluations', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Revenus', icon: 'ri-wallet-3-line', path: '/dashboard/formateur/revenus', tone: 'bg-violet-50 text-violet-700' },
    { label: 'Analytics', icon: 'ri-line-chart-line', path: '/dashboard/formateur/analytics', tone: 'bg-rose-50 text-rose-700' },
  ];

  const activeSubscription = finance?.subscriptions.find((entry) => entry.status === 'active') ?? null;
  const activeFinanceEscrows = finance?.escrowCases.filter((entry) => ['assigned', 'in_progress', 'delivery_review'].includes(entry.status)) ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-600">Espace formateur</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Bonjour, {user?.firstName || 'Formateur'} <span className="align-middle">👋</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
              Suivez la publication de vos cours, la charge pédagogique et les apprenants qui demandent une relance.
            </p>
          </div>
        </section>

        <SubscriptionRequiredBanner gate={subscriptionGate} />

        {loading ? (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SkeletonCard count={4} />
          </div>
        ) : (
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="mt-2 text-sm text-gray-500">{stat.detail}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.surface}`}>
                    <i className={`${stat.icon} text-xl`}></i>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && (
          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-sm text-gray-500">Abonnement formateur</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{activeSubscription?.plan_name || 'Aucun plan actif'}</p>
              <p className="mt-2 text-sm text-gray-500">
                {activeSubscription ? `Commission ${activeSubscription.commission_rate}% · renouvellement ${new Date(activeSubscription.renews_at).toLocaleDateString('fr-FR')}` : 'Activez un plan pour publier et monétiser dans de bonnes conditions.'}
              </p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-sm text-gray-500">Wallet disponible</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(Number(finance?.wallet?.available_balance ?? finance?.wallet?.balance ?? 0))}</p>
              <p className="mt-2 text-sm text-gray-500">Retraits en attente {formatCurrency(Number(finance?.wallet?.pending_payout_amount ?? 0))}</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-sm text-gray-500">Flux à superviser</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{activeFinanceEscrows.length}</p>
              <p className="mt-2 text-sm text-gray-500">Net à libérer {formatCurrency(activeFinanceEscrows.reduce((sum, entry) => sum + Number(entry.provider_amount || 0), 0))}</p>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
            <Link to="/dashboard/formateur/profil-public" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              Voir le profil public
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {quickLinks.map((item) => (
              <Link
                key={`${item.label}-${item.path}`}
                to={item.path}
                className={`rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-gray-200 hover:bg-white ${item.tone}`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <i className={`${item.icon} text-lg`}></i>
                </div>
                <p className="text-sm font-medium">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6 lg:gap-8 mb-8">
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pipeline de publication</h2>
                <p className="text-sm text-gray-500">Les cours les plus proches d&apos;une action concrète.</p>
              </div>
              <Link to="/dashboard/formateur/mes-cours" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Gérer mes formations
              </Link>
            </div>

            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <div className="space-y-4">
                {pipelineCourses.map((course) => (
                  <div key={course.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{course.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${courseStatusClasses[course.status]}`}>
                            {courseStatusLabels[course.status]}
                          </span>
                          {course.status === 'draft' && course.readinessIssues.length === 0 && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Prête à soumettre
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{course.category || 'Général'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/dashboard/formateur/mes-cours/${course.id}/programme`}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Voir programme
                        </Link>
                        <Link
                          to="/dashboard/formateur/mes-cours"
                          className="px-3 py-2 border border-teal-200 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
                        >
                          {course.workflowActionLabel || 'Ouvrir'}
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Sections</p>
                        <p className="text-sm font-semibold text-gray-900">{course.modules || 0}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Leçons</p>
                        <p className="text-sm font-semibold text-gray-900">{course.lessons_count || 0}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Contenus</p>
                        <p className="text-sm font-semibold text-gray-900">{course.assets_count || 0}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Traction</p>
                        <p className="text-sm font-semibold text-gray-900">{course.students_count} apprenants</p>
                      </div>
                    </div>

                    {course.readinessIssues.length > 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-medium text-amber-800 mb-1">À compléter avant soumission</p>
                        <p className="text-sm text-amber-900">{course.readinessIssues.join(', ')}.</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs font-medium text-emerald-800 mb-1">Readiness</p>
                        <p className="text-sm text-emerald-900">
                          Le cours est structuré et peut passer à l&apos;étape suivante.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-3">
                      <span>{course.completion_rate}% de progression moyenne</span>
                      <span>{formatCurrency(course.revenue || 0)}</span>
                      <span>Mis à jour le {formatDate(course.updated_at)}</span>
                    </div>
                  </div>
                ))}

                {pipelineCourses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    Aucune formation disponible pour le moment.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Apprenants à relancer</h2>
                <p className="text-sm text-gray-500">Visibilité directe sur les signaux d’attention.</p>
              </div>
              <Link to="/dashboard/formateur/apprenants" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Voir les apprenants
              </Link>
            </div>

            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <div className="space-y-4">
                {(atRiskEnrollments.length > 0 ? atRiskEnrollments : watchEnrollments).slice(0, 5).map((student) => (
                  <div key={student.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{student.student_name}</p>
                        <p className="text-sm text-gray-600">{student.course_name || 'Formation'}</p>
                      </div>
                      {getAttentionBadge(student.attention_level)}
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className={`${student.progress >= 70 ? 'bg-green-500' : student.progress >= 30 ? 'bg-amber-500' : 'bg-red-500'} h-2 rounded-full transition-all`}
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                      <span>{student.progress}% complété</span>
                      <span>{formatRelativeActivity(student.last_active)}</span>
                      {student.pending_grading_count ? <span>{student.pending_grading_count} correction(s) à rendre</span> : null}
                      {student.certificate_status === 'issued' ? <span>Certifié</span> : null}
                    </div>

                    <Link
                      to={`/dashboard/messages?student=${encodeURIComponent(student.student_id)}&name=${encodeURIComponent(student.student_name)}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                      Envoyer un message
                      <i className="ri-arrow-right-line"></i>
                    </Link>
                  </div>
                ))}

                {students.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    Aucun apprenant rattaché à vos cours pour le moment.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8 mb-8">
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Quiz & évaluations</h2>
                <p className="text-sm text-gray-500">Configuration des quiz et charge de correction.</p>
              </div>
              <Link to="/dashboard/formateur/evaluations" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Voir toutes les évaluations
              </Link>
            </div>

            {!loading && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Quiz configurés</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {quizExams.filter((exam) => (exam.questions_count || 0) > 0).length}/{quizExams.length}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Corrections en attente</p>
                  <p className="text-sm font-semibold text-gray-900">{pendingCorrectionsCount}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Examens actifs</p>
                  <p className="text-sm font-semibold text-gray-900">{exams.filter((exam) => exam.status === 'ongoing').length}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Auto-corrigeables</p>
                  <p className="text-sm font-semibold text-gray-900">{quizExams.filter((exam) => exam.auto_gradable).length}</p>
                </div>
              </div>
            )}

            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <div className="space-y-4">
                {examsWithInsights.slice(0, 5).map((exam) => (
                  <div key={exam.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">{exam.title}</p>
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {getExamTypeLabel(exam.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{exam.course_name || 'Formation'}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{exam.submitted || 0} soumission(s)</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Questions</p>
                        <p className="font-semibold text-gray-900">{exam.questions_count || 0}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Ouvertes</p>
                        <p className="font-semibold text-gray-900">{exam.open_questions_count || 0}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">En attente</p>
                        <p className="font-semibold text-gray-900">{exam.pendingCorrections}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Note moyenne</p>
                        <p className="font-semibold text-gray-900">{exam.avg_grade ?? '-'}</p>
                      </div>
                    </div>

                    {(exam.type === 'quiz' && (exam.questions_count || 0) === 0) ? (
                      <p className="text-sm text-amber-700 mt-3">Quiz non configuré: ajoutez les questions avant de le diffuser.</p>
                    ) : null}
                  </div>
                ))}

                {examsWithInsights.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    Aucune évaluation créée pour le moment.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Programme & contenus</h2>
                <p className="text-sm text-gray-500">Les améliorations pédagogiques visibles directement depuis l’accueil.</p>
              </div>
            </div>

            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Sections créées</p>
                    <p className="text-2xl font-bold text-gray-900">{totalSections}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Leçons créées</p>
                    <p className="text-2xl font-bold text-gray-900">{totalLessons}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Contenus attachés</p>
                    <p className="text-2xl font-bold text-gray-900">{totalAssets}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Leçons preview</p>
                    <p className="text-2xl font-bold text-gray-900">{totalPreviewLessons}</p>
                  </div>
                </div>

                {latestUpdatedCourse ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Cours repris récemment</p>
                        <p className="font-semibold text-gray-900">{latestUpdatedCourse.title}</p>
                        <p className="text-sm text-gray-600">{latestUpdatedCourse.category || 'Général'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${courseStatusClasses[latestUpdatedCourse.status]}`}>
                        {courseStatusLabels[latestUpdatedCourse.status]}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Sections</p>
                        <p className="font-semibold text-gray-900">{latestUpdatedCourse.modules || 0}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Leçons</p>
                        <p className="font-semibold text-gray-900">{latestUpdatedCourse.lessons_count || 0}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Contenus</p>
                        <p className="font-semibold text-gray-900">{latestUpdatedCourse.assets_count || 0}</p>
                      </div>
                    </div>

                    {latestUpdatedCourse.readinessIssues.length > 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
                        <p className="text-xs font-medium text-amber-800 mb-1">Encore à finaliser</p>
                        <p className="text-sm text-amber-900">{latestUpdatedCourse.readinessIssues.join(', ')}.</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-3">
                        <p className="text-xs font-medium text-emerald-800 mb-1">Programme exploitable</p>
                        <p className="text-sm text-emerald-900">Le cours est structuré et prêt à être poussé dans le workflow prévu.</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                      <span>{latestUpdatedCourse.published_lessons_count || 0} leçon(s) publiées</span>
                      <span>{latestUpdatedCourse.preview_lessons_count || 0} preview</span>
                      <span>Mis à jour le {formatDate(latestUpdatedCourse.updated_at)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/dashboard/formateur/mes-cours/${latestUpdatedCourse.id}/programme`}
                        className="px-3 py-2 border border-teal-200 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
                      >
                        Continuer le programme
                      </Link>
                      <Link
                        to="/dashboard/formateur/evaluations"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Voir les évaluations
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    Aucune formation à reprendre pour le moment.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Cours avec contenu incomplet</p>
                    <p className="text-2xl font-bold text-gray-900">{coursesMissingContentCount}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Cours à reprise après rejet / archivage</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {courseInsights.filter((course) => course.status === 'rejected' || course.status === 'archived').length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-gray-900">Compléments</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Link to="/dashboard/formateur/mes-cours" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-book-open-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Mes formations</p>
            </Link>
            <Link
              to={latestUpdatedCourse ? `/dashboard/formateur/mes-cours/${latestUpdatedCourse.id}/programme` : '/dashboard/formateur/mes-cours'}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center"
            >
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-node-tree text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Programme</p>
            </Link>
            <Link to="/dashboard/formateur/classes-virtuelles" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-video-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Classes virtuelles</p>
            </Link>
            <Link to="/dashboard/formateur/apprenants" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-group-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Mes apprenants</p>
            </Link>
            <Link to="/dashboard/formateur/evaluations" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-file-list-3-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Évaluations</p>
            </Link>
            <Link to="/dashboard/formateur/certificats" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-award-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Certificats</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
