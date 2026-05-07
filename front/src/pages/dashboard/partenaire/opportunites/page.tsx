import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { createNotification } from '@/hooks/useCreateNotification';
import { fetchOpenProjects, fetchTrackedProjects, type ProjectRecord } from '@/lib/projectApi';
import { formatShortCurrency } from '@/lib/formatters';

export default function PartenaireOpportunitesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('tous');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  const loadOpportunities = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [openProjects, tracked] = await Promise.all([
        fetchOpenProjects(),
        fetchTrackedProjects(user.id),
      ]);
      setProjects(openProjects.filter((project) => !tracked.some((item) => item.project_id === project.id)));
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les opportunites.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = !search || [project.title, project.description || '', project.porteur_name].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesSector = sectorFilter === 'tous' || (project.sector || project.category) === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [projects, search, sectorFilter]);

  const sectors = ['tous', ...Array.from(new Set(projects.map((project) => project.sector || project.category)))];

  const handleInterest = async (project: ProjectRecord) => {
    if (!user?.id) return;
    try {
      const [{ error: trackingError }, { error: collaborationError }] = await Promise.all([
        backendClient.from('project_tracking').insert({
          partner_id: user.id,
          project_id: project.id,
          invested_amount: 0,
          roi: 0,
          status: 'en_risque',
          last_update: new Date().toISOString(),
          next_milestone: project.next_milestone,
        }),
        backendClient.from('project_collaborations').insert({
          partner_id: user.id,
          project_id: project.id,
          counterpart_name: project.porteur_name,
          counterpart_role: 'Porteur de projet',
          type: 'financement',
          status: 'en_negociation',
          start_date: new Date().toISOString().slice(0, 10),
          value: 0,
          deliverables: ['Prise de contact initiale'],
          meetings: 0,
        }),
      ]);

      if (trackingError) throw new Error(trackingError.message);
      if (collaborationError) throw new Error(collaborationError.message);

      await createNotification(
        project.owner_id,
        'Interet partenaire',
        `${user.firstName} ${user.lastName} souhaite etudier le projet ${project.title}.`,
        'collaboration',
        '/dashboard/porteur/partenariats',
      );
      success('Interet manifeste', 'Le projet a ete ajoute a vos suivis.');
      loadOpportunities();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible d enregistrer votre interet.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire', path: '/dashboard/partenaire' }, { label: 'Opportunites' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Opportunites de collaboration</h1>
          <p className="text-gray-600">Selection dynamique des projets encore ouverts a l accompagnement ou au financement.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{projects.length}</p><p className="text-sm text-gray-600">Projets disponibles</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{projects.filter((project) => project.progress >= 50).length}</p><p className="text-sm text-gray-600">Avancement superieur a 50%</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-[#14B8A6]">{formatShortCurrency(projects.reduce((sum, project) => sum + project.funding_goal, 0))}</p><p className="text-sm text-gray-600">Recherche totale</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{projects.filter((project) => project.status === 'incubation').length}</p><p className="text-sm text-gray-600">En incubation</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un projet..." className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20" />
            <div className="flex gap-2 flex-wrap">
              {sectors.map((sector) => (
                <button key={sector} onClick={() => setSectorFilter(sector)} className={`px-3 py-2 rounded-lg text-sm font-medium ${sectorFilter === sector ? 'bg-[#14B8A6] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {sector === 'tous' ? 'Tous' : sector}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && <p className="text-sm text-gray-500">Chargement des opportunites...</p>}
          {!loading && filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#14B8A6] transition-colors">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-500">{project.sector || project.category} · {project.location}</p>
                  </div>
                  <span className="rounded-lg bg-[#14B8A6]/10 px-2.5 py-1 text-sm font-bold text-[#14B8A6]">{project.progress}%</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Recherche</p><p className="font-semibold text-gray-900">{formatShortCurrency(project.funding_goal)}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Equipe</p><p className="font-semibold text-gray-900">{project.team_size}</p></div>
                </div>
                <button onClick={() => handleInterest(project)} className="w-full px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]">
                  Manifester mon interet
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
