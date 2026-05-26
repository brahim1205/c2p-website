import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchPrestataireBookings,
  updatePrestataireBookingStatus,
  type PrestataireBooking as Booking,
} from '@/lib/prestataireDashboardApi';
import {
  PrestataireDemandFilters,
  PrestataireDemandStatsCards,
  PrestataireRequestsList,
} from './PrestataireDemandesPanels';
import { PrestataireBookingDetailModal } from './PrestataireBookingDetailModal';
import {
  getPrestataireDemandStats,
  type PrestataireDemandStatusFilter,
} from './prestataireDemandesModel';

export default function PrestataireDemandesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [statusFilter, setStatusFilter] = useState<PrestataireDemandStatusFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<Booking | null>(null);

  const bookingsQuery = useQuery({
    queryKey: queryKeys.prestataire.bookings(user?.id),
    queryFn: () => fetchPrestataireBookings(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (bookingsQuery.data && !bookingsQuery.data.providerId) {
      error('Prestataire introuvable', 'Votre compte prestataire n est pas encore relie a une fiche de service.');
    }
  }, [bookingsQuery.data, error]);

  useEffect(() => {
    if (bookingsQuery.isError) {
      console.error(bookingsQuery.error);
      error('Erreur', 'Impossible de charger les demandes.');
    }
  }, [bookingsQuery.error, bookingsQuery.isError, error]);

  const loading = bookingsQuery.isLoading;
  const requests: Booking[] = useMemo(() => bookingsQuery.data?.bookings ?? [], [bookingsQuery.data?.bookings]);
  const filteredRequests = useMemo(
    () => statusFilter === 'all' ? requests : requests.filter((request) => request.status === statusFilter),
    [requests, statusFilter],
  );
  const stats = useMemo(() => getPrestataireDemandStats(requests), [requests]);

  const closeDetailModal = () => setSelectedRequest(null);

  const updateStatus = async (id: number, newStatus: Booking['status']) => {
    try {
      const request = requests.find((entry) => entry.id === id);
      if (!request) return;
      await updatePrestataireBookingStatus(request, newStatus);
      await queryClient.invalidateQueries({ queryKey: queryKeys.prestataire.root(user?.id) });
      const labels: Record<string, string> = { confirmed: 'acceptée', declined: 'refusée', in_progress: 'démarrée', completed: 'terminée' };
      success(`Mission ${labels[newStatus] || 'mise à jour'}`, 'Le client a été notifié du changement de statut.');

      closeDetailModal();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre à jour cette mission.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire', path: '/dashboard/prestataire' }, { label: 'Demandes' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Missions attribuées</h1>
          <p className="text-gray-600 text-sm md:text-base">C2P vous assigne les missions. Vous gérez ici l’exécution et les changements d’état.</p>
        </div>

        <PrestataireDemandStatsCards stats={stats} />

        <PrestataireDemandFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <SkeletonList count={6} />
          ) : (
            <PrestataireRequestsList
              requests={filteredRequests}
              onOpenDetail={setSelectedRequest}
              onUpdateStatus={updateStatus}
            />
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

        {selectedRequest && (
          <PrestataireBookingDetailModal
            request={selectedRequest}
            onClose={closeDetailModal}
            onUpdateStatus={updateStatus}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
