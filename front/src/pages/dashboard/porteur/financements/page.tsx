import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchFundingRoundsForOwner, fetchOwnerProjects, type FundingRound, type ProjectRecord } from '@/lib/projectApi';
import { formatCurrency, formatShortCurrency } from '@/lib/formatters';

export default function PorteurFinancementsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRound, setNewRound] = useState({
    projectId: '',
    type: 'amorcage',
    targetAmount: '',
    deadline: '',
    description: '',
  });

  const loadRounds = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [projectsData, roundsData] = await Promise.all([
        fetchOwnerProjects(user.id),
        fetchFundingRoundsForOwner(user.id),
      ]);
      setProjects(projectsData);
      setRounds(roundsData);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les levees de fonds.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  const filteredRounds = useMemo(() => {
    return rounds.filter((round) => {
      const matchesSearch = !search || (round.project_title || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'tous' || round.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rounds, search, statusFilter]);

  const stats = useMemo(() => {
    const totalTarget = rounds.reduce((sum, round) => sum + Number(round.target_amount || 0), 0);
    const totalRaised = rounds.reduce((sum, round) => sum + Number(round.raised_amount || 0), 0);
    return {
      totalTarget,
      totalRaised,
      successRate: totalTarget > 0 ? Math.round((totalRaised / totalTarget) * 100) : 0,
      investors: rounds.reduce((sum, round) => sum + Number(round.investors || 0), 0),
    };
  }, [rounds]);

  const handleCreateFunding = async () => {
    if (!newRound.projectId || !newRound.targetAmount || !newRound.deadline) {
      error('Champs incomplets', 'Renseignez le projet, le montant cible et la date limite.');
      return;
    }

    try {
      const { error: apiError } = await backendClient.from('project_funding_rounds').insert({
        project_id: Number(newRound.projectId),
        type: newRound.type,
        target_amount: Number(newRound.targetAmount),
        raised_amount: 0,
        deadline: newRound.deadline,
        start_date: new Date().toISOString().slice(0, 10),
        status: 'en_cours',
        description: newRound.description,
        pitch_deck: false,
        business_plan: false,
      });
      if (apiError) throw new Error(apiError.message);
      success('Levee creee', 'La nouvelle levee de fonds est visible dans votre portefeuille projet.');
      setShowCreateModal(false);
      setNewRound({ projectId: '', type: 'amorcage', targetAmount: '', deadline: '', description: '' });
      loadRounds();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de creer la levee de fonds.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Financements' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes financements</h1>
          <p className="text-gray-600">Vue consolidee des levees en cours, des montants leves et des investisseur(s).</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{formatShortCurrency(stats.totalTarget)}</p><p className="text-sm text-gray-600">Objectif total</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{formatShortCurrency(stats.totalRaised)}</p><p className="text-sm text-gray-600">Montant leve</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{stats.successRate}%</p><p className="text-sm text-gray-600">Taux d atteinte</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-purple-600">{stats.investors}</p><p className="text-sm text-gray-600">Investisseur(s)</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Rechercher une levee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            <div className="flex gap-2 flex-wrap">
              {['tous', 'en_cours', 'termine'].map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm font-medium ${statusFilter === status ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {status === 'tous' ? 'Tous' : status}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCreateModal(true)} className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Nouvelle levee
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Chargement des levees...</p>}
          {!loading && filteredRounds.map((round) => (
            <div key={round.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 transition-colors">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{round.project_title}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{round.type}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${round.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {round.status === 'termine' ? 'Terminee' : 'En cours'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Echeance : {round.deadline}</span>
                  <Link to={`/dashboard/porteur/financements/${round.id}`} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                    Details
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-gray-500">Objectif</p><p className="font-semibold text-gray-900">{formatCurrency(round.target_amount)}</p></div>
                <div><p className="text-xs text-gray-500">Leve</p><p className="font-semibold text-gray-900">{formatCurrency(round.raised_amount)}</p></div>
                <div><p className="text-xs text-gray-500">Investisseurs</p><p className="font-semibold text-gray-900">{round.investors || 0}</p></div>
                <div><p className="text-xs text-gray-500">Prochain jalon</p><p className="font-semibold text-gray-900">{round.next_milestone || '-'}</p></div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${round.progress_percent || 0}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Nouvelle levee de fonds</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projet</label>
                <select value={newRound.projectId} onChange={(e) => setNewRound((prev) => ({ ...prev, projectId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20">
                  <option value="">Selectionnez un projet</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={newRound.type} onChange={(e) => setNewRound((prev) => ({ ...prev, type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20">
                    <option value="amorcage">Amorcage</option>
                    <option value="subvention">Subvention</option>
                    <option value="concours">Concours</option>
                    <option value="serie_a">Serie A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objectif</label>
                  <input type="number" value={newRound.targetAmount} onChange={(e) => setNewRound((prev) => ({ ...prev, targetAmount: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                <input type="date" value={newRound.deadline} onChange={(e) => setNewRound((prev) => ({ ...prev, deadline: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={4} value={newRound.description} onChange={(e) => setNewRound((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleCreateFunding} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Creer</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
