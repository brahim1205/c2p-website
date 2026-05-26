import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchTrackedProjects, type TrackedProject } from '@/lib/projectApi';
import { formatCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';

function getPartnerTypeLabel(type: string | null | undefined) {
  return type === 'technique' ? 'Technique' : 'Financier';
}

export default function PartenaireProjetsSuivisPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  const trackedProjectsQuery = useQuery({
    queryKey: queryKeys.partenaire.trackedProjects(user?.id),
    queryFn: () => fetchTrackedProjects(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (trackedProjectsQuery.isError) {
      console.error(trackedProjectsQuery.error);
      error('Erreur', 'Impossible de charger les projets suivis.');
    }
  }, [error, trackedProjectsQuery.error, trackedProjectsQuery.isError]);

  const loading = trackedProjectsQuery.isLoading;
  const projects: TrackedProject[] = useMemo(() => trackedProjectsQuery.data ?? [], [trackedProjectsQuery.data]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = !search || `${project.title} ${project.sector}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'tous' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      actif: 'bg-blue-100 text-blue-700',
      termine: 'bg-green-100 text-green-700',
      en_risque: 'bg-red-100 text-red-700',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire', path: '/dashboard/partenaire' }, { label: 'Projets suivis' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Projets suivis</h1>
          <p className="text-gray-600">Vue portefeuille des projets actuellement accompagnés ou finances.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{projects.length}</p><p className="text-sm text-gray-600">Projets suivis</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{projects.filter((project) => project.status === 'actif').length}</p><p className="text-sm text-gray-600">Actifs</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{projects.filter((project) => project.progress === 100).length}</p><p className="text-sm text-gray-600">Acheves</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-red-600">{projects.filter((project) => project.status === 'en_risque').length}</p><p className="text-sm text-gray-600">En risque</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un projet..." className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20" />
            <div className="flex gap-2">
              {['tous', 'actif', 'en_risque'].map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm font-medium ${statusFilter === status ? 'bg-[#5fa6f3] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {status === 'tous' ? 'Tous' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Chargement du portefeuille...</p>}
          {!loading && filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#5fa6f3] transition-colors">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{project.title}</h3>
                  <p className="text-sm text-gray-500">{project.sector}</p>
                  <span className="mt-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                    Partenaire {getPartnerTypeLabel(project.partner_type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(project.status)}
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">ROI {project.roi}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-gray-500">Investissement</p><p className="font-semibold text-gray-900">{formatCurrency(project.invested_amount)}</p></div>
                <div><p className="text-xs text-gray-500">Avancement</p><p className="font-semibold text-gray-900">{project.progress}%</p></div>
                <div><p className="text-xs text-gray-500">Documents</p><p className="font-semibold text-gray-900">{project.documents || 0}</p></div>
                <div><p className="text-xs text-gray-500">Rapports</p><p className="font-semibold text-gray-900">{project.reports || 0}</p></div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className={`h-2 rounded-full ${project.status === 'en_risque' ? 'bg-red-500' : 'bg-[#5fa6f3]'}`} style={{ width: `${project.progress || 0}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{project.next_milestone}</span>
                <Link to={`/dashboard/partenaire/projets-suivis/${project.project_id}`} className="text-[#5fa6f3] font-medium hover:text-[#27346b]">
                  Voir le detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
