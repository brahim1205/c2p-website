import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPrestataireBookings,
  subscribePrestataireBookings,
  updatePrestataireBookingStatus,
  type PrestataireBooking as Booking,
} from '@/lib/prestataireDashboardApi';

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

        const snapshot = await fetchPrestataireBookings(user.id);
        if (!snapshot.providerId) {
          setRequests([]);
          toastError('Prestataire introuvable', 'Votre compte prestataire n est pas encore relie a une fiche de service.');
          return;
        }

        setRequests(snapshot.bookings);
        const channel = subscribePrestataireBookings(snapshot.providerId, {
          onInsert: (newBooking) => {
            setRequests(prev => [newBooking, ...prev]);
            success('Nouvelle demande', `${newBooking.client_name} demande : ${newBooking.service}`);
          },
          onUpdate: (updated) => {
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
          },
        });

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
      const request = requests.find(r => r.id === id);
      if (!request) return;
      await updatePrestataireBookingStatus(request, newStatus);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      const labels: Record<string, string> = { confirmed: 'acceptée', declined: 'refusée', in_progress: 'démarrée', completed: 'terminée' };
      success(`Mission ${labels[newStatus] || 'mise à jour'}`, 'Le client a été notifié du changement de statut.');

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
          pending: 'Analyse C2P',
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

  const getRequestTypeBadge = (requestType?: Booking['request_type']) => {
    const styles: Record<string, string> = {
      booking: 'bg-teal-100 text-teal-700',
      quote: 'bg-amber-100 text-amber-700',
      appointment: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      booking: 'Commande',
      quote: 'Devis',
      appointment: 'Rendez-vous',
    };
    const key = requestType || 'booking';
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[key] || 'bg-gray-100 text-gray-700'}`}>
        {labels[key] || 'Commande'}
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Missions attribuées</h1>
          <p className="text-gray-600 text-sm md:text-base">C2P vous assigne les missions. Vous gérez ici l’exécution et les changements d’état.</p>
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
        <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto" role="group" aria-label="Filtrer les missions par statut">
          {(['all', 'pending', 'confirmed', 'in_progress', 'completed', 'declined'] as const).map(f => (
            <button
              type="button"
              key={f}
              onClick={() => setStatusFilter(f)}
              aria-pressed={statusFilter === f}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === f ? 'bg-[#5fa6f3] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
            {f === 'all' ? 'Toutes' : f === 'pending' ? 'Analyse C2P' : f === 'confirmed' ? 'Attribuées' : f === 'in_progress' ? 'En cours' : f === 'completed' ? 'Terminées' : 'Refusées'}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <SkeletonList count={6} />
          ) : (
            <>
            <div className="space-y-4 p-4 md:hidden">
              {filteredRequests.map((req) => (
                <article key={req.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{req.client_name}</p>
                      {req.client_email && <p className="text-xs text-gray-500">{req.client_email}</p>}
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {getRequestTypeBadge(req.request_type)}
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{req.service}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-gray-500">Budget</dt>
                      <dd className="font-medium text-gray-900">{req.price ? `${Number(req.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Date</dt>
                      <dd className="font-medium text-gray-900">{req.booking_date}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-gray-500">Localisation</dt>
                      <dd className="font-medium text-gray-900">{req.address || 'Non précisé'}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {req.status === 'confirmed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(req.id, 'in_progress')}
                          className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                        >
                          Démarrer
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(req.id, 'declined')}
                          className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                    {req.status === 'in_progress' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(req.id, 'completed')}
                        className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700"
                      >
                        Terminer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                      aria-label={`Voir les détails de la mission ${req.service} pour ${req.client_name}`}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Détails
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
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
                          <div className="w-9 h-9 bg-[#5fa6f3]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[#5fa6f3] font-medium text-sm">{req.client_name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{req.client_name}</p>
                            {req.client_email && <p className="text-xs text-gray-500">{req.client_email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700">{req.service}</p>
                          {getRequestTypeBadge(req.request_type)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.price ? `${Number(req.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{req.address || 'Non précisé'}</td>
                      <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{req.booking_date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {req.status === 'confirmed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateStatus(req.id, 'in_progress')}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors whitespace-nowrap"
                              >
                                Démarrer
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(req.id, 'declined')}
                                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
                              >
                                Refuser
                              </button>
                            </>
                          )}
                          {req.status === 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(req.id, 'completed')}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                            >
                              Terminer
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                            aria-label={`Voir les détails de la mission ${req.service} pour ${req.client_name}`}
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
            </>
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
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" role="dialog" aria-modal="true" aria-labelledby="prestataire-booking-detail-title">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[#5fa6f3]/10 rounded-full flex items-center justify-center">
                  <span className="text-[#5fa6f3] font-bold">{selectedRequest.client_name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <h3 id="prestataire-booking-detail-title" className="text-lg font-bold text-gray-900">{selectedRequest.client_name}</h3>
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
                  type="button"
                  onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fermer
                </button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateStatus(selectedRequest.id, 'confirmed')}
                      className="px-4 py-2 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b] transition-colors"
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
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
