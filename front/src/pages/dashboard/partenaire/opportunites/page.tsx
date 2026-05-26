import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { expressPartnerInterestAndNotify, fetchOpenProjects, fetchTrackedProjects, type PartnerType, type ProjectRecord } from '@/lib/projectApi';
import { formatShortCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';

export default function PartenaireOpportunitesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('tous');

  const opportunitiesQuery = useQuery({
    queryKey: queryKeys.partenaire.opportunities(user?.id),
    queryFn: async () => {
      const [openProjects, tracked] = await Promise.all([
        fetchOpenProjects(),
        fetchTrackedProjects(user!.id),
      ]);
      return openProjects.filter((project) => !tracked.some((item) => item.project_id === project.id));
    },
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (opportunitiesQuery.isError) {
      console.error(opportunitiesQuery.error);
      error('Erreur', 'Impossible de charger les opportunites.');
    }
  }, [error, opportunitiesQuery.error, opportunitiesQuery.isError]);

  const loading = opportunitiesQuery.isLoading;
  const projects: ProjectRecord[] = useMemo(() => opportunitiesQuery.data ?? [], [opportunitiesQuery.data]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = !search || [project.title, project.description || '', project.porteur_name].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesSector = sectorFilter === 'tous' || (project.sector || project.category) === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [projects, search, sectorFilter]);

  const sectors = ['tous', ...Array.from(new Set(projects.map((project) => project.sector || project.category)))];

  const handleInterest = async (project: ProjectRecord, partnerType: PartnerType) => {
    if (!user?.id) return;
    try {
      const result = await expressPartnerInterestAndNotify({
        partner: user,
        project,
        partnerType,
        ownerMessage: `${user.firstName} ${user.lastName} souhaite etudier ${project.title} comme partenaire ${partnerType === 'technique' ? 'technique' : 'financier'}.`,
      });

      success(
        result.alreadyTracked ? 'Suivi deja actif' : 'Interet manifeste',
        result.alreadyTracked ? 'Ce projet est deja dans vos suivis.' : 'L equipe C2P a ete notifiee et le projet a ete ajoute a vos suivis.',
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.partenaire.root(user.id) });
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
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-[#5fa6f3]">{formatShortCurrency(projects.reduce((sum, project) => sum + project.funding_goal, 0))}</p><p className="text-sm text-gray-600">Recherche totale</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{projects.filter((project) => project.status === 'incubation').length}</p><p className="text-sm text-gray-600">En incubation</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un projet..." className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20" />
            <div className="flex gap-2 flex-wrap">
              {sectors.map((sector) => (
                <button key={sector} onClick={() => setSectorFilter(sector)} className={`px-3 py-2 rounded-lg text-sm font-medium ${sectorFilter === sector ? 'bg-[#5fa6f3] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {sector === 'tous' ? 'Tous' : sector}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && <p className="text-sm text-gray-500">Chargement des opportunites...</p>}
          {!loading && filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#5fa6f3] transition-colors">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-500">{project.sector || project.category} · {project.location}</p>
                  </div>
                  <span className="rounded-lg bg-[#5fa6f3]/10 px-2.5 py-1 text-sm font-bold text-[#5fa6f3]">{project.progress}%</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Recherche</p><p className="font-semibold text-gray-900">{formatShortCurrency(project.funding_goal)}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Equipe</p><p className="font-semibold text-gray-900">{project.team_size}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/project-center/projet/${project.id}`} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Voir le detail
                  </Link>
                  <button onClick={() => handleInterest(project, 'financier')} className="flex-1 px-4 py-2 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b]">
                    Interet financier
                  </button>
                  <button onClick={() => handleInterest(project, 'technique')} className="flex-1 px-4 py-2 border border-[#5fa6f3]/25 text-[#27346b] rounded-lg text-sm font-medium hover:bg-[#5fa6f3]/5">
                    Interet technique
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
