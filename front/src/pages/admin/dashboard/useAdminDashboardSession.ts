import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import {
  assignAdminBookingProvider,
  fetchAdminDashboardSnapshot,
  type AdminDashboardBooking as Booking,
} from '@/lib/adminApi';
import { downloadJsonFile } from '@/lib/downloads';
import { useAuth } from '@/hooks/useAuth';
import { fetchDexPayStatus, type DexPayStatus } from '@/lib/paymentsApi';
import { queryKeys } from '@/lib/queryKeys';
import type { TimeRange } from './adminDashboardContentModel';
import {
  calculateActiveUsers,
  calculateBookingRevenue,
  calculateModerationRate,
  calculateRevenue,
  createAdminModules,
  createBreakdown,
  createFinanceProviderSignals,
  createKpis,
  createPendingActions,
  createRecentRegistrations,
  createProviderRuntimeBadge,
  createQuickAccess,
  createRevenueBars,
  defaultProviderHealth,
  filterBookingsByTimeRange,
} from './adminDashboardSessionModel';

export function useAdminDashboardSession() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedProviderByBooking, setSelectedProviderByBooking] = useState<Record<number, string>>({});
  const [assigningBookingId, setAssigningBookingId] = useState<number | null>(null);
  const isSuperAdmin = user?.role === 'superadmin';

  const dashboardQuery = useQuery({
    queryKey: queryKeys.admin.dashboard(isSuperAdmin ? 'superadmin' : 'admin'),
    queryFn: async () => {
      const [snapshot, dexPayRuntime] = await Promise.all([
        fetchAdminDashboardSnapshot({ includeSensitiveSupervision: isSuperAdmin }),
        isSuperAdmin ? fetchDexPayStatus().catch(() => null) : Promise.resolve(null),
      ]);
      return { snapshot, dexPayRuntime };
    },
  });

  useEffect(() => {
    if (dashboardQuery.isError) {
      console.error(dashboardQuery.error);
      error('Erreur', 'Impossible de charger le tableau de bord administrateur.');
    }
  }, [dashboardQuery.error, dashboardQuery.isError, error]);

  const snapshot = dashboardQuery.data?.snapshot;
  const loading = dashboardQuery.isLoading;
  const users = useMemo(() => snapshot?.users ?? [], [snapshot?.users]);
  const courses = useMemo(() => snapshot?.courses ?? [], [snapshot?.courses]);
  const bookings = useMemo(() => snapshot?.bookings ?? [], [snapshot?.bookings]);
  const providers = useMemo(() => snapshot?.providers ?? [], [snapshot?.providers]);
  const services = useMemo(() => snapshot?.services ?? [], [snapshot?.services]);
  const contentItems = useMemo(() => snapshot?.contentItems ?? [], [snapshot?.contentItems]);
  const certificates = useMemo(() => snapshot?.certificates ?? [], [snapshot?.certificates]);
  const projects = useMemo(() => snapshot?.projects ?? [], [snapshot?.projects]);
  const history = useMemo(() => snapshot?.history ?? [], [snapshot?.history]);
  const escrows = useMemo(() => snapshot?.escrows ?? [], [snapshot?.escrows]);
  const subscriptions = useMemo(() => snapshot?.subscriptions ?? [], [snapshot?.subscriptions]);
  const commissionTotal = snapshot?.commissionTotal ?? 0;
  const providerHealth = snapshot?.providerHealth ?? defaultProviderHealth;
  const dexPayStatus: DexPayStatus | null = dashboardQuery.data?.dexPayRuntime ?? null;

  const filteredBookings = useMemo(() => {
    return filterBookingsByTimeRange(bookings, timeRange);
  }, [bookings, timeRange]);

  const revenue = useMemo(
    () => calculateRevenue(bookings, courses),
    [bookings, courses],
  );

  const scopedRevenue = useMemo(
    () => calculateBookingRevenue(filteredBookings),
    [filteredBookings],
  );

  const activeUsers = useMemo(
    () => calculateActiveUsers(users),
    [users],
  );

  const recentRegistrations = useMemo(
    () => createRecentRegistrations(users),
    [users],
  );

  const recentUsersCount = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return users.filter((entry) => {
      if (!entry.createdAt) return false;
      const createdAt = Date.parse(entry.createdAt);
      return Number.isFinite(createdAt) && now - createdAt <= sevenDays;
    }).length;
  }, [users]);

  const moderationRate = useMemo(() => {
    return calculateModerationRate(courses);
  }, [courses]);

  const pendingActions = useMemo(() => createPendingActions({
    bookings,
    certificates,
    contentItems,
    courses,
    projects,
    services,
    users,
  }), [bookings, certificates, contentItems, courses, projects, services, users]);

  const modules = useMemo(() => createAdminModules(isSuperAdmin), [isSuperAdmin]);

  const managerName = `${user?.firstName || 'Admin'} ${user?.lastName || ''}`.trim();

  const kpis = useMemo(() => createKpis({
    activeUsers,
    filteredBookings,
    totalUsers: users.length,
    moderationRate,
    newUsers: recentUsersCount,
    pendingAssignments: pendingActions[1].count,
    pendingUsers: users.filter((entry) => entry.status === 'pending').length,
    publishedCourses: courses.filter((course) => course.status === 'published').length,
    scopedRevenue,
  }), [activeUsers, courses, filteredBookings, moderationRate, pendingActions, recentUsersCount, scopedRevenue, users]);

  const quickAccess = useMemo(() => createQuickAccess(isSuperAdmin), [isSuperAdmin]);
  const financeProviderSignals = useMemo(() => createFinanceProviderSignals(providerHealth), [providerHealth]);
  const providerRuntimeBadge = useMemo(() => createProviderRuntimeBadge(dexPayStatus), [dexPayStatus]);
  const revenueBars = useMemo(() => createRevenueBars(bookings), [bookings]);
  const breakdown = useMemo(() => createBreakdown({
    activeUsers,
    bookings,
    courses,
    projects,
    users,
  }), [activeUsers, bookings, courses, projects, users]);

  const pendingC2PRequests = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending' && !booking.provider_id).slice(0, 6),
    [bookings],
  );

  const getRequestedProviderLabel = (booking: Booking) => (
    booking.requested_provider?.name || booking.requested_provider_name || 'Aucune préférence'
  );

  const getSuggestedProviderId = (booking: Booking) => (
    selectedProviderByBooking[booking.id]
      || String(booking.requested_provider_id || booking.matching_candidates?.[0]?.id || '')
  );

  const handleAssignProvider = async (booking: Booking) => {
    const providerId = Number(getSuggestedProviderId(booking) || 0);
    if (!providerId) {
      error('Assignation impossible', 'Choisissez un prestataire avant de confirmer.');
      return;
    }

    const provider = providers.find((entry) => entry.id === providerId);
    if (!provider) {
      error('Prestataire introuvable', 'Le prestataire sélectionné n’est plus disponible.');
      return;
    }

    setAssigningBookingId(booking.id);
    try {
      const updatedBooking = await assignAdminBookingProvider({
        booking,
        provider,
        adminUserId: user?.id || 'usr-admin',
      });

      queryClient.setQueryData<typeof dashboardQuery.data>(
        queryKeys.admin.dashboard(isSuperAdmin ? 'superadmin' : 'admin'),
        (current) => current
          ? {
              ...current,
              snapshot: {
                ...current.snapshot,
                bookings: current.snapshot.bookings.map((entry) => (
                  entry.id === booking.id
                    ? {
                        ...entry,
                        ...updatedBooking,
                        provider,
                        provider_id: provider.id,
                        status: 'confirmed',
                        assignment_status: 'assigned',
                      }
                    : entry
                )),
              },
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard(isSuperAdmin ? 'superadmin' : 'admin') });
      setSelectedProviderByBooking((current) => ({ ...current, [booking.id]: '' }));

      success('Mission attribuée', `${provider.name} reçoit maintenant cette mission via C2P.`);
    } catch (assignError) {
      console.error(assignError);
      error('Erreur', 'Impossible d’assigner ce prestataire pour le moment.');
    } finally {
      setAssigningBookingId(null);
    }
  };

  const handleExport = () => {
    downloadJsonFile(isSuperAdmin ? 'superadmin-supervision-snapshot.json' : 'admin-supervision-snapshot.json', {
      generatedAt: new Date().toISOString(),
      revenue,
      pendingActions,
      modules,
      history,
    });
    success('Export pret', 'Le snapshot de supervision a ete telecharge.');
  };

  return {
    activeEscrowCount: escrows.filter((item) => ['funded', 'assigned', 'in_progress', 'delivery_review'].includes(item.status)).length,
    activeSubscriptionCount: subscriptions.filter((item) => item.status === 'active').length,
    assigningBookingId,
    breakdown,
    commissionTotal,
    dexPayStatus,
    financeProviderSignals,
    getRequestedProviderLabel,
    getSuggestedProviderId,
    history,
    isSuperAdmin,
    kpis,
    loading,
    managerName,
    onAssignProvider: handleAssignProvider,
    onExport: handleExport,
    onRefreshActivity: () => void dashboardQuery.refetch(),
    onSelectProvider: (bookingId: number, providerId: string) => setSelectedProviderByBooking((current) => ({ ...current, [bookingId]: providerId })),
    onTimeRangeChange: setTimeRange,
    pendingActions,
    pendingC2PRequests,
    providerRuntimeBadge,
    providers,
    quickAccess,
    recentRegistrations,
    revenueBars,
    timeRange,
  };
}
