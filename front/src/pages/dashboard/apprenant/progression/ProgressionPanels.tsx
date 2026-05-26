import { Link } from 'react-router-dom';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import {
  formatLearningTime,
  formatRelativeActivity,
  type FocusArea,
  type LearningCourse,
  type WeeklyActivityPoint,
} from './progressionModel';

export { FocusDetailModal } from './FocusDetailModal';

type ProgressionSummary = {
  completedCourses: number;
  inProgressCourses: number;
  totalCompletedLessons: number;
  effectiveLearningTimeSeconds: number;
  averageProgress: number;
  pendingGradingCount: number;
};

export function ProgressionLoadingState() {
  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SkeletonCard count={5} />
      </div>
      <SkeletonList count={6} />
    </>
  );
}

export function ProgressionStatsGrid({
  certificatesIssued,
  summary,
}: {
  certificatesIssued: number;
  summary: ProgressionSummary;
}) {
  const stats = [
    { label: 'Temps cumulé', value: formatLearningTime(summary.effectiveLearningTimeSeconds), icon: 'ri-time-line', color: 'bg-teal-500' },
    { label: 'Leçons complétées', value: String(summary.totalCompletedLessons), icon: 'ri-check-double-line', color: 'bg-green-500' },
    { label: 'Cours en cours', value: String(summary.inProgressCourses), icon: 'ri-book-open-line', color: 'bg-blue-500' },
    { label: 'Certificats', value: String(certificatesIssued), icon: 'ri-award-line', color: 'bg-violet-500' },
  ];

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
              <i className={`${stat.icon} text-sm text-white`}></i>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WeeklyActivityPanel({
  points,
  total,
  unitLabel,
}: {
  points: WeeklyActivityPoint[];
  total: number;
  unitLabel: string;
}) {
  const maxWeeklyValue = Math.max(1, ...points.map((point) => point.value));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Engagement hebdomadaire</h2>
          <p className="text-sm text-gray-500">
            {unitLabel}: {total}
          </p>
        </div>
      </div>

      <div className="flex h-52 items-end gap-3">
        {points.map((point) => (
          <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full overflow-hidden rounded-lg bg-gray-100" style={{ height: '150px' }}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded-lg bg-teal-500 transition-all duration-500"
                style={{ height: `${Math.max((point.value / maxWeeklyValue) * 100, point.value > 0 ? 8 : 0)}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium capitalize text-gray-600">{point.label.replace('.', '')}</span>
            <span className="text-[11px] text-gray-400">{point.caption}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProgressionSummaryPanel({ summary }: { summary: ProgressionSummary }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-bold text-gray-900">Résumé de progression</h2>

      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Progression moyenne</span>
            <span className="text-sm font-semibold text-gray-900">{summary.averageProgress}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div className="h-2.5 rounded-full bg-teal-500 transition-all" style={{ width: `${summary.averageProgress}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xl font-bold text-gray-900">{summary.completedCourses}</p>
            <p className="text-xs text-gray-500">Cours terminés</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xl font-bold text-gray-900">{summary.pendingGradingCount}</p>
            <p className="text-xs text-gray-500">Corrections en attente</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/dashboard/apprenant/mes-cours" className="rounded-lg border border-gray-200 px-3 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Reprendre mes cours
          </Link>
          <Link to="/dashboard/apprenant/certificats" className="rounded-lg border border-gray-200 px-3 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Voir mes certificats
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FocusAreasPanel({ focusAreas, onSelect }: { focusAreas: FocusArea[]; onSelect: (focus: FocusArea) => void }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mes compétences par domaine</h2>
          <p className="text-sm text-gray-500">Basé sur vos formations suivies et votre progression réelle.</p>
        </div>
        <span className="text-sm text-gray-500">{focusAreas.length} domaine(s)</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {focusAreas.map((focus) => (
          <FocusAreaCard key={focus.key} focus={focus} onSelect={onSelect} />
        ))}

        {focusAreas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 md:col-span-2">
            Aucune compétence consolidée pour le moment. Commencez par suivre un cours.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PrioritiesPanel({ priorities }: { priorities: LearningCourse[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Priorités du moment</h2>
          <p className="text-sm text-gray-500">Cours à reprendre ou à terminer.</p>
        </div>
      </div>

      <div className="space-y-4">
        {priorities.map((course) => (
          <div key={course.courseId} className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{course.title}</p>
                <p className="text-xs text-gray-500">{course.category}</p>
              </div>
              <span className="text-sm font-semibold text-teal-600">{course.progress}%</span>
            </div>
            <div className="mb-3 h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: `${course.progress}%` }}></div>
            </div>
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>{course.completedLessons}/{course.totalLessons} leçons</span>
              <span>{formatRelativeActivity(course.lastActive)}</span>
              {course.pendingGradingCount > 0 ? <span>{course.pendingGradingCount} correction(s) en attente</span> : null}
            </div>
            <Link to={`/dashboard/apprenant/cours/${course.courseId}`} className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700">
              Continuer
              <i className="ri-arrow-right-line"></i>
            </Link>
          </div>
        ))}

        {priorities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Aucun cours prioritaire pour le moment.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FocusAreaCard({ focus, onSelect }: { focus: FocusArea; onSelect: (focus: FocusArea) => void }) {
  return (
    <button
      type="button"
      aria-label={`Voir le détail de ${focus.label}`}
      onClick={() => onSelect(focus)}
      className="rounded-lg border border-gray-100 p-4 text-left transition-colors hover:border-teal-200 hover:shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${focus.iconBg}`}>
            <i className={`${focus.icon} ${focus.iconColor} text-lg`}></i>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{focus.label}</h3>
            <p className="text-xs text-gray-500">{focus.coursesCount} cours</p>
          </div>
        </div>
        <span className="text-sm font-bold text-teal-600">{focus.progress}%</span>
      </div>
      <div className="mb-2 h-2.5 w-full rounded-full bg-gray-100">
        <div className={`h-2.5 rounded-full transition-all ${getProgressTone(focus.progress)}`} style={{ width: `${focus.progress}%` }}></div>
      </div>
      <p className="text-xs text-gray-500">
        {focus.completedLessons}/{focus.totalLessons} leçons estimées • {focus.completedCourses} terminé(s)
      </p>
    </button>
  );
}

function getProgressTone(progress: number) {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-teal-500';
  return 'bg-amber-500';
}
