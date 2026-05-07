import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { createNotification } from '@/hooks/useCreateNotification';
import { fetchPartnershipsForOwner, type ProjectPartnership } from '@/lib/projectApi';

export default function PorteurPartenariatsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [partners, setPartners] = useState<ProjectPartnership[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ProjectPartnership | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [message, setMessage] = useState('');

  const loadPartners = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPartners(await fetchPartnershipsForOwner(user.id));
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger vos partenariats.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesSearch = !search || partner.name.toLowerCase().includes(search.toLowerCase()) || partner.role.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'tous' || partner.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [partners, search, typeFilter]);

  const handleContact = async () => {
    if (!selectedPartner?.counterpart_user_id) {
      success('Message prepare', 'Le contact n est pas un compte plateforme, ouvrez la messagerie externe.');
      setShowContactModal(false);
      return;
    }

    try {
      await createNotification(
        selectedPartner.counterpart_user_id,
        'Nouveau message porteur',
        message || `Le porteur souhaite faire le point sur ${selectedPartner.project_title || 'le projet'}.`,
        'message',
        '/dashboard/messages',
      );
      success('Message envoye', `Votre demande a ete envoyee a ${selectedPartner.name}.`);
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-gray-900">{partners.length}</p><p className="text-sm text-gray-600">Relations actives</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-blue-600">{partners.filter((partner) => partner.type === 'mentor').length}</p><p className="text-sm text-gray-600">Mentors</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-green-600">{partners.filter((partner) => partner.type === 'financier').length}</p><p className="text-sm text-gray-600">Financiers</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-2xl font-bold text-[#14B8A6]">{partners.filter((partner) => partner.type === 'technique').length}</p><p className="text-sm text-gray-600">Techniques</p></div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && <p className="text-sm text-gray-500">Chargement des partenaires...</p>}
          {!loading && filteredPartners.map((partner) => (
            <div key={partner.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 transition-colors">
              <div className="flex items-start gap-4 mb-4">
                <img src={partner.avatar} alt={partner.name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{partner.name}</h3>
                  <p className="text-sm text-gray-500">{partner.role}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${partner.type === 'mentor' ? 'bg-blue-100 text-blue-700' : partner.type === 'financier' ? 'bg-green-100 text-green-700' : 'bg-[#14B8A6]/10 text-[#14B8A6]'}`}>
                      {partner.type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${partner.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {partner.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Expertise</p>
                <div className="flex flex-wrap gap-1.5">
                  {partner.expertise.map((expertise) => (
                    <span key={expertise} className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">{expertise}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>Projet: {partner.project_title}</span>
                <span>{partner.last_activity}</span>
              </div>

              <button
                onClick={() => { setSelectedPartner(partner); setShowContactModal(true); }}
                className="w-full px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Contacter
              </button>
            </div>
          ))}
        </div>
      </div>

      {showContactModal && selectedPartner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Contacter {selectedPartner.name}</h3>
              <button onClick={() => setShowContactModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Precisez votre besoin ou la prochaine etape souhaitée..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowContactModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleContact} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
