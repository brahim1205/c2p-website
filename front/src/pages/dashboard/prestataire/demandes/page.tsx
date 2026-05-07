import { useState, useEffect } from 'react';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { createNotification } from '@/hooks/useCreateNotification';
import { useAuth } from '@/hooks/useAuth';
import { fetchProviderByUserId } from '@/lib/providerApi';


interface Booking {
  id: number;
  client_id: string;
  client_name: string;
  client_email: string | null;
  provider_id: number;
  service: string;
  description: string | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'declined';
  price: number | null;
  address: string | null;
  created_at: string;
}

export default function PrestataireDemandesPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [requests, setRequests] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!user?.id) {
          setRequests([]);
          return;
        }

        const provider = await fetchProviderByUserId(user.id);
        if (!provider?.id) {
          setRequests([]);
          toastError('Prestataire introuvable', 'Votre compte prestataire n est pas encore relie a une fiche de service.');
          return;
        }

        const { data, error } = await backendClient
          .from('bookings')
          .select('*')
          .eq('provider_id', provider.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setRequests((data || []) as Booking[]);
        const channel = backendClient
          .channel(`bookings-channel-${provider.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `provider_id=eq.${provider.id}` }, (payload) => {
            const newBooking = payload.new as Booking;
            setRequests(prev => [newBooking, ...prev]);
            success('Nouvelle demande', `${newBooking.client_name} demande : ${newBooking.service}`);
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `provider_id=eq.${provider.id}` }, (payload) => {
            const updated = payload.new as Booking;
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
          })
          .subscribe();

        return channel;
      } catch (err) {
        console.error(err);
        toastError('Erreur', 'Impossible de charger les demandes.');
      }
      finally { setLoading(false); }
    };
    let channel: { unsubscribe: () => void } | null = null;

    fetchData().then((subscription) => {
      channel = subscription ?? null;
    });

    return () => { channel?.unsubscribe(); };
  }, [success, toastError, user?.id]);

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const updateStatus = async (id: number, newStatus: Booking['status']) => {
    try {
      const { error } = await backendClient
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      const labels: Record<string, string> = { confirmed: 'acceptée', declined: 'refusée', in_progress: 'démarrée', completed: 'terminée' };
      success(`Demande ${labels[newStatus] || 'mise à jour'}`, 'Le client a été notifié du changement de statut.');

      // Notification auto au client
      const request = requests.find(r => r.id === id);
      if (request) {
        const statusLabels: Record<string, string> = {
          confirmed: 'acceptée',
          declined: 'refusée',
          in_progress: 'en cours',
          completed: 'terminée'
        };
        await createNotification(
          request.client_id,
          `Réservation ${statusLabels[newStatus] || 'mise à jour'}`,
          `Votre demande de prestation "${request.service}" a été ${statusLabels[newStatus] || 'mise à jour'} par le prestataire.`,
          'booking',
          '/dashboard/client/reservations'
        );
      }

      setShowDetailModal(false);
      setSelectedRequest(null);
    } catch (err) { console.error(err); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Acceptée',
      in_progress: 'En cours',
      completed: 'Terminée',
      declined: 'Refusée',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    confirmed: requests.filter(r => r.status === 'confirmed').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    declined: requests.filter(r => r.status === 'declined').length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire', path: '/dashboard/prestataire' }, { label: 'Demandes' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Demandes de service</h1>
          <p className="text-gray-600 text-sm md:text-base">Gérez les demandes de vos clients et suivez vos prestations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'En attente', value: stats.pending, icon: 'ri-time-line', color: 'bg-amber-500' },
            { label: 'Acceptées', value: stats.confirmed, icon: 'ri-check-line', color: 'bg-blue-500' },
            { label: 'En cours', value: stats.in_progress, icon: 'ri-loader-4-line', color: 'bg-purple-500' },
            { label: 'Terminées', value: stats.completed, icon: 'ri-checkbox-circle-line', color: 'bg-green-500' },
            { label: 'Refusées', value: stats.declined, icon: 'ri-close-circle-line', color: 'bg-red-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${stat.icon} text-white text-sm`}></i>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'confirmed', 'in_progress', 'completed', 'declined'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === f ? 'bg-[#14B8A6] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'pending' ? 'En attente' : f === 'confirmed' ? 'Acceptées' : f === 'in_progress' ? 'En cours' : f === 'completed' ? 'Terminées' : 'Refusées'}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <SkeletonList count={6} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Localisation</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#14B8A6]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[#14B8A6] font-medium text-sm">{req.client_name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{req.client_name}</p>
                            {req.client_email && <p className="text-xs text-gray-500">{req.client_email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{req.service}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.price ? `${Number(req.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{req.address || 'Non précisé'}</td>
                      <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{req.booking_date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(req.id, 'confirmed')}
                                className="px-3 py-1.5 bg-[#14B8A6] text-white rounded-lg text-xs font-medium hover:bg-[#0D9488] transition-colors whitespace-nowrap"
                              >
                                Accepter
                              </button>
                              <button
                                onClick={() => updateStatus(req.id, 'declined')}
                                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
                              >
                                Refuser
                              </button>
                            </>
                          )}
                          {req.status === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(req.id, 'in_progress')}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors whitespace-nowrap"
                            >
                              Démarrer
                            </button>
                          )}
                          {req.status === 'in_progress' && (
                            <button
                              onClick={() => updateStatus(req.id, 'completed')}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                            >
                              Terminer
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                            title="Détails"
                          >
                            <i className="ri-eye-line text-gray-600 text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredRequests.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-inbox-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune demande trouvée</h3>
            <p className="text-gray-600">Ajustez vos filtres</p>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[#14B8A6]/10 rounded-full flex items-center justify-center">
                  <span className="text-[#14B8A6] font-bold">{selectedRequest.client_name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedRequest.client_name}</h3>
                  <p className="text-sm text-gray-600">{selectedRequest.service}</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-900">{selectedRequest.description || 'Aucune description'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Budget</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.price ? `${Number(selectedRequest.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Localisation</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.address || 'Non précisé'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Date de demande</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.booking_date} à {selectedRequest.booking_time}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Contact</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.client_email || 'Non renseigné'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fermer
                </button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(selectedRequest.id, 'confirmed')}
                      className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => updateStatus(selectedRequest.id, 'declined')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Refuser
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
