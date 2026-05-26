import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchCollaborations, type Collaboration, updatePartnerCollaboration } from '@/lib/projectApi';
import { formatCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';

function getPartnerTypeLabel(type: string | null | undefined) {
  return type === 'technique' ? 'Technique' : 'Financier';
}

export default function PartenaireCollaborationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  const collaborationsQuery = useQuery({
    queryKey: queryKeys.partenaire.collaborations(user?.id),
    queryFn: () => fetchCollaborations(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (collaborationsQuery.isError) {
      console.error(collaborationsQuery.error);
      error('Erreur', 'Impossible de charger les collaborations.');
    }
  }, [collaborationsQuery.error, collaborationsQuery.isError, error]);

  const loading = collaborationsQuery.isLoading;
  const collaborations: Collaboration[] = useMemo(() => collaborationsQuery.data ?? [], [collaborationsQuery.data]);

  const filteredCollaborations = useMemo(() => {
    return collaborations.filter((collaboration) => {
      const matchesSearch = !search || `${collaboration.project_title} ${collaboration.counterpart_name}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'tous' || collaboration.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [collaborations, search, statusFilter]);

  const updateCollaboration = async (collaboration: Collaboration, patch: Partial<Collaboration>) => {
    if (!user?.id) return;
    try {
      await updatePartnerCollaboration(user.id, collaboration.id, patch);
      success('Collaboration mise a jour', 'La collaboration a ete actualisee.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.partenaire.root(user.id) });
    } catch (err) {
      console.error(err);
      error('Erreur', 'La collaboration n a pas pu etre modifiee.');
    }
  };

  const engagedAmount = collaborations.reduce((sum, collaboration) => sum + Number(collaboration.value || 0), 0);
  const canSchedulePoint = (collaboration: Collaboration) => collaboration.status !== 'termine';
  const canCloseCollaboration = (collaboration: Collaboration) => collaboration.status !== 'termine';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire', path: '/dashboard/partenaire' }, { label: 'Collaborations' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes collaborations</h1>
          <p className="text-gray-600">Suivi des accords actifs, des negociations ouvertes et des livrables attendus.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{collaborations.length}</p><p className="text-sm text-gray-600">Collaborations</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{collaborations.filter((item) => item.status === 'actif').length}</p><p className="text-sm text-gray-600">Actives</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-orange-600">{collaborations.filter((item) => item.status === 'en_negociation').length}</p><p className="text-sm text-gray-600">En negociation</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{formatCurrency(engagedAmount)}</p><p className="text-sm text-gray-600">Engagement total</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une collaboration..." className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20" />
            <div className="flex gap-2">
              {['tous', 'actif', 'en_negociation', 'termine'].map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm font-medium ${statusFilter === status ? 'bg-[#5fa6f3] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {status === 'tous' ? 'Tous' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Chargement des collaborations...</p>}
          {!loading && filteredCollaborations.map((collaboration) => (
            <div key={collaboration.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#5fa6f3] transition-colors">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{collaboration.project_title}</h3>
                  <p className="text-sm text-gray-500">{collaboration.counterpart_name} · {collaboration.counterpart_role}</p>
                  <span className="mt-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                    Partenaire {getPartnerTypeLabel(collaboration.partner_type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${collaboration.type === 'financement' ? 'bg-green-100 text-green-700' : collaboration.type === 'mentorat' ? 'bg-blue-100 text-blue-700' : collaboration.type === 'technique' ? 'bg-[#5fa6f3]/10 text-[#5fa6f3]' : 'bg-yellow-100 text-yellow-700'}`}>
                    {collaboration.type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${collaboration.status === 'actif' ? 'bg-blue-100 text-blue-700' : collaboration.status === 'en_negociation' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {collaboration.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-gray-500">Valeur</p><p className="font-semibold text-gray-900">{formatCurrency(collaboration.value)}</p></div>
                <div><p className="text-xs text-gray-500">Debut</p><p className="font-semibold text-gray-900">{collaboration.start_date}</p></div>
                <div><p className="text-xs text-gray-500">Reunions</p><p className="font-semibold text-gray-900">{collaboration.meetings}</p></div>
                <div><p className="text-xs text-gray-500">Fin</p><p className="font-semibold text-gray-900">{collaboration.end_date || 'En cours'}</p></div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {collaboration.deliverables.map((deliverable) => (
                  <span key={deliverable} className="px-2.5 py-1 rounded-md bg-gray-100 text-xs text-gray-700">{deliverable}</span>
                ))}
              </div>

              <div className="flex gap-2">
                <Link to={`/dashboard/partenaire/projets-suivis/${collaboration.project_id}`} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Voir le projet
                </Link>
                <button
                  onClick={() => updateCollaboration(collaboration, { meetings: collaboration.meetings + 1 })}
                  disabled={!canSchedulePoint(collaboration)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Programmer un point
                </button>
                {canCloseCollaboration(collaboration) && (
                  <button onClick={() => updateCollaboration(collaboration, { status: 'termine', end_date: new Date().toISOString().slice(0, 10) })} className="px-4 py-2 rounded-lg bg-[#5fa6f3] text-white text-sm font-medium hover:bg-[#27346b]">
                    Marquer terminee
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
