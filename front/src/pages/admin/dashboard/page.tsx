import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import AdminDashboardContent from './AdminDashboardContent';
import { useAdminDashboardSession } from './useAdminDashboardSession';

export default function AdminDashboardPage() {
  const session = useAdminDashboardSession();

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Tableau de bord' }]} />
        <AdminDashboardContent
          activeEscrowCount={session.activeEscrowCount}
          activeSubscriptionCount={session.activeSubscriptionCount}
          assigningBookingId={session.assigningBookingId}
          breakdown={session.breakdown}
          commissionTotal={session.commissionTotal}
          dexPayStatus={session.dexPayStatus}
          financeProviderSignals={session.financeProviderSignals}
          getRequestedProviderLabel={session.getRequestedProviderLabel}
          getSuggestedProviderId={session.getSuggestedProviderId}
          history={session.history}
          isSuperAdmin={session.isSuperAdmin}
          kpis={session.kpis}
          loading={session.loading}
          managerName={session.managerName}
          onAssignProvider={(booking) => void session.onAssignProvider(booking)}
          onExport={session.onExport}
          onRefreshActivity={session.onRefreshActivity}
          onSelectProvider={session.onSelectProvider}
          onTimeRangeChange={session.onTimeRangeChange}
          pendingActions={session.pendingActions}
          pendingC2PRequests={session.pendingC2PRequests}
          providerRuntimeBadge={session.providerRuntimeBadge}
          providers={session.providers}
          quickAccess={session.quickAccess}
          revenueBars={session.revenueBars}
          timeRange={session.timeRange}
        />
      </div>
    </AdminLayout>
  );
}
