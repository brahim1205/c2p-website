import {
  BreakdownPanel,
  C2PRequestsPanel,
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

      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-4">
          <PendingActionsPanel pendingActions={pendingActions} />
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
          <DashboardSectionDisclosure title="Revenus et activité" summary="Graphique revenus, répartition et dernières actions">
            <div className="grid gap-4 xl:grid-cols-[1fr,340px]">
              <RevenueBarsPanel revenueBars={revenueBars} />
              <RecentActivityPanel history={history} loading={loading} onRefreshActivity={onRefreshActivity} />
            </div>
          </DashboardSectionDisclosure>
        </div>

        <div className="space-y-4">
          <QuickAccessGrid quickAccess={quickAccess} />
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
          <DashboardSectionDisclosure title="Répartition" summary="Poids des blocs administrés">
            <BreakdownPanel breakdown={breakdown} />
          </DashboardSectionDisclosure>
        </div>
      </div>
    </>
  );
}
