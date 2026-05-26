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
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard count={4} />
      </div>
    );
  }

  return (
    <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {quickLinks.map((item) => (
          <Link
            key={`${item.label}-${item.path}`}
            to={item.path}
            className={`rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-gray-200 hover:bg-white ${item.tone}`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <i className={`${item.icon} text-lg`}></i>
            </div>
            <p className="text-sm font-medium">{item.label}</p>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {links.map((link) => (
          <Link key={link.label} to={link.path} className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className={`${link.icon} text-xl text-teal-600`}></i>
              </div>
            </div>
            <p className="font-medium text-gray-900 text-sm">{link.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
