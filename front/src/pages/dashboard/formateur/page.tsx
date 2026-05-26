import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { fetchFormateurDashboardSnapshot } from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  getCourseReadinessIssues,
  getInstructorWorkflowAction,
  type CourseWorkflowStatus,
} from '@/lib/courseWorkflow';
import {
  ComplementLinksPanel,
  EvaluationsPanel,
  FormateurHero,
  FormateurStatsGrid,
  ProgramContentPanel,
  PublicationPipelinePanel,
  QuickLinksPanel,
  StudentFollowUpPanel,
} from './FormateurDashboardPanels';
import {
  getDaysSince,
  type Course,
  type CourseInsight,
  type Enrollment,
  type Exam,
  type Submission,
} from './formateurDashboardModel';

export default function FormateurDashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const subscriptionGate = gateFor('trainer_courses_manage');

  const {
    data: snapshot,
    isError,
    isLoading: loading,
  } = useQuery({
    queryKey: queryKeys.formateur.dashboard(user?.id),
    queryFn: () => fetchFormateurDashboardSnapshot({ id: user?.id ?? '', role: user?.role ?? 'formateur' }),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger les données du tableau de bord formateur.');
    }
  }, [error, isError]);

  const courses = useMemo(() => (snapshot?.courses ?? []) as Course[], [snapshot?.courses]);
  const students = useMemo(() => (snapshot?.students ?? []) as Enrollment[], [snapshot?.students]);
  const exams = useMemo(() => (snapshot?.exams ?? []) as Exam[], [snapshot?.exams]);
  const submissions = useMemo(() => (snapshot?.submissions ?? []) as Submission[], [snapshot?.submissions]);

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

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur' }]} />

        <FormateurHero firstName={user?.firstName} />

        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <FormateurStatsGrid loading={loading} stats={stats} />
        <QuickLinksPanel quickLinks={quickLinks} />

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6 lg:gap-8 mb-8">
          <PublicationPipelinePanel loading={loading} courses={pipelineCourses} />
          <StudentFollowUpPanel
            loading={loading}
            atRiskEnrollments={atRiskEnrollments}
            watchEnrollments={watchEnrollments}
            students={students}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8 mb-8">
          <EvaluationsPanel
            loading={loading}
            examsWithInsights={examsWithInsights}
            quizExams={quizExams}
            pendingCorrectionsCount={pendingCorrectionsCount}
          />
          <ProgramContentPanel
            loading={loading}
            totalSections={totalSections}
            totalLessons={totalLessons}
            totalAssets={totalAssets}
            totalPreviewLessons={totalPreviewLessons}
            latestUpdatedCourse={latestUpdatedCourse}
            coursesMissingContentCount={coursesMissingContentCount}
            inactiveCourseCount={courseInsights.filter((course) => course.status === 'rejected' || course.status === 'archived').length}
          />
        </div>

        <ComplementLinksPanel latestUpdatedCourse={latestUpdatedCourse} />
      </div>
    </DashboardLayout>
  );
}
