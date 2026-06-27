import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { queryKeys } from '@/lib/queryKeys';
import { fetchClientDashboardSnapshot } from '@/lib/clientDashboardApi';
import {
  ClientActionsPanel,
  ClientDashboardHero,
  ClientFavoritesPanel,
  ClientQuickAccessPanel,
  ClientSupportPanel,
} from './ClientDashboardPanels';
import {
  getActiveOrders,
  getActiveReservations,
  isWithinPeriod,
  type DashboardPeriod,
} from './clientDashboardModel';

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [period, setPeriod] = useState<DashboardPeriod>('focus');

  const dashboardQuery = useQuery({
    queryKey: queryKeys.client.dashboard(user?.id),
    queryFn: () => fetchClientDashboardSnapshot(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (dashboardQuery.isError) {
      console.error(dashboardQuery.error);
      error('Erreur', 'Impossible de charger l’espace client.');
    }
  }, [dashboardQuery.error, dashboardQuery.isError, error]);

  const loading = dashboardQuery.isLoading;
  const reservations = useMemo(() => dashboardQuery.data?.bookings ?? [], [dashboardQuery.data?.bookings]);
  const orders = useMemo(() => dashboardQuery.data?.orders ?? [], [dashboardQuery.data?.orders]);
  const favorites = useMemo(() => dashboardQuery.data?.favorites ?? [], [dashboardQuery.data?.favorites]);

  const scopedReservations = useMemo(
    () => reservations.filter((reservation) => isWithinPeriod(reservation.booking_date, period)),
    [period, reservations],
  );

  const scopedOrders = useMemo(
    () => orders.filter((order) => isWithinPeriod(order.date, period)),
    [orders, period],
  );

  const activeReservations = useMemo(() => getActiveReservations(scopedReservations), [scopedReservations]);
  const activeOrders = useMemo(() => getActiveOrders(scopedOrders), [scopedOrders]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client', path: '/dashboard/client' }]} />

        <ClientDashboardHero firstName={user?.firstName} period={period} onPeriodChange={setPeriod} />
        <ClientQuickAccessPanel />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr,1fr]">
          <div className="space-y-6">
            <ClientActionsPanel
              loading={loading}
              activeReservations={activeReservations}
              activeOrders={activeOrders}
              scopedOrders={scopedOrders}
            />
          </div>

          <div className="space-y-6">
            <ClientFavoritesPanel loading={loading} favorites={favorites} />
            <ClientSupportPanel />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
