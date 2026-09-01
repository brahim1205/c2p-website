import { Link } from 'react-router-dom';
import { SkeletonCard } from '@/components/base/Skeleton';
import {
  type CourseInsight,
  type DashboardQuickLink,
  type DashboardStat,
} from './formateurDashboardModel';

export function FormateurHero({ firstName }: { firstName?: string }) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-teal-600">Espace formateur</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
          Bonjour, {firstName || 'Formateur'} <span className="align-middle">👋</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
          Suivez la publication de vos cours, la charge pédagogique et les apprenants qui demandent une relance.
        </p>
      </div>
    </section>
  );
}

export function FormateurStatsGrid({ loading, stats }: { loading: boolean; stats: DashboardStat[] }) {
  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SkeletonCard count={4} />
      </div>
    );
  }

  return (
    <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:rounded-3xl sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-xs text-gray-500 sm:text-sm">{stat.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900 sm:mt-2 sm:text-2xl">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500 sm:mt-2 sm:text-sm">{stat.detail}</p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.surface} sm:h-12 sm:w-12`}>
              <i className={`${stat.icon} text-lg sm:text-xl`}></i>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

export function QuickLinksPanel({ quickLinks }: { quickLinks: DashboardQuickLink[] }) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
        <Link to="/dashboard/formateur/profil-public" className="text-sm font-medium text-teal-600 hover:text-teal-700">
          Voir le profil public
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6">
        {quickLinks.map((item) => (
          <Link
            key={`${item.label}-${item.path}`}
            to={item.path}
            className={`rounded-2xl border border-transparent px-3 py-3 transition-all hover:border-gray-200 hover:bg-white sm:px-4 sm:py-4 ${item.tone}`}
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white sm:mb-3 sm:h-10 sm:w-10">
              <i className={`${item.icon} text-base sm:text-lg`}></i>
            </div>
            <p className="text-xs font-medium sm:text-sm">{item.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ComplementLinksPanel({ latestUpdatedCourse }: { latestUpdatedCourse: CourseInsight | null }) {
  const links = [
    { label: 'Mes formations', icon: 'ri-book-open-line', path: '/dashboard/formateur/mes-cours' },
    {
      label: 'Programme',
      icon: 'ri-node-tree',
      path: latestUpdatedCourse ? `/dashboard/formateur/mes-cours/${latestUpdatedCourse.id}/programme` : '/dashboard/formateur/mes-cours',
    },
    { label: 'Classes virtuelles', icon: 'ri-video-line', path: '/dashboard/formateur/classes-virtuelles' },
    { label: 'Mes apprenants', icon: 'ri-group-line', path: '/dashboard/formateur/apprenants' },
    { label: 'Évaluations', icon: 'ri-file-list-3-line', path: '/dashboard/formateur/evaluations' },
    { label: 'Certificats', icon: 'ri-award-line', path: '/dashboard/formateur/certificats' },
  ];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <h2 className="mb-6 text-lg font-bold text-gray-900">Compléments</h2>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6">
        {links.map((link) => (
          <Link key={link.label} to={link.path} className="rounded-lg border-2 border-gray-200 p-3 text-center transition-all hover:border-teal-500 sm:p-4">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 sm:mb-3 sm:h-12 sm:w-12">
              <div className="flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6">
                <i className={`${link.icon} text-lg text-teal-600 sm:text-xl`}></i>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-900 sm:text-sm">{link.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
