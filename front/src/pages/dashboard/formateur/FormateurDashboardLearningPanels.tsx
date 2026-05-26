import { Link } from 'react-router-dom';
import { SkeletonList } from '@/components/base/Skeleton';
import {
  formatCurrency,
  formatDate,
  formatRelativeActivity,
  type CourseInsight,
  type Enrollment,
} from './formateurDashboardModel';
import {
  AttentionBadge,
  CourseReadinessBox,
  CourseStatusBadge,
  LargeMetricTile,
  MetricTile,
} from './FormateurDashboardShared';

export function PublicationPipelinePanel({ loading, courses }: { loading: boolean; courses: CourseInsight[] }) {
  return (
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
          {courses.map((course, index) => (
            <CoursePipelineCard key={`${String(course.id)}-${index}`} course={course} />
          ))}

          {courses.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Aucune formation disponible pour le moment.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CoursePipelineCard({ course }: { course: CourseInsight }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{course.title}</h3>
            <CourseStatusBadge course={course} />
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
        <MetricTile label="Sections" value={course.modules || 0} />
        <MetricTile label="Leçons" value={course.lessons_count || 0} />
        <MetricTile label="Contenus" value={course.assets_count || 0} />
        <MetricTile label="Traction" value={`${course.students_count} apprenants`} />
      </div>

      <CourseReadinessBox course={course} />

      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-3">
        <span>{course.completion_rate}% de progression moyenne</span>
        <span>{formatCurrency(course.revenue || 0)}</span>
        <span>Mis à jour le {formatDate(course.updated_at)}</span>
      </div>
    </div>
  );
}

export function StudentFollowUpPanel({
  loading,
  atRiskEnrollments,
  watchEnrollments,
  students,
}: {
  loading: boolean;
  atRiskEnrollments: Enrollment[];
  watchEnrollments: Enrollment[];
  students: Enrollment[];
}) {
  const displayedStudents = (atRiskEnrollments.length > 0 ? atRiskEnrollments : watchEnrollments).slice(0, 5);

  return (
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
          {displayedStudents.map((student) => (
            <StudentFollowUpCard key={student.id} student={student} />
          ))}

          {students.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Aucun apprenant rattaché à vos cours pour le moment.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StudentFollowUpCard({ student }: { student: Enrollment }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-medium text-gray-900">{student.student_name}</p>
          <p className="text-sm text-gray-600">{student.course_name || 'Formation'}</p>
        </div>
        <AttentionBadge level={student.attention_level} />
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
  );
}

export function ProgramContentPanel({
  loading,
  totalSections,
  totalLessons,
  totalAssets,
  totalPreviewLessons,
  latestUpdatedCourse,
  coursesMissingContentCount,
  inactiveCourseCount,
}: {
  loading: boolean;
  totalSections: number;
  totalLessons: number;
  totalAssets: number;
  totalPreviewLessons: number;
  latestUpdatedCourse: CourseInsight | null;
  coursesMissingContentCount: number;
  inactiveCourseCount: number;
}) {
  return (
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
            <LargeMetricTile label="Sections créées" value={totalSections} />
            <LargeMetricTile label="Leçons créées" value={totalLessons} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LargeMetricTile label="Contenus attachés" value={totalAssets} />
            <LargeMetricTile label="Leçons preview" value={totalPreviewLessons} />
          </div>

          {latestUpdatedCourse ? (
            <LatestCourseCard course={latestUpdatedCourse} />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Aucune formation à reprendre pour le moment.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <LargeMetricTile label="Cours avec contenu incomplet" value={coursesMissingContentCount} />
            <LargeMetricTile label="Cours à reprise après rejet / archivage" value={inactiveCourseCount} />
          </div>
        </div>
      )}
    </section>
  );
}

function LatestCourseCard({ course }: { course: CourseInsight }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Cours repris récemment</p>
          <p className="font-semibold text-gray-900">{course.title}</p>
          <p className="text-sm text-gray-600">{course.category || 'Général'}</p>
        </div>
        <CourseStatusBadge course={course} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <MetricTile label="Sections" value={course.modules || 0} />
        <MetricTile label="Leçons" value={course.lessons_count || 0} />
        <MetricTile label="Contenus" value={course.assets_count || 0} />
      </div>

      <CourseReadinessBox course={course} className="mb-3" />

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
        <span>{course.published_lessons_count || 0} leçon(s) publiées</span>
        <span>{course.preview_lessons_count || 0} preview</span>
        <span>Mis à jour le {formatDate(course.updated_at)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/dashboard/formateur/mes-cours/${course.id}/programme`}
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
  );
}
