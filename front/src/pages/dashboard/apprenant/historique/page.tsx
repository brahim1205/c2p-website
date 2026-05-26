import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { fetchApprenantEnrollments } from '@/lib/apprenantDashboardApi';
import { deriveLearningStreak, deriveUnlockedLearningBadges, LEARNING_BADGES } from '@/lib/learningAchievements';
import { queryKeys } from '@/lib/queryKeys';
import { BadgesPanel, CourseHistoryPanel, HistoryOverview, HistoryProgressSummary } from './HistoriquePanels';
import { getLearningHistoryStats, mergeHistoryWithEnrollments } from './historiqueModel';

export default function ApprenantHistoriquePage() {
  const { user } = useAuth();
  const { data: enrollments = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.apprenant.enrollments(user?.id),
    queryFn: () => fetchApprenantEnrollments(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });

  const history = useMemo(() => mergeHistoryWithEnrollments(enrollments), [enrollments]);
  const unlockedBadgeIds = useMemo(() => deriveUnlockedLearningBadges({ enrollments }), [enrollments]);
  const unlockedBadges = LEARNING_BADGES.filter((badge) => unlockedBadgeIds.includes(badge.id));
  const streak = useMemo(() => deriveLearningStreak(enrollments), [enrollments]);
  const stats = useMemo(() => getLearningHistoryStats(history), [history]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Apprenant', path: '/dashboard/apprenant' },
            { label: 'Mon historique' },
          ]}
        />

        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Mon historique</h1>
          <p className="text-sm text-gray-500">Suivi de toutes vos formations et de votre progression globale.</p>
        </div>

        <HistoryOverview
          enrollments={enrollments}
          historyCount={history.length}
          completedCourses={stats.completedCourses}
          unlockedBadgesCount={unlockedBadges.length}
          streak={streak}
        />
        <HistoryProgressSummary stats={stats} />
        <BadgesPanel unlockedBadges={unlockedBadges} />
        <CourseHistoryPanel loading={loading} history={history} />
      </div>
    </DashboardLayout>
  );
}
