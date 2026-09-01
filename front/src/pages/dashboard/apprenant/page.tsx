import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import ResumeCourseBanner from '@/components/feature/ResumeCourseBanner';
import {
  fetchApprenantCertificates,
  fetchApprenantEnrollments,
  type ApprenantCertificate as Certificate,
  type ApprenantEnrollment as Enrollment,
} from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';

export default function ApprenantDashboardPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: queryKeys.apprenant.enrollments(user?.id),
    queryFn: () => fetchApprenantEnrollments(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });
  const { data: certificates = [], isLoading: certificatesLoading } = useQuery<Certificate[]>({
    queryKey: queryKeys.apprenant.certificates(user?.id),
    queryFn: () => fetchApprenantCertificates(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });
  const loading = enrollmentsLoading || certificatesLoading;
  const totalEnrolled = enrollments.length;
  const inProgressCount = enrollments.filter((e) => e.progress > 0 && e.progress < 100).length;
  const completedCount = enrollments.filter((e) => e.progress >= 100).length;
  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, enrollment) => sum + Number(enrollment.progress || 0), 0) / enrollments.length)
    : 0;
  const totalHours = enrollments.reduce((sum, e) => {
    const hours = parseInt(e.courses?.duration?.replace(/\D/g, '') || '0');
    return sum + hours;
  }, 0);

  const quickLinks = [
    { label: 'Mes formations', icon: 'ri-book-open-line', path: '/dashboard/apprenant/mes-cours', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Ma progression', icon: 'ri-bar-chart-grouped-line', path: '/dashboard/apprenant/progression', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Mes certificats', icon: 'ri-award-line', path: '/dashboard/apprenant/certificats', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Catalogue', icon: 'ri-compass-line', path: '/espace-numerique', tone: 'bg-violet-50 text-violet-700' },
  ];

  const handleContinue = (id: number) => {
    success('Cours repris', 'Bonne continuation dans votre apprentissage !');
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-600">Espace apprenant</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Bonjour, {user?.firstName || 'Apprenant'} <span className="align-middle">👋</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
              Reprenez vos formations, suivez votre progression et gardez l’essentiel sous les yeux.
            </p>
          </div>
        </section>

        <ResumeCourseBanner />

        {loading ? (
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <SkeletonCard count={4} />
          </div>
        ) : (
          <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              { label: 'Formations en cours', value: String(inProgressCount), detail: `${totalEnrolled} inscription(s)`, icon: 'ri-book-open-line', surface: 'bg-teal-50 text-teal-700' },
              { label: 'Formations terminées', value: String(completedCount), detail: `${averageProgress}% de progression moyenne`, icon: 'ri-checkbox-circle-line', surface: 'bg-emerald-50 text-emerald-700' },
              { label: 'Certificats obtenus', value: String(certificates.length), detail: 'disponibles au téléchargement', icon: 'ri-award-line', surface: 'bg-amber-50 text-amber-700' },
              { label: "Heures d'apprentissage", value: String(totalHours), detail: 'estimées sur vos cours', icon: 'ri-time-line', surface: 'bg-sky-50 text-sky-700' },
            ].map((stat, index) => (
              <div key={index} className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="mt-2 text-sm text-gray-500">{stat.detail}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.surface}`}>
                    <i className={`${stat.icon} text-xl`}></i>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
            <Link to="/espace-numerique" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              Explorer le catalogue
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-gray-200 hover:bg-white ${link.tone}`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <i className={`${link.icon} text-lg`}></i>
                </div>
                <p className="text-sm font-medium">{link.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">À reprendre</h2>
                <p className="text-sm text-gray-500">Vos cours encore actifs, avec progression et accès direct.</p>
              </div>
              <Link to="/dashboard/apprenant/mes-cours" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Voir tout
              </Link>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <div className="space-y-4">
                {enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3).map((enrollment) => (
                  <div key={enrollment.id} className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{enrollment.courses?.title || 'Formation'}</h3>
                        <p className="text-sm text-gray-600">{enrollment.courses?.category || ''}</p>
                      </div>
                      <span className="text-sm font-bold text-teal-600">{enrollment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                    <Link
                      to={`/dashboard/apprenant/cours/${enrollment.course_id}`}
                      onClick={() => handleContinue(enrollment.course_id)}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap text-center"
                    >
                      Continuer
                    </Link>
                  </div>
                ))}
                {enrollments.filter(e => e.progress > 0 && e.progress < 100).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucune formation en cours</p>
                    <Link to="/espace-numerique" className="text-teal-600 text-sm mt-2 inline-block">Explorer le catalogue</Link>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Mes certificats</h2>
              <span className="text-sm text-gray-500">{certificates.length} certificats</span>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <div className="space-y-4">
                {certificates.slice(0, 3).map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-yellow-300 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <i className="ri-award-line text-xl text-yellow-600"></i>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{cert.course_name || cert.title}</h3>
                        <p className="text-sm text-gray-600">C2P Academy · {cert.grade ? `Note: ${cert.grade}/20` : 'Terminé'}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
                      Télécharger
                    </button>
                  </div>
                ))}
                {certificates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucun certificat obtenu</p>
                    <Link to="/dashboard/apprenant/mes-cours" className="text-teal-600 text-sm mt-2 inline-block">Voir mes formations</Link>
                  </div>
                )}
              </div>
            )}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Repères</h2>
                <Link to="/dashboard/apprenant/progression" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                  Voir ma progression
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Inscrites</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{totalEnrolled}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Complétées</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{completedCount}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
