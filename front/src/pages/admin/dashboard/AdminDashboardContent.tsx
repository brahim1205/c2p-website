import {
  BreakdownPanel,
  CommandCenterPanel,
  DashboardHeader,
  DashboardSectionDisclosure,
  KpiGrid,
  MonetizationPanel,
  PendingActionsPanel,
  ProviderHealthPanel,
  RecentRegistrationsPanel,
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
  ProviderRuntimeBadge,
  RecentRegistrationItem,
  RevenueBar,
  TimeRange,
} from './adminDashboardContentModel';

interface AdminDashboardContentProps {
  breakdown: BreakdownItem[];
  commissionTotal: number;
  dexPayStatus: DexPayStatus | null;
  financeProviderSignals: FinanceProviderSignal[];
  history: HistoryItem[];
  isSuperAdmin: boolean;
  kpis: KpiCard[];
  loading: boolean;
  managerName: string;
  onExport: () => void;
  onRefreshActivity: () => void;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  pendingActions: PendingAction[];
  providerRuntimeBadge: ProviderRuntimeBadge;
  recentRegistrations: RecentRegistrationItem[];
  revenueBars: RevenueBar[];
  activeEscrowCount: number;
  activeSubscriptionCount: number;
  timeRange: TimeRange;
}

export default function AdminDashboardContent({
  breakdown,
  commissionTotal,
  dexPayStatus,
  financeProviderSignals,
  history,
  isSuperAdmin,
  kpis,
  loading,
  managerName,
  onExport,
  onRefreshActivity,
  onTimeRangeChange,
  pendingActions,
  providerRuntimeBadge,
  recentRegistrations,
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
        pendingRequestCount={pendingActions.find((item) => item.label === 'Demandes a assigner')?.count ?? 0}
      />

      <div className="grid gap-4">
        <KpiGrid kpis={kpis} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PendingActionsPanel pendingActions={pendingActions} />
        <RecentRegistrationsPanel recentRegistrations={recentRegistrations} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr),340px]">
        <RecentActivityPanel history={history} loading={loading} onRefreshActivity={onRefreshActivity} />
        <MonetizationPanel
          activeEscrowCount={activeEscrowCount}
          activeSubscriptionCount={activeSubscriptionCount}
          commissionTotal={commissionTotal}
        />
      </div>

      <div className="mt-4">
        <DashboardSectionDisclosure title="Pilotage avancé" summary="Analytique, répartition et supervision technique">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1fr,340px]">
              <RevenueBarsPanel revenueBars={revenueBars} />
              <BreakdownPanel breakdown={breakdown} />
            </div>
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
    </>
  );
}
