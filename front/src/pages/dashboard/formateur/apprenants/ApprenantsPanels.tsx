import { SkeletonList } from '@/components/base/Skeleton';
import LearnerIdentity from './LearnerIdentity';
import {
  formatDate,
  formatRelativeActivity,
  getAttentionBadge,
  getCertificateBadge,
  getProgressColor,
  type CourseOption,
  type Enrollment,
  type LearnerStats,
} from './apprenantsModel';

interface LearnerStatsGridProps {
  stats: LearnerStats;
}

export function LearnerStatsGrid({ stats }: LearnerStatsGridProps) {
  const cards = [
    { label: 'Apprenants uniques', value: String(stats.uniqueStudentsCount), icon: 'ri-group-line', color: 'bg-teal-500' },
    { label: 'Actifs cette semaine', value: String(stats.activeThisWeekCount), icon: 'ri-user-follow-line', color: 'bg-green-500' },
    { label: 'Progression moyenne', value: `${stats.avgCompletion}%`, icon: 'ri-bar-chart-line', color: 'bg-blue-500' },
    { label: 'À relancer', value: String(stats.attentionCount), icon: 'ri-alarm-warning-line', color: 'bg-red-500' },
    { label: 'Certifiés', value: String(stats.certifiedCount), icon: 'ri-award-line', color: 'bg-violet-500' },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
              <div className="flex h-5 w-5 items-center justify-center">
                <i className={`${stat.icon} text-sm text-white`} />
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
  );
}

interface LearnerFiltersPanelProps {
  attentionFilter: string;
  courseFilter: string;
  courses: CourseOption[];
  searchQuery: string;
  statusFilter: string;
  onAttentionChange: (value: string) => void;
  onCourseChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function LearnerFiltersPanel({
  attentionFilter,
  courseFilter,
  courses,
  searchQuery,
  statusFilter,
  onAttentionChange,
  onCourseChange,
  onSearchChange,
  onStatusChange,
}: LearnerFiltersPanelProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px_220px]">
        <div className="relative">
          <div className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
            <i className="ri-search-line text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un apprenant ou une formation..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(event) => onCourseChange(event.target.value)}
          aria-label="Filtrer par formation"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="all">Toutes les formations</option>
          {courses.map((course, index) => (
            <option key={`${String(course.id)}-${index}`} value={String(course.id)}>
              {course.title}
            </option>
          ))}
        </select>

        <select
          value={attentionFilter}
          onChange={(event) => onAttentionChange(event.target.value)}
          aria-label="Filtrer par attention"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="all">Tous les signaux</option>
          <option value="on_track">Sur la bonne voie</option>
          <option value="watch">À surveiller</option>
          <option value="at_risk">À relancer</option>
          <option value="completed">Terminés</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['all', 'active', 'inactive', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === status ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Tous' : status === 'active' ? 'Actifs' : status === 'inactive' ? 'Inactifs' : 'Terminés'}
          </button>
        ))}
      </div>
    </div>
  );
}

interface LearnersTableProps {
  loading: boolean;
  students: Enrollment[];
  onMessage: (student: Enrollment) => void;
  onOpenDetail: (student: Enrollment) => void;
}

export function LearnersTable({ loading, students, onMessage, onOpenDetail }: LearnersTableProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonList count={6} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['Apprenant', 'Formation', 'Progression', 'Évaluations', 'Attention', 'Certificat', 'Activité', 'Actions'].map((header) => (
                <th key={header} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${header === 'Actions' ? 'text-right' : 'text-left'}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <LearnerRow key={student.id} student={student} onMessage={onMessage} onOpenDetail={onOpenDetail} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LearnerRow({ student, onMessage, onOpenDetail }: { student: Enrollment; onMessage: (student: Enrollment) => void; onOpenDetail: (student: Enrollment) => void }) {
  return (
    <tr className="transition-colors hover:bg-gray-50">
      <td className="px-4 py-3">
        <LearnerIdentity student={student} size="sm" />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{student.course_name || '-'}</p>
        <p className="text-xs text-gray-500">{student.course_category || student.courses?.category || 'Formation'}</p>
      </td>
      <td className="min-w-52 px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-gray-200">
            <div className={`${getProgressColor(student.progress)} h-1.5 rounded-full`} style={{ width: `${student.progress}%` }} />
          </div>
          <span className="text-xs font-medium text-gray-700">{student.progress}%</span>
        </div>
        <p className="text-xs text-gray-500">{student.completed_lessons_estimate || 0}/{student.course_lessons_count || 0} leçons estimées</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{student.graded_submissions_count || 0}/{student.submissions_count || 0}</p>
        <p className="text-xs text-gray-500">
          {student.avg_submission_grade !== null && student.avg_submission_grade !== undefined
            ? `Moy. ${student.avg_submission_grade}`
            : `${student.pending_grading_count || 0} en attente`}
        </p>
      </td>
      <td className="px-4 py-3">{getAttentionBadge(student.attention_level)}</td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          {getCertificateBadge(student.certificate_status)}
          {student.certificate_number && <p className="text-xs text-gray-500">{student.certificate_number}</p>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <p>{formatRelativeActivity(student.days_since_active)}</p>
        <p className="text-xs text-gray-500">{formatDate(student.last_active)}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <TableActionButton icon="ri-message-3-line" label="Envoyer un message" tone="teal" onClick={() => onMessage(student)} />
          <TableActionButton icon="ri-eye-line" label="Voir le détail" onClick={() => onOpenDetail(student)} />
        </div>
      </td>
    </tr>
  );
}

function TableActionButton({ icon, label, onClick, tone = 'gray' }: { icon: string; label: string; onClick: () => void; tone?: 'gray' | 'teal' }) {
  const classes = tone === 'teal' ? 'hover:bg-teal-50 text-teal-600' : 'hover:bg-gray-100 text-gray-600';
  return (
    <button onClick={onClick} className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${classes}`} title={label}>
      <i className={`${icon} text-sm`} />
    </button>
  );
}

export function LearnersEmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <i className="ri-user-search-line text-2xl text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucun apprenant trouvé</h3>
      <p className="text-gray-600">Ajustez vos filtres pour élargir la liste.</p>
    </div>
  );
}
