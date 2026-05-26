import { courseStatusClasses, courseStatusLabels } from '@/lib/courseWorkflow';
import { type CourseInsight } from './formateurDashboardModel';

export function MetricTile({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function LargeMetricTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export function CourseStatusBadge({ course }: { course: CourseInsight }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${courseStatusClasses[course.status]}`}>
      {courseStatusLabels[course.status]}
    </span>
  );
}

export function CourseReadinessBox({ course, className = '' }: { course: CourseInsight; className?: string }) {
  if (course.readinessIssues.length > 0) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-3 ${className}`}>
        <p className="text-xs font-medium text-amber-800 mb-1">À compléter avant soumission</p>
        <p className="text-sm text-amber-900">{course.readinessIssues.join(', ')}.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-emerald-200 bg-emerald-50 p-3 ${className}`}>
      <p className="text-xs font-medium text-emerald-800 mb-1">Readiness</p>
      <p className="text-sm text-emerald-900">
        Le cours est structuré et peut passer à l&apos;étape suivante.
      </p>
    </div>
  );
}

export function AttentionBadge({ level }: { level: string | undefined }) {
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
