import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { fetchOwnerProjects, type ProjectRecord, updateOwnerProject } from '@/lib/projectApi';
import { formatCurrency, formatShortCurrency } from '@/lib/formatters';

export default function PorteurMesProjetsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: 'pre-incubation' });
  const subscriptionGate = gateFor('project_manage');

  const loadProjects = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setProjects(await fetchOwnerProjects(user.id));
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger vos projets.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const query = search.toLowerCase();
      const matchesSearch = !query || project.title.toLowerCase().includes(query) || project.category.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'tous' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const openEdit = (project: ProjectRecord) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setSelectedProject(project);
    setEditForm({
      title: project.title,
      description: project.description || '',
      status: project.status,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedProject || !user?.id) return;
    try {
      await updateOwnerProject(user.id, selectedProject.id, editForm);
      success('Projet mis a jour', 'Les modifications ont ete enregistrees.');
      setShowEditModal(false);
      setSelectedProject(null);
      loadProjects();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Le projet n a pas pu etre mis a jour.');
    }
  };

  const statusCounts = {
    total: projects.length,
    incubation: projects.filter((project) => project.status === 'incubation').length,
    financement: projects.filter((project) => project.funding > 0).length,
    termine: projects.filter((project) => project.status === 'termine').length,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pre-incubation': 'bg-amber-100 text-amber-700',
      incubation: 'bg-blue-100 text-blue-700',
      acceleration: 'bg-green-100 text-green-700',
      termine: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      'pre-incubation': 'Pre-incubation',
      incubation: 'Incubation',
      acceleration: 'Acceleration',
      termine: 'Termine',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Mes projets' }]} />
        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes projets</h1>
          <p className="text-gray-600">Suivi complet des projets, de l avancement et du besoin de financement.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p><p className="text-sm text-gray-600">Projets soumis</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{statusCounts.incubation}</p><p className="text-sm text-gray-600">En incubation</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-purple-600">{statusCounts.financement}</p><p className="text-sm text-gray-600">Avec levee active</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{statusCounts.termine}</p><p className="text-sm text-gray-600">Termines</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Rechercher un projet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
            />
            <div className="flex gap-2 flex-wrap">
              {['tous', 'pre-incubation', 'incubation', 'acceleration', 'termine'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    statusFilter === status ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'tous' ? 'Tous' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && <p className="text-sm text-gray-500">Chargement des projets...</p>}
          {!loading && filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-green-300 transition-colors">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-500">{project.sector || project.category} · {project.team_size} personnes</p>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.description}</p>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Avancement</span>
                    <span className="font-medium text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-600">Financement</span>
                  <span className="font-medium text-gray-900">{formatCurrency(project.funding)} / {formatShortCurrency(project.funding_goal)}</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(project)} disabled={!subscriptionGate.allowed} className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                    Modifier
                  </button>
                  <Link to={`/dashboard/porteur/mes-projets/${project.id}`} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 text-center">
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showEditModal && selectedProject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Modifier le projet</h3>
                <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100">
                  <i className="ri-close-line text-xl text-gray-500"></i>
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label htmlFor="porteur-project-title" className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input
                    id="porteur-project-title"
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="porteur-project-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="porteur-project-description"
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="porteur-project-status" className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    id="porteur-project-status"
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="pre-incubation">Pre-incubation</option>
                    <option value="incubation">Incubation</option>
                    <option value="acceleration">Acceleration</option>
                    <option value="termine">Termine</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={!subscriptionGate.allowed} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
