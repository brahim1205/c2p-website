import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import GlobalSearch from '../components/GlobalSearch';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { createNotification } from '@/hooks/useCreateNotification';
import { fetchCollaborations, fetchOpenProjects, fetchTrackedProjects, type Collaboration, type ProjectRecord, type TrackedProject } from '@/lib/projectApi';
import { formatCurrency, formatShortCurrency } from '@/lib/formatters';

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
      const [trackedData, collaborationsData, openData] = await Promise.all([
        fetchTrackedProjects(user.id),
        fetchCollaborations(user.id),
        fetchOpenProjects(),
      ]);
      setTrackedProjects(trackedData);
      setCollaborations(collaborationsData);
      setOpenProjects(openData.filter((project) => !trackedData.some((tracked) => tracked.project_id === project.id)).slice(0, 4));
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
      { label: 'Projets finances', value: trackedProjects.length, icon: 'ri-hand-coin-line', color: 'bg-pink-500' },
      { label: 'Montant investi', value: formatShortCurrency(invested), icon: 'ri-money-dollar-circle-line', color: 'bg-green-500' },
      { label: 'Collaborations actives', value: collaborations.filter((collaboration) => collaboration.status === 'actif').length, icon: 'ri-team-line', color: 'bg-blue-500' },
      { label: 'Projets suivis', value: active, icon: 'ri-eye-line', color: 'bg-[#14B8A6]' },
    ];
  }, [collaborations, trackedProjects]);

  const handleInterest = async (project: ProjectRecord) => {
    if (!user?.id) return;

    try {
      const { error: trackingError } = await backendClient.from('project_tracking').insert({
        partner_id: user.id,
        project_id: project.id,
        invested_amount: 0,
        roi: 0,
        status: 'en_risque',
        last_update: new Date().toISOString(),
        next_milestone: project.next_milestone,
      });
      if (trackingError) throw new Error(trackingError.message);

      const { error: collaborationError } = await backendClient.from('project_collaborations').insert({
        partner_id: user.id,
        project_id: project.id,
        counterpart_name: project.porteur_name,
        counterpart_role: 'Porteur de projet',
        type: 'financement',
        status: 'en_negociation',
        start_date: new Date().toISOString().slice(0, 10),
        value: 0,
        deliverables: ['Premier entretien de cadrage'],
        meetings: 0,
      });
      if (collaborationError) throw new Error(collaborationError.message);

      await createNotification(
        project.owner_id,
        'Interet partenaire',
        `${user.firstName} ${user.lastName} souhaite ouvrir une discussion sur ${project.title}.`,
        'collaboration',
        '/dashboard/porteur/partenariats',
      );

      success('Interet enregistre', 'Le porteur a ete notifie et le projet a ete ajoute a vos suivis.');
      loadDashboard();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de manifester votre interet.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord Partenaire</h1>
          <p className="text-gray-600">Projets suivis, collaborations en cours et nouvelles opportunites d accompagnement.</p>
        </div>

        <GlobalSearch context="partenaire" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white mb-4`}>
                <i className={`${stat.icon} text-xl`}></i>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Mes suivis</h2>
              <Link to="/dashboard/partenaire/projets-suivis" className="text-sm font-medium text-pink-600 hover:text-pink-700">Voir tout</Link>
            </div>
            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des suivis...</p>}
              {!loading && trackedProjects.slice(0, 3).map((tracked) => (
                <div key={tracked.id} className="p-4 border border-gray-200 rounded-lg hover:border-pink-300 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{tracked.title}</h3>
                      <p className="text-sm text-gray-600">{tracked.sector}</p>
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

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Projets a explorer</h2>
              <Link to="/dashboard/partenaire/opportunites" className="text-sm font-medium text-[#14B8A6] hover:text-[#0D9488]">Explorer</Link>
            </div>
            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des opportunites...</p>}
              {!loading && openProjects.map((project) => (
                <div key={project.id} className="p-4 border border-gray-200 rounded-lg hover:border-[#14B8A6] transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <p className="text-sm text-gray-600">{project.sector || project.category} · {project.team_size} personnes</p>
                    </div>
                    <span className="text-sm font-bold text-[#14B8A6]">{formatShortCurrency(project.funding_goal)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                  <button onClick={() => handleInterest(project)} className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]">
                    Manifester mon interet
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Opportunites', icon: 'ri-search-line', link: '/dashboard/partenaire/opportunites', tone: 'text-[#14B8A6] bg-[#14B8A6]/10' },
              { label: 'Projets suivis', icon: 'ri-eye-line', link: '/dashboard/partenaire/projets-suivis', tone: 'text-blue-600 bg-blue-100' },
              { label: 'Collaborations', icon: 'ri-team-line', link: '/dashboard/partenaire/collaborations', tone: 'text-green-600 bg-green-100' },
              { label: 'Mes investissements', icon: 'ri-wallet-line', link: '/dashboard/paiements', tone: 'text-pink-600 bg-pink-100' },
              { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', tone: 'text-yellow-600 bg-yellow-100' },
            ].map((action) => (
              <Link key={action.link} to={action.link} className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#14B8A6]/40 transition-all text-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${action.tone}`}>
                  <i className={`${action.icon} text-xl`}></i>
                </div>
                <p className="font-medium text-gray-900 text-sm">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
