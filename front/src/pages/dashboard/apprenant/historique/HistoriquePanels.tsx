import { Link } from 'react-router-dom';
import type { ApprenantEnrollment } from '@/lib/apprenantDashboardApi';
import { LEARNING_BADGES, type LearningBadge } from '@/lib/learningAchievements';
import { SkeletonList } from '@/components/base/Skeleton';
import XPBar from './components/XPBar';
import LearningHeatmap from './components/LearningHeatmap';
import { formatLastAccessed, type LearningHistoryEntry, type LearningHistoryStats } from './historiqueModel';

const badgeToneClassNames: Record<string, { container: string; iconBox: string; icon: string }> = {
  teal: {
    container: 'bg-teal-50 border-teal-200',
    iconBox: 'bg-teal-100',
    icon: 'text-teal-600',
  },
  emerald: {
    container: 'bg-emerald-50 border-emerald-200',
    iconBox: 'bg-emerald-100',
    icon: 'text-emerald-600',
  },
  amber: {
    container: 'bg-amber-50 border-amber-200',
    iconBox: 'bg-amber-100',
    icon: 'text-amber-600',
  },
  orange: {
    container: 'bg-orange-50 border-orange-200',
    iconBox: 'bg-orange-100',
    icon: 'text-orange-600',
  },
  blue: {
    container: 'bg-blue-50 border-blue-200',
    iconBox: 'bg-blue-100',
    icon: 'text-blue-600',
  },
  purple: {
    container: 'bg-purple-50 border-purple-200',
    iconBox: 'bg-purple-100',
    icon: 'text-purple-600',
  },
};

const historyStatToneClassNames: Record<string, { box: string; icon: string }> = {
  teal: { box: 'bg-teal-100', icon: 'text-teal-600' },
  emerald: { box: 'bg-emerald-100', icon: 'text-emerald-600' },
  amber: { box: 'bg-amber-100', icon: 'text-amber-600' },
  orange: { box: 'bg-orange-100', icon: 'text-orange-600' },
};

function getBadgeToneClassNames(color: string) {
  return badgeToneClassNames[color] ?? badgeToneClassNames.teal;
}

type HistoryOverviewProps = {
  enrollments: ApprenantEnrollment[];
  historyCount: number;
  completedCourses: number;
  unlockedBadgesCount: number;
  streak: number;
};

type BadgesPanelProps = {
  unlockedBadges: LearningBadge[];
};

type CourseHistoryPanelProps = {
  loading: boolean;
  history: LearningHistoryEntry[];
};

export function HistoryOverview({
  enrollments,
  historyCount,
  completedCourses,
  unlockedBadgesCount,
  streak,
}: HistoryOverviewProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <XPBar />
        <div className="grid grid-cols-2 gap-3">
          <HistoryStatCard icon="ri-book-open-line" tone="teal" value={historyCount} label="Formations suivies" />
          <HistoryStatCard icon="ri-award-line" tone="emerald" value={completedCourses} label="Cours terminés" />
          <HistoryStatCard icon="ri-trophy-line" tone="amber" value={unlockedBadgesCount} label="Badges débloqués" />
          <HistoryStatCard icon="ri-fire-line" tone="orange" value={streak} label="Jours de suite" />
        </div>
      </div>
      <div className="lg:col-span-1">
        <LearningHeatmap enrollments={enrollments} />
      </div>
    </div>
  );
}

export function BadgesPanel({ unlockedBadges }: BadgesPanelProps) {
  if (unlockedBadges.length === 0) return null;

  const remainingBadges = LEARNING_BADGES.length - unlockedBadges.length;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <i className="ri-medal-line text-amber-500" />
        Mes badges ({unlockedBadges.length}/{LEARNING_BADGES.length})
      </h2>
      <div className="flex flex-wrap gap-2">
        {unlockedBadges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
      </div>
      {remainingBadges > 0 ? (
        <p className="mt-3 text-[11px] text-gray-400">
          Encore {remainingBadges} badge{remainingBadges > 1 ? 's' : ''} à débloquer. Continuez à apprendre !
        </p>
      ) : null}
    </div>
  );
}

export function CourseHistoryPanel({ loading, history }: CourseHistoryPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900">Formations en cours</h2>
        <Link to="/dashboard/apprenant/mes-cours" className="text-xs font-medium text-teal-600 hover:text-teal-700">
          Voir le catalogue →
        </Link>
      </div>

      {loading ? (
        <div className="p-5">
          <SkeletonList count={4} />
        </div>
      ) : null}
      {!loading && history.length === 0 ? <EmptyHistoryState /> : null}
      {!loading && history.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {history.map((entry) => (
            <CourseHistoryRow key={entry.courseId} entry={entry} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HistoryProgressSummary({ stats }: { stats: LearningHistoryStats }) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
      Progression globale : <span className="font-semibold text-gray-900">{stats.globalProgress}%</span> ·{' '}
      {stats.totalCompleted}/{stats.totalLessons} leçons estimées terminées
    </div>
  );
}

function HistoryStatCard({ icon, tone, value, label }: { icon: string; tone: string; value: number; label: string }) {
  const toneClassNames = historyStatToneClassNames[tone] ?? historyStatToneClassNames.teal;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${toneClassNames.box}`}>
        <i className={`${icon} text-base ${toneClassNames.icon}`} />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function BadgeItem({ badge }: { badge: LearningBadge }) {
  const tone = getBadgeToneClassNames(badge.color);

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${tone.container}`}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${tone.iconBox}`}>
        <i className={`${badge.icon} ${tone.icon} text-xs`} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-900">{badge.name}</p>
        <p className="text-[10px] text-gray-500">{badge.description}</p>
      </div>
    </div>
  );
}

function EmptyHistoryState() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <i className="ri-book-open-line text-2xl text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucun historique</h3>
      <p className="mb-4 text-sm text-gray-500">
        Vous n&apos;avez pas encore consulté de formation. Commencez votre parcours d&apos;apprentissage dès maintenant.
      </p>
      <Link
        to="/dashboard/apprenant/mes-cours"
        className="inline-block cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
      >
        Explorer les formations
      </Link>
    </div>
  );
}

function CourseHistoryRow({ entry }: { entry: LearningHistoryEntry }) {
  const completed = entry.progress === 100;

  return (
    <div className="p-5 transition-colors hover:bg-gray-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img src={entry.thumbnail} alt={entry.title} className="h-20 w-full flex-shrink-0 rounded-lg object-cover sm:w-32" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{entry.category}</span>
            {completed ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <i className="ri-check-double-line" />
                Terminé
              </span>
            ) : null}
          </div>
          <h3 className="mb-1 text-sm font-semibold text-gray-900">{entry.title}</h3>
          <p className="mb-2 text-xs text-gray-500">
            Par {entry.instructor} · {formatLastAccessed(entry.lastAccessed)}
          </p>
          <div className="flex items-center gap-3">
            <div className="max-w-[200px] flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">{entry.progress}%</span>
                <span className="text-xs text-gray-400">
                  {entry.completedLessons}/{entry.totalLessons}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${completed ? 'bg-emerald-500' : 'bg-teal-500'}`}
                  style={{ width: `${entry.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <Link
          to={`/dashboard/apprenant/cours/${entry.courseId}`}
          className={`flex-shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            completed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
        >
          {completed ? 'Revoir' : 'Continuer'}
        </Link>
      </div>
    </div>
  );
}
