import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { fetchOwnerDashboardSnapshot } from '@/lib/projectApi';
import { formatCurrency, formatShortCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';
import { fetchFinanceSnapshot } from '@/lib/saasApi';

export default function PorteurDashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const subscriptionGate = gateFor('project_manage');

  const dashboardQuery = useQuery({
    queryKey: queryKeys.porteur.dashboard(user?.id),
    queryFn: async () => {
      const [snapshot, financeSnapshot] = await Promise.all([
        fetchOwnerDashboardSnapshot(user!.id),
        fetchFinanceSnapshot(user!.id, user!.role),
      ]);
      return { ...snapshot, finance: financeSnapshot };
    },
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (dashboardQuery.isError) {
      console.error(dashboardQuery.error);
      error('Erreur', 'Impossible de charger les donnees porteur.');
    }
  }, [dashboardQuery.error, dashboardQuery.isError, error]);

  const loading = dashboardQuery.isLoading;
  const projects = useMemo(() => dashboardQuery.data?.projects ?? [], [dashboardQuery.data?.projects]);
  const partnerships = useMemo(() => dashboardQuery.data?.partnerships ?? [], [dashboardQuery.data?.partnerships]);
  const rounds = useMemo(() => dashboardQuery.data?.rounds ?? [], [dashboardQuery.data?.rounds]);
  const finance = dashboardQuery.data?.finance ?? null;

  const stats = useMemo(() => {
    const totalFunding = projects.reduce((sum, project) => sum + Number(project.funding || 0), 0);
    const totalGoal = projects.reduce((sum, project) => sum + Number(project.funding_goal || 0), 0);
    return [
      {
        label: 'Projets suivis',
        value: String(projects.length),
        detail: `${projects.filter((project) => project.status === 'incubation').length} en incubation`,
        icon: 'ri-file-list-line',
        surface: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Mentors assignés',
        value: String(partnerships.filter((partner) => partner.type === 'mentor').length),
        detail: `${partnerships.length} relation(s) actives`,
        icon: 'ri-user-star-line',
        surface: 'bg-violet-50 text-violet-700',
      },
      {
        label: 'Financement obtenu',
        value: formatShortCurrency(totalFunding),
        detail: `${totalGoal > 0 ? Math.round((totalFunding / totalGoal) * 100) : 0}% de l'objectif`,
        icon: 'ri-funds-line',
        surface: 'bg-teal-50 text-teal-700',
      },
      {
        label: 'Levées en cours',
        value: String(rounds.filter((round) => round.status !== 'termine').length),
        detail: `${rounds.length} cycle(s) au total`,
        icon: 'ri-line-chart-line',
        surface: 'bg-amber-50 text-amber-700',
      },
    ];
  }, [partnerships, projects, rounds]);

  const mentors = partnerships.filter((partner) => partner.type === 'mentor').slice(0, 3);
  const quickLinks = [
    { label: 'Soumettre un projet', icon: 'ri-add-circle-line', link: '/dashboard/porteur/mes-projets/soumettre', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Mes projets', icon: 'ri-folder-line', link: '/dashboard/porteur/mes-projets', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Partenariats', icon: 'ri-team-line', link: '/dashboard/porteur/partenariats', tone: 'bg-violet-50 text-violet-700' },
    { label: 'Financements', icon: 'ri-funds-line', link: '/dashboard/porteur/financements', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', tone: 'bg-amber-50 text-amber-700' },
  ];

  const activeSubscription = finance?.subscriptions.find((entry) => entry.status === 'active') ?? null;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      incubation: 'bg-blue-100 text-blue-700',
      'pre-incubation': 'bg-amber-100 text-amber-700',
      acceleration: 'bg-green-100 text-green-700',
    };
    const labels: Record<string, string> = {
      incubation: 'En incubation',
      'pre-incubation': 'Pre-incubation',
      acceleration: 'Acceleration',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur de projet' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-600">Espace porteur</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Bonjour, {user?.firstName || 'Porteur'} <span className="align-middle">👋</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
              Concentrez-vous sur vos projets, vos mentors et vos tours de financement avec une vue claire.
            </p>
          </div>
        </section>

        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <section className="mb-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
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

        <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Abonnement incubation</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{activeSubscription?.plan_name || 'Aucun plan actif'}</p>
            <p className="mt-2 text-sm text-gray-500">
              {activeSubscription ? `Renouvellement ${new Date(activeSubscription.renews_at).toLocaleDateString('fr-FR')}` : 'Choisissez un plan pour accéder au coaching, au suivi et aux services premium C2P.'}
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Retraits en attente</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(Number(finance?.wallet?.pending_payout_amount ?? 0))}</p>
            <p className="mt-2 text-sm text-gray-500">Solde portefeuille visible en haut du tableau de bord.</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Frais et services C2P</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency((finance?.commissionEntries || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0))}</p>
            <p className="mt-2 text-sm text-gray-500">Dossiers, abonnement et services premium déjà facturés.</p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
            <Link to="/dashboard/porteur/mes-projets" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Ouvrir mes projets
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {quickLinks.map((action) => (
              <Link
                key={action.link}
                to={action.link}
                className={`rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-gray-200 hover:bg-white ${action.tone}`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <i className={`${action.icon} text-lg`}></i>
                </div>
                <p className="text-sm font-medium">{action.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr,1fr]">
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mes projets</h2>
                <p className="text-sm text-gray-500">Les dossiers à suivre en priorité et leur avancement.</p>
              </div>
              <Link to="/dashboard/porteur/mes-projets" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Voir tout</Link>
            </div>

            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des projets...</p>}
              {!loading && projects.slice(0, 3).map((project) => (
                <div key={project.id} className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-emerald-300">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(project.status)}
                        <span className="text-sm text-gray-600">{formatCurrency(project.funding)} / {formatShortCurrency(project.funding_goal)}</span>
                      </div>
                    </div>
                    <Link to={`/dashboard/porteur/mes-projets/${project.id}`} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 text-center">
                      Details
                    </Link>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{project.phase}</span>
                    <span>{project.next_milestone}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Mentors et partenaires</h2>
                <span className="text-sm text-gray-500">{partnerships.length} relation(s)</span>
              </div>

              <div className="space-y-4">
                {loading && <p className="text-sm text-gray-500">Chargement des partenaires...</p>}
                {!loading && mentors.map((mentor) => (
                  <div key={mentor.id} className="flex items-center justify-between rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-4">
                      <img src={mentor.avatar} alt={mentor.name} className="h-12 w-12 rounded-full object-cover" />
                      <div>
                        <h3 className="font-medium text-gray-900">{mentor.name}</h3>
                        <p className="text-sm text-gray-600">{mentor.role}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      mentor.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {mentor.status === 'actif' ? 'Actif' : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Levées de fonds en cours</h2>
                <Link to="/dashboard/porteur/financements" className="text-sm font-medium text-teal-600 hover:text-teal-700">Voir tout</Link>
              </div>
              <div className="space-y-4">
                {rounds.slice(0, 3).map((round) => (
                  <div key={round.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-gray-900">{round.project_title}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${round.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {round.status === 'termine' ? 'Terminé' : 'En cours'}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600">{round.type}</p>
                    <p className="mb-2 text-sm font-medium text-gray-900">{formatCurrency(round.raised_amount)} / {formatShortCurrency(round.target_amount)}</p>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-teal-500" style={{ width: `${round.progress_percent || 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
