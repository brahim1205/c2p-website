import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchCollaborations, type Collaboration } from '@/lib/projectApi';
import { formatCurrency } from '@/lib/formatters';

export default function PartenaireCollaborationsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);

  const loadCollaborations = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCollaborations(await fetchCollaborations(user.id));
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les collaborations.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  const filteredCollaborations = useMemo(() => {
    return collaborations.filter((collaboration) => {
      const matchesSearch = !search || `${collaboration.project_title} ${collaboration.counterpart_name}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'tous' || collaboration.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [collaborations, search, statusFilter]);

  const updateCollaboration = async (collaboration: Collaboration, patch: Partial<Collaboration>) => {
    try {
      const { error: apiError } = await backendClient.from('project_collaborations').update(patch).eq('id', collaboration.id);
      if (apiError) throw new Error(apiError.message);
      success('Collaboration mise a jour', 'La collaboration a ete actualisee.');
      loadCollaborations();
    } catch (err) {
      console.error(err);
      error('Erreur', 'La collaboration n a pas pu etre modifiee.');
    }
  };

  const engagedAmount = collaborations.reduce((sum, collaboration) => sum + Number(collaboration.value || 0), 0);

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
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une collaboration..." className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20" />
            <div className="flex gap-2">
              {['tous', 'actif', 'en_negociation', 'termine'].map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm font-medium ${statusFilter === status ? 'bg-[#14B8A6] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {status === 'tous' ? 'Tous' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Chargement des collaborations...</p>}
          {!loading && filteredCollaborations.map((collaboration) => (
            <div key={collaboration.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#14B8A6] transition-colors">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{collaboration.project_title}</h3>
                  <p className="text-sm text-gray-500">{collaboration.counterpart_name} · {collaboration.counterpart_role}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${collaboration.type === 'financement' ? 'bg-green-100 text-green-700' : collaboration.type === 'mentorat' ? 'bg-blue-100 text-blue-700' : collaboration.type === 'technique' ? 'bg-[#14B8A6]/10 text-[#14B8A6]' : 'bg-yellow-100 text-yellow-700'}`}>
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
                <button onClick={() => updateCollaboration(collaboration, { meetings: collaboration.meetings + 1 })} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Programmer un point
                </button>
                {collaboration.status !== 'termine' && (
                  <button onClick={() => updateCollaboration(collaboration, { status: 'termine', end_date: new Date().toISOString().slice(0, 10) })} className="px-4 py-2 rounded-lg bg-[#14B8A6] text-white text-sm font-medium hover:bg-[#0D9488]">
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
