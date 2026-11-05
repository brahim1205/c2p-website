import { Link } from 'react-router-dom';
import { SkeletonCard } from '@/components/base/Skeleton';
import { getInstructorWorkflowAction } from '@/lib/courseWorkflow';
import {
  COURSE_LEVEL_LABELS,
  getCourseStatusBadge,
  getDeliveryLabel,
  type Course,
} from './courseManagementModel';

import { formatCount, plural } from '@/lib/formatters';
import { SearchInput } from '@/components/ui';
import { studioPath } from '../course-studio/studioModel';
import { getCategoryLabel } from '@/pages/espace-numerique/espaceNumeriquePageModel';
const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'published', label: 'Publiés' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'review', label: 'Révision' },
  { value: 'rejected', label: 'Rejetés' },
  { value: 'archived', label: 'Archivés' },
] as const;

interface CourseFiltersProps {
  searchQuery: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

interface CoursesGridProps {
  courses: Course[];
  loading: boolean;
  subscriptionAllowed: boolean;
  onWorkflowAction: (course: Course) => void;
  onDelete: (course: Course) => void;
}

interface WorkflowModalProps {
  course: Course;
  onCancel: () => void;
  onConfirm: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const badge = getCourseStatusBadge(status);
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

export function CourseFilters({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: CourseFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          containerClassName="flex-1"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher une formation…"
        />
        <div className="flex gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === status.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CoursesGrid({
  courses,
  loading,
  subscriptionAllowed,
  onWorkflowAction,
  onDelete,
}: CoursesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonCard count={6} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course, index) => {
        const workflowAction = getInstructorWorkflowAction(course.status);
        return (
          <div
            key={`${String(course.id)}-${index}`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link to={studioPath(course.id)} className="relative block h-40 overflow-hidden" aria-label={`Gérer « ${course.title} »`}>
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-teal-50 flex items-center justify-center">
                  <div className="w-14 h-14 flex items-center justify-center">
                    <i className="ri-book-open-line text-3xl text-teal-300"></i>
                  </div>
                </div>
              )}
              <div className="absolute top-3 right-3">
                <StatusBadge status={course.status} />
              </div>
              <div className="absolute bottom-3 left-3 flex gap-2">
                <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md flex items-center gap-1">
                  <i className="ri-time-line"></i>
                  {course.duration || 'Durée à définir'}
                </span>
                <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md flex items-center gap-1">
                  <i className="ri-book-line"></i>
                  {plural(course.modules, 'module(s)')}
                </span>
                <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                  {COURSE_LEVEL_LABELS[course.level] || 'Intermédiaire'}
                </span>
                <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                  {getDeliveryLabel(course.delivery_mode)}
                </span>
              </div>
            </Link>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-md">
                  {getCategoryLabel(course.category || 'Sans catégorie')}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(course.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-base">{course.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span>
                  <i className="ri-group-line mr-1"></i>
                  {course.students_count} apprenants
                </span>
                <span>
                  <i className="ri-bar-chart-line mr-1"></i>
                  {course.completion_rate}% complété
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                <div
                  className="bg-teal-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${course.completion_rate}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {course.is_free ? 'Gratuit' : Number(course.current_price ?? course.price ?? 0) > 0 ? `${formatCount(Number(course.current_price ?? course.price))} FCFA` : 'Tarif à définir'}
                </span>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Link
                    to={studioPath(course.id)}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
                  >
                    Gérer le cours
                  </Link>
                  {workflowAction && (
                    <button
                      onClick={() => onWorkflowAction(course)}
                      disabled={!subscriptionAllowed}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        !subscriptionAllowed
                          ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                          : course.status === 'published'
                            ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                            : course.status === 'review'
                              ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                              : 'border border-teal-200 text-teal-700 hover:bg-teal-50'
                      }`}
                    >
                      {workflowAction.description}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(course)}
                    aria-label={`Supprimer « ${course.title} »`}
                    className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <i className="ri-delete-bin-line text-red-500"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyCoursesState({ hasCourses, onCreate }: { hasCourses: boolean; onCreate: () => void }) {
  if (hasCourses) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="ri-search-line text-2xl text-gray-400"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune formation trouvée</h3>
        <p className="text-gray-600">Ajustez votre recherche ou le filtre de statut.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i className="ri-video-add-line text-3xl text-teal-600"></i>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Créez votre première formation</h3>
      <p className="text-gray-600 mb-6">
        Trois questions pour démarrer, puis construisez votre programme à votre rythme : tout est enregistré automatiquement.
      </p>
      <button onClick={onCreate} className="px-5 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
        Créer une formation
      </button>
    </div>
  );
}

export function WorkflowModal({ course, onCancel, onConfirm }: WorkflowModalProps) {
  const action = getInstructorWorkflowAction(course.status);
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
            <i className="ri-git-branch-line text-teal-600 text-xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{action.description}</h3>
        </div>
        <p className="text-gray-600 mb-6">
          {course.status === 'draft' && (
            <>
              Soumettre <strong>"{course.title}"</strong> à l équipe admin pour validation.
            </>
          )}
          {course.status === 'review' && (
            <>
              Retirer <strong>"{course.title}"</strong> de la file de révision et revenir en brouillon.
            </>
          )}
          {course.status === 'published' && (
            <>
              Archiver <strong>"{course.title}"</strong> pour la retirer du catalogue sans la supprimer.
            </>
          )}
          {(course.status === 'rejected' || course.status === 'archived') && (
            <>
              Repasser <strong>"{course.title}"</strong> en brouillon pour la retravailler avant une nouvelle soumission.
            </>
          )}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              course.status === 'published'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : course.status === 'review'
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
