import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { formatShortCurrency } from '@/lib/formatters';
import type {
  BreakdownItem,
  HistoryItem,
  KpiCard,
  PendingAction,
  QuickAccessItem,
  RevenueBar,
  TimeRange,
} from './adminDashboardContentModel';

export { ProviderHealthPanel } from './AdminDashboardProviderHealthPanel';
export { C2PRequestsPanel } from './AdminDashboardRequestsPanel';

export function DashboardHeader({
  managerName,
  timeRange,
  onTimeRangeChange,
  onExport,
}: {
  managerName: string;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  onExport: () => void;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-3xl border border-teal-100 bg-[linear-gradient(135deg,#ffffff_0%,#f0fdfa_52%,#ecfccb_100%)] px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Administration</p>
          <h1 className="mt-3 text-2xl font-black text-gray-950 md:text-3xl">
            Bonjour, {managerName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Votre poste de pilotage : priorités, demandes et actions rapides.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
          <div className="inline-flex overflow-x-auto rounded-full bg-gray-100 p-1" role="group" aria-label="Période d'analyse">
            {[
              { key: 'today', label: 'Aujourd’hui' },
              { key: 'week', label: 'Cette semaine' },
              { key: 'month', label: 'Ce mois' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onTimeRangeChange(item.key as TimeRange)}
                aria-pressed={timeRange === item.key}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  timeRange === item.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onExport}
            aria-label="Exporter le snapshot administrateur"
            className="rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            Exporter
          </button>
        </div>
      </div>
    </section>
  );
}

export function CommandCenterPanel({
  loading,
  pendingActions,
  pendingRequestCount,
}: {
  loading: boolean;
  pendingActions: PendingAction[];
  pendingRequestCount: number;
}) {
  const totalPending = pendingActions.reduce((sum, item) => sum + item.count, 0);
  const topActions = [...pendingActions].sort((left, right) => right.count - left.count).slice(0, 3);
  const statusTone = totalPending > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200';

  return (
    <section className="mb-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">À traiter maintenant</p>
          <h2 className="mt-2 text-2xl font-black text-gray-950">
            {loading ? 'Chargement des priorités...' : `${totalPending} action${totalPending > 1 ? 's' : ''} en attente`}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Les priorités sont limitées ici aux actions qui demandent une décision.
          </p>
        </div>
        <div className={`w-fit rounded-2xl border px-4 py-3 text-sm font-bold ${statusTone}`}>
          {totalPending > 0 ? 'Action requise' : 'Plateforme stable'}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-4 lg:col-span-1">
          <p className="text-2xl font-black text-cyan-950">{pendingRequestCount}</p>
          <p className="mt-1 text-sm font-bold text-cyan-900">demande{pendingRequestCount > 1 ? 's' : ''} C2P à assigner</p>
        </div>
        <div className="grid gap-2 lg:col-span-3 lg:grid-cols-3">
          {topActions.map((action) => (
            <Link
              key={action.label}
              to={action.link}
              className={`group flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                action.count > 0 ? 'border-teal-100 bg-teal-50/60' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{action.label}</p>
                <p className="mt-1 text-xs font-semibold text-teal-700 group-hover:text-teal-800">Ouvrir</p>
              </div>
              <span className="text-2xl font-black text-gray-950">{action.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KpiGrid({ kpis }: { kpis: KpiCard[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {kpis.map((item) => (
        <div key={item.label} className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-gray-500 sm:text-sm">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{item.value}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{item.detail}</p>
            </div>
            <div className={`hidden h-11 w-11 flex-none items-center justify-center rounded-xl sm:flex ${item.surface}`}>
              <i className={`${item.icon} text-xl`} />
            </div>
          </div>
          <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <i className="ri-arrow-up-line mr-1" />{item.trend}
          </div>
        </div>
      ))}
    </section>
  );
}

export function QuickAccessGrid({ quickAccess }: { quickAccess: QuickAccessItem[] }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-black text-gray-900">Accès rapide</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {quickAccess.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`rounded-xl px-3 py-3 transition-colors hover:opacity-90 ${item.tone}`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/80">
                <i className={`${item.icon} text-base`} />
              </span>
              <p className="truncate text-left text-xs font-semibold sm:text-sm">{item.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardSectionDisclosure({
  children,
  summary,
  title,
}: {
  children: ReactNode;
  summary: string;
  title: string;
}) {
  return (
    <details className="group rounded-3xl border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-base font-black text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{summary}</p>
        </div>
        <i className="ri-arrow-down-s-line text-xl text-gray-400 transition group-open:rotate-180"></i>
      </summary>
      <div className="border-t border-gray-100 p-4">
        {children}
      </div>
    </details>
  );
}

export function RevenueBarsPanel({ revenueBars }: { revenueBars: RevenueBar[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Évolution des revenus</h2>
        </div>
        <Link to="/admin/analytics" className="text-sm font-medium text-teal-600 hover:text-teal-700">Voir rapports</Link>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid h-[190px] min-w-[24rem] grid-cols-7 items-end gap-3">
          {revenueBars.map((item) => (
            <div key={item.label} className="flex h-full flex-col justify-end">
              <div className="mb-2 text-center text-xs font-medium text-gray-500">
                {item.amount > 0 ? formatShortCurrency(item.amount) : '0'}
              </div>
              <div
                className={`w-full rounded-t-2xl ${item.amount > 0 ? 'bg-teal-500' : 'bg-gray-200'}`}
                style={{ height: `${item.height}px` }}
              />
              <div className="mt-3 text-center text-sm font-medium text-gray-600">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PendingActionsPanel({ pendingActions }: { pendingActions: PendingAction[] }) {
  const sortedActions = [...pendingActions].sort((left, right) => right.count - left.count);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Toutes les priorités</h2>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {pendingActions.reduce((sum, item) => sum + item.count, 0)} à traiter
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {sortedActions.map((action) => (
          <Link
            key={action.label}
            to={action.link}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors ${
              action.count > 0 ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-75'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${action.color} text-white`}>
                <i className={`${action.icon} text-base`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{action.label}</p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-900">{action.count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MonetizationPanel({
  activeEscrowCount,
  activeSubscriptionCount,
  commissionTotal,
}: {
  activeEscrowCount: number;
  activeSubscriptionCount: number;
  commissionTotal: number;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-gray-900">Monétisation C2P</h2>
      </div>
      <div className="grid gap-2">
        <div className="rounded-xl bg-gray-50 px-3 py-3">
          <p className="text-sm text-gray-500">Abonnements actifs</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{activeSubscriptionCount}</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-3">
          <p className="text-sm text-gray-500">Séquestres en cours</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{activeEscrowCount}</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-3">
          <p className="text-sm text-gray-500">Ledger reconnu</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{commissionTotal.toLocaleString('fr-FR')} FCFA</p>
        </div>
      </div>
    </section>
  );
}

export function BreakdownPanel({ breakdown }: { breakdown: BreakdownItem[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Répartition</h2>
      </div>

      <div className="space-y-3">
        {breakdown.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="text-gray-500">{item.ratio}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${item.ratio}%` }} />
            </div>
            <div className="mt-1 text-xs text-gray-500">{item.value} élément(s)</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentActivityPanel({
  history,
  loading,
  onRefreshActivity,
}: {
  history: HistoryItem[];
  loading: boolean;
  onRefreshActivity: () => void;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Activité récente</h2>
        </div>
        <button
          type="button"
          aria-label="Actualiser l'activité récente"
          onClick={onRefreshActivity}
          className="text-sm font-medium text-teal-600 hover:text-teal-700"
        >
          Actualiser
        </button>
      </div>

      <div className="space-y-2">
        {loading && <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement de l’activité...</p>}
        {!loading && history.slice(0, 6).map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <i className="ri-notification-3-line" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{entry.action}</p>
              <p className="mt-1 text-sm text-gray-600">{entry.user}</p>
              <p className="mt-1 text-xs text-gray-500">{entry.date}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
