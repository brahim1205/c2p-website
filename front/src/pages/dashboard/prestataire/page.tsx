import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchPrestataireDashboardSnapshot,
  requestPrestataireVerification,
  updatePrestataireBookingStatus,
  type PrestataireBooking as Booking,
} from '@/lib/prestataireDashboardApi';
import {
  PrestataireHero,
  PrestataireMissionsPanel,
  PrestataireQuickLinksPanel,
  PrestataireStatsGrid,
  PrestataireVerificationPanel,
  type PrestataireDashboardStat,
  type PrestataireQuickLink,
} from './PrestataireDashboardPanels';
import {
  PrestataireReputationPanel,
  PrestataireReviewsPanel,
} from './PrestataireReputationPanels';

export default function PrestataireDashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const subscriptionGate = gateFor('provider_services_manage');

  const dashboardQuery = useQuery({
    queryKey: queryKeys.prestataire.dashboard(user?.id),
    queryFn: () => fetchPrestataireDashboardSnapshot({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      }),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (dashboardQuery.isError) {
      console.error(dashboardQuery.error);
      error('Erreur', 'Impossible de charger le tableau de bord prestataire.');
    }
  }, [dashboardQuery.error, dashboardQuery.isError, error]);

  const loading = dashboardQuery.isLoading;
  const provider = dashboardQuery.data?.provider ?? null;
  const requests: Booking[] = useMemo(() => dashboardQuery.data?.bookings ?? [], [dashboardQuery.data?.bookings]);
  const reviews = useMemo(() => dashboardQuery.data?.reviews ?? [], [dashboardQuery.data?.reviews]);
  const visibilityPass = dashboardQuery.data?.visibilityPass ?? null;
  const verificationRequest = dashboardQuery.data?.verificationRequest ?? null;

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending').length;
    const inProgress = requests.filter((request) => request.status === 'in_progress' || request.status === 'confirmed').length;
    const revenue = requests
      .filter((request) => ['confirmed', 'in_progress', 'completed'].includes(request.status))
      .reduce((sum, request) => sum + Number(request.price || 0), 0);
    return [
      {
        label: 'Missions attribuées',
        value: String(requests.length),
        detail: `${pending} encore en revue C2P`,
        icon: 'ri-inbox-line',
        surface: 'bg-teal-50 text-teal-700',
      },
      {
        label: 'Prestations en cours',
        value: String(inProgress),
        detail: `${Math.max(0, requests.length - inProgress)} clôturée(s)`,
        icon: 'ri-time-line',
        surface: 'bg-sky-50 text-sky-700',
      },
      {
        label: 'Prestations terminées',
        value: String(provider?.completed_jobs || 0),
        detail: formatCurrency(revenue),
        icon: 'ri-checkbox-circle-line',
        surface: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Note moyenne',
        value: provider?.rating?.toFixed(1) || '0.0',
        detail: `${provider?.reviews_count || 0} avis`,
        icon: 'ri-star-line',
        surface: 'bg-amber-50 text-amber-700',
      },
    ] satisfies PrestataireDashboardStat[];
  }, [provider?.completed_jobs, provider?.rating, provider?.reviews_count, requests]);

  const quickLinks: PrestataireQuickLink[] = [
    { label: 'Mes services', icon: 'ri-briefcase-line', link: '/dashboard/prestataire/services', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Demandes', icon: 'ri-inbox-line', link: '/dashboard/prestataire/demandes', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Avis clients', icon: 'ri-star-line', link: '/dashboard/prestataire/avis', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', link: '/dashboard/paiements', tone: 'bg-violet-50 text-violet-700' },
  ];

  const canRequestVerification = Boolean(
    provider?.id
    && !provider?.verified
    && visibilityPass?.verification_eligible
    && (!verificationRequest || ['rejected', 'cancelled'].includes(verificationRequest.status)),
  );

  const updateStatus = async (booking: Booking, status: Booking['status']) => {
    try {
      await updatePrestataireBookingStatus(booking, status);
      await queryClient.invalidateQueries({ queryKey: queryKeys.prestataire.root(user?.id) });
      success('Statut mis a jour', 'Le client a ete notifie du changement.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'La demande n a pas pu etre mise a jour.');
    }
  };

  const requestVerification = async () => {
    if (!provider?.id) return;
    setRequestingVerification(true);
    try {
      await requestPrestataireVerification(provider.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.prestataire.dashboard(user?.id) });
      success('Demande envoyée', 'C2P a bien reçu votre demande de vérification SenPresta.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'La demande de vérification n’a pas pu être envoyée.');
    } finally {
      setRequestingVerification(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire' }]} />

        <PrestataireHero firstName={user?.firstName} />

        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <PrestataireStatsGrid stats={stats} />

        <PrestataireVerificationPanel
          provider={provider}
          visibilityPass={visibilityPass}
          verificationRequest={verificationRequest}
          canRequestVerification={canRequestVerification}
          requestingVerification={requestingVerification}
          onRequestVerification={requestVerification}
        />

        <PrestataireQuickLinksPanel quickLinks={quickLinks} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr,1fr]">
          <PrestataireMissionsPanel
            loading={loading}
            requests={requests}
            onUpdateStatus={updateStatus}
          />

          <div className="space-y-6">
            <PrestataireReputationPanel
              provider={provider}
              pendingRequestsCount={requests.filter((request) => request.status === 'pending').length}
            />
            <PrestataireReviewsPanel
              loading={loading}
              provider={provider}
              reviews={reviews}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
