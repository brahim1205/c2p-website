import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import {
  createOwnerFundingRound,
  fetchFundingRoundsForOwner,
  fetchOwnerProjectFundingCommitments,
  fetchOwnerProjects,
  type FundingRound,
  type ProjectFundingCommitment,
  type ProjectRecord,
} from '@/lib/projectApi';
import { formatCurrency, formatShortCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';
import CreateFundingRoundModal, { type FundingRoundDraft } from './CreateFundingRoundModal';

export default function PorteurFinancementsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRound, setNewRound] = useState<FundingRoundDraft>({
    projectId: '',
    type: 'amorcage',
    targetAmount: '',
    deadline: '',
    description: '',
  });
  const subscriptionGate = gateFor('project_funding_manage');

  const fundingQuery = useQuery({
    queryKey: queryKeys.porteur.funding(user?.id),
    queryFn: async () => {
      const [projectsData, roundsData, commitmentsData] = await Promise.all([
        fetchOwnerProjects(user!.id),
        fetchFundingRoundsForOwner(user!.id),
        fetchOwnerProjectFundingCommitments(),
      ]);
      return { projects: projectsData, rounds: roundsData, commitments: commitmentsData };
    },
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (fundingQuery.isError) {
      console.error(fundingQuery.error);
      error('Erreur', 'Impossible de charger les levees de fonds.');
    }
  }, [error, fundingQuery.error, fundingQuery.isError]);

  const loading = fundingQuery.isLoading;
  const projects: ProjectRecord[] = useMemo(() => fundingQuery.data?.projects ?? [], [fundingQuery.data?.projects]);
  const rounds: FundingRound[] = useMemo(() => fundingQuery.data?.rounds ?? [], [fundingQuery.data?.rounds]);
  const commitments: ProjectFundingCommitment[] = useMemo(() => fundingQuery.data?.commitments ?? [], [fundingQuery.data?.commitments]);

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

  const formatStatus = (status: string) => {
    if (status === 'termine') return 'Terminee';
    if (status === 'en_cours') return 'En cours';
    return status || 'Non renseigne';
  };

  const getProgress = (round: FundingRound) => {
    if (round.progress_percent !== undefined && round.progress_percent !== null) {
      return Math.max(0, Math.min(100, Number(round.progress_percent)));
    }
    if (!round.target_amount) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(round.raised_amount || 0) / Number(round.target_amount)) * 100)));
  };

  const handleCreateFunding = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!newRound.projectId || !newRound.targetAmount || !newRound.deadline) {
      error('Champs incomplets', 'Renseignez le projet, le montant cible et la date limite.');
      return;
    }
    if (!user?.id) return;

    try {
      await createOwnerFundingRound(user.id, {
        projectId: Number(newRound.projectId),
        type: newRound.type,
        targetAmount: Number(newRound.targetAmount),
        deadline: newRound.deadline,
        description: newRound.description,
      });
      success('Levee creee', 'La nouvelle levee de fonds est visible dans votre portefeuille projet.');
      setShowCreateModal(false);
      setNewRound({ projectId: '', type: 'amorcage', targetAmount: '', deadline: '', description: '' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.porteur.root(user.id) });
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de creer la levee de fonds.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Financements' }]} />
        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes financements</h1>
          <p className="text-gray-600">Suivez les demandes de financement, les objectifs, les montants leves et les investisseurs rattaches a vos projets.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{formatShortCurrency(stats.totalTarget)}</p><p className="text-sm text-gray-600">Objectif total</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{formatShortCurrency(stats.totalRaised)}</p><p className="text-sm text-gray-600">Montant leve</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{stats.successRate}%</p><p className="text-sm text-gray-600">Taux d atteinte</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-purple-600">{stats.investors}</p><p className="text-sm text-gray-600">Investisseur(s)</p></div>
        </div>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-gray-900">Souscriptions partenaires reçues</h2><p className="text-sm text-gray-500">C2P contrôle le contrat et le transfert avant activation.</p></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{commitments.length}</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {commitments.slice(0, 6).map((commitment) => (
              <article key={commitment.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-gray-900">{commitment.project_title}</h3><p className="text-sm text-gray-500">{commitment.partner_name ?? commitment.partner_id} · badge {commitment.partner_badge}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{commitment.status.replaceAll('_', ' ')}</span></div>
                <div className="mt-3 flex items-center justify-between"><strong className="text-emerald-700">{formatCurrency(commitment.amount)}</strong><span className="text-sm text-gray-500">{commitment.duration_months} mois</span></div>
              </article>
            ))}
            {!loading && commitments.length === 0 ? <p className="text-sm text-gray-500">Aucune souscription partenaire reçue.</p> : null}
          </div>
        </section>

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
            <button
              onClick={() => {
                if (!subscriptionGate.allowed) {
                  error(subscriptionGate.title, subscriptionGate.message);
                  return;
                }
                setShowCreateModal(true);
              }}
              disabled={!subscriptionGate.allowed}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Demander un financement
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Chargement des levees...</p>}
          {!loading && filteredRounds.map((round) => {
            const progress = getProgress(round);
            return (
            <div key={round.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 transition-colors">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{round.project_title}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{round.type}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${round.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {formatStatus(round.status)}
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

              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          );
          })}
          {!loading && filteredRounds.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                <i className="ri-funds-line text-2xl"></i>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Aucun financement trouve</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
                Creez une demande pour que C2P cadre l'objectif, les documents attendus et les prochaines etapes avec les partenaires financiers.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!subscriptionGate.allowed) {
                    error(subscriptionGate.title, subscriptionGate.message);
                    return;
                  }
                  setShowCreateModal(true);
                }}
                disabled={!subscriptionGate.allowed || projects.length === 0}
                className="mt-5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Demander un financement
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateFundingRoundModal
          projects={projects}
          newRound={newRound}
          setNewRound={setNewRound}
          subscriptionAllowed={subscriptionGate.allowed}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateFunding}
        />
      )}
    </DashboardLayout>
  );
}
