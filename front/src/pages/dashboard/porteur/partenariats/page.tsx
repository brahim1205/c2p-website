import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { contactOwnerPartnership, fetchPartnershipsForOwner, type ProjectPartnership } from '@/lib/projectApi';
import { queryKeys } from '@/lib/queryKeys';

export default function PorteurPartenariatsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [selectedPartner, setSelectedPartner] = useState<ProjectPartnership | null>(null);
  const [previewPartner, setPreviewPartner] = useState<ProjectPartnership | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [message, setMessage] = useState('');

  const partnershipsQuery = useQuery({
    queryKey: queryKeys.porteur.partnerships(user?.id),
    queryFn: () => fetchPartnershipsForOwner(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (partnershipsQuery.isError) {
      console.error(partnershipsQuery.error);
      error('Erreur', 'Impossible de charger vos partenariats.');
    }
  }, [error, partnershipsQuery.error, partnershipsQuery.isError]);

  const loading = partnershipsQuery.isLoading;
  const partners: ProjectPartnership[] = useMemo(() => partnershipsQuery.data ?? [], [partnershipsQuery.data]);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesSearch = !search || partner.name.toLowerCase().includes(search.toLowerCase()) || partner.role.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'tous' || partner.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [partners, search, typeFilter]);

  const handleContact = async () => {
    if (!selectedPartner) return;

    try {
      const result = await contactOwnerPartnership({
        counterpartUserId: selectedPartner.counterpart_user_id,
        counterpartName: selectedPartner.name,
        projectTitle: selectedPartner.project_title,
        message,
      });
      if (!result.delivered) {
        error('Indisponible', 'La demande n a pas pu etre transmise a C2P.');
        return;
      }
      success('Message envoye', 'Votre demande a ete transmise a l equipe C2P.');
      setMessage('');
      setShowContactModal(false);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Le message n a pas pu etre envoye.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Partenariats' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes partenariats</h1>
          <p className="text-gray-600">Mentors, partenaires techniques et soutiens financiers rattaches a vos projets.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{partners.length}</p><p className="text-sm text-gray-600">Relations actives</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{partners.filter((partner) => partner.type === 'mentor').length}</p><p className="text-sm text-gray-600">Mentors</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{partners.filter((partner) => partner.type === 'financier').length}</p><p className="text-sm text-gray-600">Financiers</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-[#5fa6f3]">{partners.filter((partner) => partner.type === 'technique').length}</p><p className="text-sm text-gray-600">Techniques</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Rechercher un partenaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            <div className="flex gap-2 flex-wrap">
              {['tous', 'mentor', 'technique', 'financier'].map((type) => (
                <button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-2 rounded-lg text-sm font-medium ${typeFilter === type ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {type === 'tous' ? 'Tous' : type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading && <p className="text-sm text-gray-500">Chargement des partenaires...</p>}
          {!loading && filteredPartners.map((partner) => (
            <div
              key={partner.id}
              role="group"
              tabIndex={0}
              aria-label={`Apercu du partenaire ${partner.name}`}
              onClick={() => setPreviewPartner(partner)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setPreviewPartner(partner);
                }
              }}
              className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            >
              <div className="flex items-start gap-4 mb-4">
                <img src={partner.avatar} alt={partner.name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{partner.name}</h3>
                  <p className="text-sm text-gray-500">{partner.role}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${partner.type === 'mentor' ? 'bg-blue-100 text-blue-700' : partner.type === 'financier' ? 'bg-green-100 text-green-700' : 'bg-[#5fa6f3]/10 text-[#5fa6f3]'}`}>
                      {partner.type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${partner.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {partner.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Expertise</p>
                <div className="flex flex-wrap gap-1.5">
                  {partner.expertise.map((expertise) => (
                    <span key={expertise} className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">{expertise}</span>
                  ))}
                </div>
              </div>

              <div className="mt-auto mb-4 flex items-center justify-between gap-3 text-sm text-gray-600">
                <span className="min-w-0 truncate">Projet: {partner.project_title}</span>
                <span className="shrink-0">{partner.last_activity}</span>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedPartner(partner);
                  setShowContactModal(true);
                }}
                className="w-full px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Demander une action C2P
              </button>
            </div>
          ))}
        </div>
      </div>

      {previewPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <img src={previewPartner.avatar} alt={previewPartner.name} className="h-20 w-20 rounded-2xl object-cover" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Profil partenaire</p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900">{previewPartner.name}</h3>
                  <p className="mt-1 text-gray-600">{previewPartner.role}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${previewPartner.type === 'mentor' ? 'bg-blue-100 text-blue-700' : previewPartner.type === 'financier' ? 'bg-green-100 text-green-700' : 'bg-[#5fa6f3]/10 text-[#5fa6f3]'}`}>
                      {previewPartner.type}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${previewPartner.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {previewPartner.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPartner(null)}
                aria-label="Fermer l'aperçu du partenaire"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Projet rattache</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{previewPartner.project_title || 'Projet non renseigne'}</p>
                <p className="mt-1 text-sm text-gray-500">Derniere activite : {previewPartner.last_activity}</p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Relation</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {previewPartner.type === 'financier' ? 'Partenaire financier' : previewPartner.type === 'mentor' ? 'Mentor' : 'Partenaire technique'}
                </p>
                <p className="mt-1 text-sm text-gray-500">Suivi coordonne par C2P.</p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expertise</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewPartner.expertise.map((expertise) => (
                    <span key={expertise} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                      {expertise}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-3 border-t border-gray-200 bg-gray-50 p-5 sm:flex-row">
              <button
                type="button"
                onClick={() => setPreviewPartner(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPartner(previewPartner);
                  setPreviewPartner(null);
                  setShowContactModal(true);
                }}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Demander une action C2P
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactModal && selectedPartner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Contacter C2P a propos de {selectedPartner.name}</h3>
              <button onClick={() => setShowContactModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-500">C2P recoit votre demande puis coordonne la suite avec le partenaire concerne.</p>
            <label htmlFor="porteur-partnership-message" className="mb-2 block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="porteur-partnership-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Precisez votre besoin ou la prochaine etape souhaitée..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowContactModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleContact} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Envoyer a C2P</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
