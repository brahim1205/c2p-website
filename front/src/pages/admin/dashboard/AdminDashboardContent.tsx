import {
  BreakdownPanel,
  C2PRequestsPanel,
  CommandCenterPanel,
  DashboardHeader,
  DashboardSectionDisclosure,
  KpiGrid,
  MonetizationPanel,
  PendingActionsPanel,
  ProviderHealthPanel,
  QuickAccessGrid,
  RecentActivityPanel,
  RevenueBarsPanel,
} from './AdminDashboardPanels';
import type {
  Booking,
  BreakdownItem,
  DexPayStatus,
  FinanceProviderSignal,
  HistoryItem,
  KpiCard,
  PendingAction,
  ProviderOption,
  ProviderRuntimeBadge,
  QuickAccessItem,
  RevenueBar,
  TimeRange,
} from './adminDashboardContentModel';

interface AdminDashboardContentProps {
  assigningBookingId: number | null;
  breakdown: BreakdownItem[];
  commissionTotal: number;
  dexPayStatus: DexPayStatus | null;
  financeProviderSignals: FinanceProviderSignal[];
  getRequestedProviderLabel: (booking: Booking) => string;
  getSuggestedProviderId: (booking: Booking) => string;
  history: HistoryItem[];
  isSuperAdmin: boolean;
  kpis: KpiCard[];
  loading: boolean;
  managerName: string;
  onAssignProvider: (booking: Booking) => void;
  onExport: () => void;
  onRefreshActivity: () => void;
  onSelectProvider: (bookingId: number, providerId: string) => void;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  pendingActions: PendingAction[];
  pendingC2PRequests: Booking[];
  providerRuntimeBadge: ProviderRuntimeBadge;
  providers: ProviderOption[];
  quickAccess: QuickAccessItem[];
  revenueBars: RevenueBar[];
  activeEscrowCount: number;
  activeSubscriptionCount: number;
  timeRange: TimeRange;
}

export default function AdminDashboardContent({
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
  onAssignProvider,
  onExport,
  onRefreshActivity,
  onSelectProvider,
  onTimeRangeChange,
  pendingActions,
  pendingC2PRequests,
  providerRuntimeBadge,
  providers,
  quickAccess,
  revenueBars,
  activeEscrowCount,
  activeSubscriptionCount,
  timeRange,
}: AdminDashboardContentProps) {
  return (
    <>
      <DashboardHeader
        managerName={managerName}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        onExport={onExport}
      />

      <CommandCenterPanel
        loading={loading}
        pendingActions={pendingActions}
        pendingRequestCount={pendingC2PRequests.length}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-4">
          <C2PRequestsPanel
            assigningBookingId={assigningBookingId}
            getRequestedProviderLabel={getRequestedProviderLabel}
            getSuggestedProviderId={getSuggestedProviderId}
            loading={loading}
            onAssignProvider={onAssignProvider}
            onSelectProvider={onSelectProvider}
            pendingC2PRequests={pendingC2PRequests}
            providers={providers}
          />
        </div>

        <div className="space-y-4">
          <QuickAccessGrid quickAccess={quickAccess} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <DashboardSectionDisclosure title="Toutes les priorités" summary="Liste complète des actions à traiter">
          <PendingActionsPanel pendingActions={pendingActions} />
        </DashboardSectionDisclosure>

        <DashboardSectionDisclosure title="Supervision" summary="Monétisation et santé provider">
          <div className="space-y-4">
            <MonetizationPanel
              activeEscrowCount={activeEscrowCount}
              activeSubscriptionCount={activeSubscriptionCount}
              commissionTotal={commissionTotal}
            />
            {isSuperAdmin ? (
              <ProviderHealthPanel
                dexPayStatus={dexPayStatus}
                financeProviderSignals={financeProviderSignals}
                providerRuntimeBadge={providerRuntimeBadge}
              />
            ) : null}
          </div>
        </DashboardSectionDisclosure>
      </div>

      <div className="mt-4">
        <DashboardSectionDisclosure title="Pilotage avancé" summary="Revenus, activité récente, KPI et répartition détaillée">
          <div className="space-y-4">
            <KpiGrid kpis={kpis} />
            <div className="grid gap-4 xl:grid-cols-[1fr,340px]">
              <RevenueBarsPanel revenueBars={revenueBars} />
              <RecentActivityPanel history={history} loading={loading} onRefreshActivity={onRefreshActivity} />
            </div>
            <BreakdownPanel breakdown={breakdown} />
          </div>
        </DashboardSectionDisclosure>
      </div>
    </>
  );
}
