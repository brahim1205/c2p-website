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
          breakdown={session.breakdown}
          commissionTotal={session.commissionTotal}
          dexPayStatus={session.dexPayStatus}
          financeProviderSignals={session.financeProviderSignals}
          history={session.history}
          isSuperAdmin={session.isSuperAdmin}
          kpis={session.kpis}
          loading={session.loading}
          managerName={session.managerName}
          onExport={session.onExport}
          onRefreshActivity={session.onRefreshActivity}
          onTimeRangeChange={session.onTimeRangeChange}
          pendingActions={session.pendingActions}
          providerRuntimeBadge={session.providerRuntimeBadge}
          recentRegistrations={session.recentRegistrations}
          revenueBars={session.revenueBars}
          timeRange={session.timeRange}
        />
      </div>
    </AdminLayout>
  );
}
