import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonCard } from '@/components/base/Skeleton';
import GlobalSearch from '../../components/GlobalSearch';
import {
  fetchApprenantEnrollments,
  type ApprenantEnrollment as Enrollment,
} from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';

export default function ApprenantCoursPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: enrollments = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.apprenant.enrollments(user?.id),
    queryFn: () => fetchApprenantEnrollments(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });

  const getEffectiveProgress = (enrollment: Enrollment) => {
    const backendProgress = Number(enrollment.progress || 0);
    return {
      progress: backendProgress,
      completedLessons: enrollment.completed_lessons_estimate ?? 0,
      lastActive: enrollment.last_active,
    };
  };

  const filteredEnrollments = enrollments.filter((e) => {
    const course = e.courses;
    if (!course) return false;
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const progress = getEffectiveProgress(e).progress;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && progress > 0 && progress < 100) ||
      (statusFilter === 'completed' && progress >= 100);
    return matchesSearch && matchesStatus;
  });

  const openCourse = (enrollment: Enrollment) => {
    const courseId = enrollment.courses?.id;
    if (!courseId) return;
    navigate(`/dashboard/apprenant/cours/${courseId}?resume=1`);
  };

  const handleCourseCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, enrollment: Enrollment) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openCourse(enrollment);
  };

  const getStatusBadge = (status: string, progress: number) => {
    if (progress >= 100) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Terminé</span>;
    }
    if (progress === 0) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Non commencé</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">En cours</span>;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-teal-500';
    if (progress >= 20) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const getCourseImage = (course: Enrollment['courses']) => {
    if (course?.thumbnail) return course.thumbnail;
    return '/images/home/academy.jpg';
  };

  const formatLastAccessed = (dateStr: string) => {
    if (!dateStr) return 'Jamais';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return 'Il y a quelques minutes';
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD} jour${diffD > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR');
  };

  const totalEnrolled = enrollments.length;
  const effectiveEnrollments = enrollments.map((enrollment) => ({
    enrollment,
    progress: getEffectiveProgress(enrollment).progress,
  }));
  const inProgressCount = effectiveEnrollments.filter((e) => e.progress > 0 && e.progress < 100).length;
  const completedCount = effectiveEnrollments.filter((e) => e.progress >= 100).length;
  const notStartedCount = effectiveEnrollments.filter((e) => e.progress === 0).length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Mes cours' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes formations</h1>
          <p className="text-gray-600 text-sm md:text-base">Suivez vos formations et continuez votre apprentissage</p>
        </div>

        <GlobalSearch context="apprenant" />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'En cours', value: String(inProgressCount), icon: 'ri-book-open-line', color: 'bg-teal-500' },
            { label: 'Terminées', value: String(completedCount), icon: 'ri-checkbox-circle-line', color: 'bg-green-500' },
            { label: 'Non commencées', value: String(notStartedCount), icon: 'ri-time-line', color: 'bg-gray-500' },
            { label: 'Total', value: String(totalEnrolled), icon: 'ri-award-line', color: 'bg-yellow-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${stat.icon} text-white text-sm`}></i>
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

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une formation..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-12 pr-4 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Toutes' : status === 'active' ? 'En cours' : 'Terminées'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard count={6} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEnrollments.map((enrollment) => {
              const course = enrollment.courses;
              if (!course) return null;
              const effectiveProgress = getEffectiveProgress(enrollment);
              const progress = effectiveProgress.progress;
              const totalModules = course.modules || 1;
              const completedModules = Math.min(totalModules, Math.round((progress / 100) * totalModules));

              return (
                <div
                  key={enrollment.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Ouvrir la formation ${course.title}`}
                  onClick={() => openCourse(enrollment)}
                  onKeyDown={(event) => handleCourseCardKeyDown(event, enrollment)}
                  className="flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={getCourseImage(course)} alt={course.title} className="w-full h-full object-cover object-top" />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(enrollment.status, progress)}
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">{course.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-semibold text-gray-900 text-base mb-2">{course.title}</h3>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>{completedModules}/{totalModules} modules</span>
                        <span className="font-medium text-gray-900">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${getProgressColor(progress)} h-2 rounded-full transition-all`} style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    {progress > 0 && progress < 100 && (
                      <div className="bg-teal-50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-teal-600 mb-0.5">Prochain module</p>
                        <p className="text-sm font-medium text-teal-900">Module {completedModules + 1} : {course.title}</p>
                      </div>
                    )}

                    {progress >= 100 && (
                      <div className="mb-3 rounded-lg bg-emerald-50 p-3">
                        <p className="text-xs font-medium text-emerald-600">Formation terminée</p>
                        <p className="mt-0.5 text-sm text-emerald-900">Votre progression est complète. Cliquez sur la carte pour revoir le cours.</p>
                      </div>
                    )}

                    <div className="mt-auto mb-4 flex items-center justify-between text-xs text-gray-500">
                      <span>Dernier accès : {formatLastAccessed(effectiveProgress.lastActive)}</span>
                    </div>

                    <div className="flex gap-2">
                      {progress > 0 && progress < 100 && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCourse(enrollment);
                          }}
                          className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap text-center"
                        >
                          Continuer
                        </button>
                      )}
                      {progress === 0 && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCourse(enrollment);
                          }}
                          className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors whitespace-nowrap text-center"
                        >
                          Commencer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredEnrollments.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-book-open-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune formation trouvée</h3>
            <p className="text-gray-600 mb-4">Ajustez vos filtres ou explorez le catalogue</p>
            <Link
              to="/espace-numerique"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Explorer le catalogue
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
