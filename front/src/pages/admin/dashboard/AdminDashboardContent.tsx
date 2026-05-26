import {
  BreakdownPanel,
  C2PRequestsPanel,
  DashboardHeader,
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

      <KpiGrid kpis={kpis} />
      <QuickAccessGrid quickAccess={quickAccess} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
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
          <RevenueBarsPanel revenueBars={revenueBars} />
          <PendingActionsPanel pendingActions={pendingActions} />
        </div>

        <div className="space-y-6">
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
          <BreakdownPanel breakdown={breakdown} />
          <RecentActivityPanel history={history} loading={loading} onRefreshActivity={onRefreshActivity} />
        </div>
      </div>
    </>
  );
}
