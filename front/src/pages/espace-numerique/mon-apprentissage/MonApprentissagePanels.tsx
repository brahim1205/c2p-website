import { Link } from 'react-router-dom';
import {
  getCourseDeliveryBadgeClass,
  getCourseDeliveryIcon,
  getCourseDeliveryLabel,
} from '@/lib/courseDelivery';
import type { AuthUser } from '@/lib/roles';
import {
  formatLastAccessed,
  getCourseImage,
  type Certificate,
  type Enrollment,
} from './monApprentissageModel';

export function LearningStatsCards({ stats }: { stats: {
  totalCourses: number;
  inProgress: number;
  completed: number;
  certificates: number;
} }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        { label: 'Inscriptions', value: stats.totalCourses, icon: 'ri-book-open-line', tone: 'bg-slate-100 text-slate-700' },
        { label: 'En cours', value: stats.inProgress, icon: 'ri-loader-4-line', tone: 'bg-teal-50 text-teal-700' },
        { label: 'Terminees', value: stats.completed, icon: 'ri-checkbox-circle-line', tone: 'bg-green-50 text-green-700' },
        { label: 'Certificats emis', value: stats.certificates, icon: 'ri-award-line', tone: 'bg-amber-50 text-amber-700' },
      ].map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
              <i className={`${stat.icon} text-lg`}></i>
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

export function LearningTabs(props: {
  activeTab: 'courses' | 'certificates';
  enrollmentsCount: number;
  certificatesCount: number;
  onTabChange: (tab: 'courses' | 'certificates') => void;
}) {
  const { activeTab, certificatesCount, enrollmentsCount, onTabChange } = props;
  return (
    <div className="bg-white border-b border-gray-200 rounded-t-2xl">
      <div className="px-4 sm:px-6">
        <div className="flex space-x-8">
          <button
            onClick={() => onTabChange('courses')}
            className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'courses'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Mes formations ({enrollmentsCount})
          </button>
          <button
            onClick={() => onTabChange('certificates')}
            className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'certificates'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Certificats ({certificatesCount})
          </button>
        </div>
      </div>
    </div>
  );
}

export function LearningCoursesPanel({ enrollments }: { enrollments: Enrollment[] }) {
  return (
    <div className="space-y-6">
      {enrollments.map((enrollment) => {
        const course = enrollment.courses;
        if (!course) return null;
        return (
          <div key={enrollment.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-64 h-48 md:h-auto flex-shrink-0">
                <img
                  src={getCourseImage(course)}
                  alt={course.title}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="flex-1 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#dce3ec] bg-[#f4f7fb] px-2.5 py-1 text-xs font-medium text-[#475569]">
                        {course.category}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getCourseDeliveryBadgeClass(course.delivery_mode)}`}>
                        <i className={getCourseDeliveryIcon(course.delivery_mode)}></i>
                        <span>{getCourseDeliveryLabel(course.delivery_mode)}</span>
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                    <p className="text-sm text-gray-600">
                      {course.modules || 0} modules • {course.duration || 'Duree non renseignee'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{formatLastAccessed(enrollment.last_active)}</span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression</span>
                    <span className="text-sm font-bold text-teal-600">{enrollment.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${enrollment.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    Statut : <span className="font-medium text-gray-900">{enrollment.progress >= 100 ? 'Termine' : enrollment.progress > 0 ? 'En cours' : 'A demarrer'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/espace-numerique/formation/${course.id}`}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Voir le parcours
                    </Link>
                    <Link
                      to={`/espace-numerique/formation/${course.id}`}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                    >
                      Continuer
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {enrollments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
            <i className="ri-book-open-line text-2xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune inscription pour le moment</h3>
          <p className="text-sm text-gray-600 mb-6">Explorez le catalogue pour commencer un parcours en ligne, presentiel ou hybride.</p>
          <Link
            to="/espace-numerique"
            className="inline-block rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            Parcourir les formations
          </Link>
        </div>
      )}
    </div>
  );
}

export function LearningCertificatesPanel({ certificates, user }: { certificates: Certificate[]; user: AuthUser }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {certificates.map((certificate) => (
        <div key={certificate.id} className="rounded-2xl border border-gray-200 p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <i className="ri-award-line text-2xl"></i>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              certificate.status === 'issued'
                ? 'bg-green-50 text-green-700'
                : certificate.status === 'ready'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-blue-50 text-blue-700'
            }`}>
              {certificate.status === 'issued' ? 'Emis' : certificate.status === 'ready' ? 'Pret' : 'En attente'}
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2">{certificate.course_name || certificate.title}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between gap-3">
              <span>Reference</span>
              <span className="font-medium text-gray-900">{certificate.certificate_number || 'A generer'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Note finale</span>
              <span className="font-medium text-gray-900">{certificate.final_grade ?? certificate.grade ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Date</span>
              <span className="font-medium text-gray-900">
                {certificate.issued_at
                  ? new Date(certificate.issued_at).toLocaleDateString('fr-FR')
                  : certificate.completion_date
                    ? new Date(certificate.completion_date).toLocaleDateString('fr-FR')
                    : '-'}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <Link
              to={user.role === 'apprenant' ? '/dashboard/apprenant/certificats' : '/dashboard'}
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              <span>Voir le certificat</span>
              <i className="ri-arrow-right-line"></i>
            </Link>
          </div>
        </div>
      ))}

      {certificates.length === 0 && (
        <div className="col-span-full rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
            <i className="ri-award-line text-2xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun certificat pour le moment</h3>
          <p className="text-sm text-gray-600">Terminez vos formations pour voir apparaître vos emissions reelles.</p>
        </div>
      )}
    </div>
  );
}
