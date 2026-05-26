import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Breadcrumb from '@/components/base/Breadcrumb';
import DashboardLayout from '@/pages/dashboard/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { fetchParentDashboardSnapshot, type ParentCertificate, type ParentEnrollment, type ParentStudentLink } from '@/lib/parentDashboardApi';
import { getCourseDeliveryLabel } from '@/lib/courseDelivery';
import { getCourseBranchLabel } from '@/lib/courseBranch';
import { queryKeys } from '@/lib/queryKeys';

function formatDate(value: string | null | undefined) {
  if (!value) return 'Aucune activite recente';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ParentDashboardPage() {
  const { user } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: queryKeys.parent.dashboard(user?.id),
    queryFn: () => fetchParentDashboardSnapshot(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (dashboardQuery.isError) {
      console.error(dashboardQuery.error);
    }
  }, [dashboardQuery.error, dashboardQuery.isError]);

  const loading = dashboardQuery.isLoading;
  const links: ParentStudentLink[] = useMemo(() => dashboardQuery.data?.links ?? [], [dashboardQuery.data?.links]);
  const enrollments: ParentEnrollment[] = useMemo(() => dashboardQuery.data?.enrollments ?? [], [dashboardQuery.data?.enrollments]);
  const certificates: ParentCertificate[] = useMemo(() => dashboardQuery.data?.certificates ?? [], [dashboardQuery.data?.certificates]);

  const trackedStudentIds = useMemo(() => Array.from(new Set(links.map((entry) => entry.student_id))), [links]);
  const activeEnrollments = useMemo(() => enrollments.filter((entry) => entry.status !== 'inactive'), [enrollments]);
  const completedCourses = useMemo(
    () => enrollments.filter((entry) => Number(entry.progress || 0) >= 100 || entry.status === 'completed').length,
    [enrollments],
  );
  const averageProgress = useMemo(() => {
    if (activeEnrollments.length === 0) return 0;
    return Math.round(activeEnrollments.reduce((sum, entry) => sum + Number(entry.progress || 0), 0) / activeEnrollments.length);
  }, [activeEnrollments]);

  const primaryStudent = links[0] ?? null;
  const recentEnrollments = activeEnrollments.slice(0, 4);
  const recentCertificates = certificates.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Parent' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-medium text-teal-600">Suivi parent</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
            Bonjour, {user?.firstName || 'Parent'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600 md:text-base">
            Cet espace vous permet de suivre la progression academique rattachee a votre compte parent, de consulter les certificats emis et de rester en lien avec C2P.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Enfants rattaches', value: String(trackedStudentIds.length), icon: 'ri-parent-line', tone: 'bg-[#eef6ff] text-[#27346b]' },
            { label: 'Parcours actifs', value: String(activeEnrollments.length), icon: 'ri-book-open-line', tone: 'bg-teal-50 text-teal-700' },
            { label: 'Progression moyenne', value: `${averageProgress}%`, icon: 'ri-bar-chart-grouped-line', tone: 'bg-emerald-50 text-emerald-700' },
            { label: 'Certificats emis', value: String(recentCertificates.length), icon: 'ri-award-line', tone: 'bg-amber-50 text-amber-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{loading ? '...' : item.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <i className={`${item.icon} text-xl`}></i>
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr,1fr]">
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Apprenant rattache</h2>
                <p className="text-sm text-gray-500">Le rattachement parent-apprenant reste pilote par l equipe C2P.</p>
              </div>
              <Link to="/dashboard/messages?support=1" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Contacter C2P
              </Link>
            </div>

            {primaryStudent ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex items-center gap-4">
                  {primaryStudent.student_avatar ? (
                    <img src={primaryStudent.student_avatar} alt={primaryStudent.student_name} className="h-14 w-14 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#27346b]/10 text-[#27346b]">
                      <i className="ri-user-line text-xl"></i>
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{primaryStudent.student_name}</p>
                    <p className="text-sm text-gray-500">{primaryStudent.relationship || 'Parent'} · rattachement {formatDate(primaryStudent.created_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                Aucun apprenant n est encore rattache a ce compte parent. L equipe C2P peut activer ce suivi depuis votre dossier.
              </div>
            )}

            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Parcours suivis</h3>
                <span className="text-sm text-gray-500">{activeEnrollments.length} parcours</span>
              </div>

              <div className="space-y-4">
                {recentEnrollments.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{entry.courses?.title || 'Formation C2P'}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {getCourseBranchLabel(entry.courses?.program_branch)} · {getCourseDeliveryLabel(entry.courses?.delivery_mode)} · {entry.student_name}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-teal-700">{Math.round(Number(entry.progress || 0))}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.max(0, Math.min(100, Number(entry.progress || 0)))}%` }}></div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span>Derniere activite: {formatDate(entry.last_active)}</span>
                      <span>Statut: {entry.status || 'active'}</span>
                      {entry.grade !== null && entry.grade !== undefined ? <span>Note actuelle: {entry.grade}/20</span> : null}
                    </div>
                  </div>
                ))}

                {!loading && recentEnrollments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                    Aucun parcours actif a afficher pour le moment.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Certificats</h2>
                <span className="text-sm text-gray-500">{certificates.length}</span>
              </div>
              <div className="space-y-3">
                {recentCertificates.map((certificate) => (
                  <div key={certificate.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <p className="font-semibold text-gray-900">{certificate.title || certificate.course_name || 'Certificat C2P'}</p>
                    <p className="mt-1 text-sm text-gray-500">{certificate.student_name}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>Statut: {certificate.status || 'ready'}</span>
                      <span>Date: {formatDate(certificate.issued_at || certificate.completion_date)}</span>
                      {certificate.grade !== null && certificate.grade !== undefined ? <span>Note: {certificate.grade}/20</span> : null}
                    </div>
                  </div>
                ))}

                {!loading && recentCertificates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                    Aucun certificat emis pour l instant.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Actions utiles</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Link to="/dashboard/messages?support=1" className="rounded-2xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50">
                  Ecrire a C2P
                </Link>
                <Link to="/espace-numerique" className="rounded-2xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50">
                  Voir le catalogue END et Form Actions
                </Link>
                <Link to="/dashboard/securite" className="rounded-2xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50">
                  Securite du compte parent
                </Link>
              </div>
            </section>
          </div>
        </div>

        {!loading ? (
          <section className="mt-6 rounded-3xl border border-[#d7e6fb] bg-[#f8fbff] px-5 py-5 text-sm leading-7 text-[#31445f] shadow-sm">
            <p className="font-semibold text-[#27346b]">Cadre actuel</p>
            <p className="mt-2">
              Le suivi parent expose les parcours rattaches, la progression agrégée et les certificats. Les demandes sensibles, changements de rattachement et arbitrages passent encore par l équipe C2P.
            </p>
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
