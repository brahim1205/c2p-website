import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { fetchApprenantProgressionSnapshot } from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildFocusAreas,
  buildLearningCourses,
  buildProgressionPriorities,
  buildProgressionSummary,
  buildWeeklyActivity,
  type CourseRelation,
  type FocusArea,
  type ProgressionSnapshot,
} from './progressionModel';
import {
  FocusAreasPanel,
  FocusDetailModal,
  PrioritiesPanel,
  ProgressionLoadingState,
  ProgressionStatsGrid,
  ProgressionSummaryPanel,
  WeeklyActivityPanel,
} from './ProgressionPanels';

type EnrollmentWithCourse = ProgressionSnapshot['enrollments'][number] & { courses?: CourseRelation | null };

export default function ApprenantProgressionPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);

  const {
    data: snapshot,
    isError,
    isLoading: loading,
  } = useQuery<ProgressionSnapshot>({
    queryKey: queryKeys.apprenant.progression(user?.id),
    queryFn: () => fetchApprenantProgressionSnapshot(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger votre progression.');
    }
  }, [error, isError]);

  const enrollments = useMemo(
    () => (snapshot?.enrollments ?? []) as EnrollmentWithCourse[],
    [snapshot?.enrollments],
  );
  const certificates = useMemo(() => snapshot?.certificates ?? [], [snapshot?.certificates]);
  const submissions = useMemo(() => snapshot?.submissions ?? [], [snapshot?.submissions]);

  const courses = useMemo(() => buildLearningCourses(enrollments), [enrollments]);

  const weeklyActivity = useMemo(
    () => buildWeeklyActivity(enrollments, submissions, certificates),
    [certificates, enrollments, submissions],
  );

  const focusAreas = useMemo(() => buildFocusAreas(courses), [courses]);
  const priorities = useMemo(() => buildProgressionPriorities(courses), [courses]);
  const {
    completedCourses,
    inProgressCourses,
    totalCompletedLessons,
    effectiveLearningTimeSeconds,
    averageProgress,
    pendingGradingCount,
  } = useMemo(() => buildProgressionSummary(courses), [courses]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Ma progression' }]} />

        <div className="mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Ma progression</h1>
            <p className="text-gray-600 text-sm md:text-base">
              Vue consolidée de vos cours, de votre cadence d&apos;apprentissage et de vos prochaines priorités.
            </p>
          </div>
        </div>

        {loading ? (
          <ProgressionLoadingState />
        ) : (
          <>
            <ProgressionStatsGrid
              certificatesIssued={certificates.filter((certificate) => certificate.status === 'issued').length}
              summary={{
                completedCourses,
                inProgressCourses,
                totalCompletedLessons,
                effectiveLearningTimeSeconds,
                averageProgress,
                pendingGradingCount,
              }}
            />

            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 mb-8">
              <WeeklyActivityPanel points={weeklyActivity.points} total={weeklyActivity.total} unitLabel={weeklyActivity.unitLabel} />
              <ProgressionSummaryPanel
                summary={{
                  completedCourses,
                  inProgressCourses,
                  totalCompletedLessons,
                  effectiveLearningTimeSeconds,
                  averageProgress,
                  pendingGradingCount,
                }}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
              <FocusAreasPanel focusAreas={focusAreas} onSelect={setSelectedFocus} />
              <PrioritiesPanel priorities={priorities} />
            </div>
          </>
        )}

        {selectedFocus ? <FocusDetailModal focus={selectedFocus} onClose={() => setSelectedFocus(null)} /> : null}

      </div>
    </DashboardLayout>
  );
}
