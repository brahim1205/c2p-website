import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  expressPartnerInterestAndNotify,
  fetchPartnerDashboardSnapshot,
  type PartnerType,
  type Collaboration,
  type ProjectRecord,
  type TrackedProject,
} from '@/lib/projectApi';
import { formatCurrency, formatShortCurrency } from '@/lib/formatters';

function getPartnerTypeLabel(type: string | null | undefined) {
  return type === 'technique' ? 'Technique' : 'Financier';
}

export default function PartenaireDashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [trackedProjects, setTrackedProjects] = useState<TrackedProject[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [openProjects, setOpenProjects] = useState<ProjectRecord[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snapshot = await fetchPartnerDashboardSnapshot(user.id);
      setTrackedProjects(snapshot.trackedProjects);
      setCollaborations(snapshot.collaborations);
      setOpenProjects(snapshot.openProjects.slice(0, 4));
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le tableau de bord partenaire.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const invested = trackedProjects.reduce((sum, tracked) => sum + Number(tracked.invested_amount || 0), 0);
    const active = trackedProjects.filter((tracked) => tracked.status === 'actif').length;
    return [
      {
        label: 'Projets suivis',
        value: String(trackedProjects.length),
        detail: `${active} actif(s)`,
        icon: 'ri-eye-line',
        surface: 'bg-teal-50 text-teal-700',
      },
      {
        label: 'Montant engagé',
        value: formatShortCurrency(invested),
        detail: `${trackedProjects.length} dossier(s) suivis`,
        icon: 'ri-money-dollar-circle-line',
        surface: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Collaborations actives',
        value: String(collaborations.filter((collaboration) => collaboration.status === 'actif').length),
        detail: `${collaborations.length} relation(s) ouvertes`,
        icon: 'ri-team-line',
        surface: 'bg-sky-50 text-sky-700',
      },
      {
        label: 'Nouvelles opportunités',
        value: String(openProjects.length),
        detail: 'à explorer',
        icon: 'ri-search-line',
        surface: 'bg-amber-50 text-amber-700',
      },
    ];
  }, [collaborations, openProjects.length, trackedProjects]);

  const quickLinks = [
    { label: 'Opportunités', icon: 'ri-search-line', link: '/dashboard/partenaire/opportunites', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Projets suivis', icon: 'ri-eye-line', link: '/dashboard/partenaire/projets-suivis', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Collaborations', icon: 'ri-team-line', link: '/dashboard/partenaire/collaborations', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Paiements', icon: 'ri-wallet-line', link: '/dashboard/paiements', tone: 'bg-pink-50 text-pink-700' },
    { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', tone: 'bg-amber-50 text-amber-700' },
  ];

  const handleInterest = async (project: ProjectRecord, partnerType: PartnerType) => {
    if (!user?.id) return;

    try {
      const result = await expressPartnerInterestAndNotify({
        partner: user,
        project,
        partnerType,
        ownerMessage: `${user.firstName} ${user.lastName} souhaite ouvrir une discussion ${partnerType === 'technique' ? 'technique' : 'financiere'} sur ${project.title}.`,
      });

      success(
        result.alreadyTracked ? 'Suivi deja actif' : 'Interet enregistre',
        result.alreadyTracked
          ? 'Ce projet fait deja partie de vos suivis ou de vos collaborations.'
          : 'L equipe C2P a ete notifiee et le projet a ete ajoute a vos suivis.',
      );
      loadDashboard();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de manifester votre interet.');
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-600">Espace partenaire</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Bonjour, {user?.firstName || 'Partenaire'} <span className="align-middle">👋</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
              Retrouvez vos projets suivis, vos collaborations et les nouvelles opportunités sans écran surchargé.
            </p>
          </div>
        </section>

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

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
            <Link to="/dashboard/partenaire/opportunites" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              Explorer le pipeline
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mes suivis</h2>
                <p className="text-sm text-gray-500">Les projets qui demandent une lecture rapide de votre part.</p>
              </div>
              <Link to="/dashboard/partenaire/projets-suivis" className="text-sm font-medium text-pink-600 hover:text-pink-700">Voir tout</Link>
            </div>
            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des suivis...</p>}
              {!loading && trackedProjects.slice(0, 3).map((tracked) => (
                <div key={tracked.id} className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-pink-300">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{tracked.title}</h3>
                      <p className="text-sm text-gray-600">{tracked.sector}</p>
                      <span className="mt-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                        Partenaire {getPartnerTypeLabel(tracked.partner_type)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(tracked.invested_amount)}</p>
                      <p className="text-xs text-green-600">ROI {tracked.roi}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full ${tracked.status === 'en_risque' ? 'bg-red-500' : 'bg-pink-500'}`} style={{ width: `${tracked.progress || 0}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500">{tracked.next_milestone}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Projets à explorer</h2>
                <Link to="/dashboard/partenaire/opportunites" className="text-sm font-medium text-teal-600 hover:text-teal-700">Explorer</Link>
              </div>
              <div className="space-y-4">
                {loading && <p className="text-sm text-gray-500">Chargement des opportunités...</p>}
                {!loading && openProjects.map((project) => (
                  <div key={project.id} className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-teal-300">
                    <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.title}</h3>
                        <p className="text-sm text-gray-600">{project.sector || project.category} · {project.team_size} personnes</p>
                      </div>
                      <span className="text-sm font-bold text-teal-600">{formatShortCurrency(project.funding_goal)}</span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600">{project.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/project-center/projet/${project.id}`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Voir le projet
                      </Link>
                      <button onClick={() => handleInterest(project, 'financier')} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                        Intérêt financier
                      </button>
                      <button onClick={() => handleInterest(project, 'technique')} className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
                        Intérêt technique
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Vue collaboration</h2>
                <Link to="/dashboard/partenaire/collaborations" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                  Ouvrir
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Actives</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{collaborations.filter((entry) => entry.status === 'actif').length}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">En négociation</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{collaborations.filter((entry) => entry.status === 'en_negociation').length}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
