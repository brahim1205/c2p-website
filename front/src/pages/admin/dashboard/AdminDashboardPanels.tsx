import { Link } from 'react-router-dom';
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
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal-600">Administration</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 md:text-4xl">
            Bonjour, {managerName} <span className="align-middle">👋</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
            Vue d’ensemble des validations, contenus, paiements et signaux de supervision.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="inline-flex rounded-full bg-gray-100 p-1" role="group" aria-label="Période d'analyse">
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
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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
            className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            Exporter
          </button>
        </div>
      </div>
    </section>
  );
}

export function KpiGrid({ kpis }: { kpis: KpiCard[] }) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((item) => (
        <div key={item.label} className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
              <p className="mt-1 text-sm text-gray-500">{item.detail}</p>
            </div>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.surface}`}>
              <i className={`${item.icon} text-2xl`} />
            </div>
          </div>
          <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            <i className="ri-arrow-up-line mr-1" />{item.trend}
          </div>
        </div>
      ))}
    </section>
  );
}

export function QuickAccessGrid({ quickAccess }: { quickAccess: QuickAccessItem[] }) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
        <p className="text-sm text-gray-500">Les modules que l’administration utilise le plus souvent.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {quickAccess.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`rounded-2xl px-4 py-5 text-center transition-colors hover:opacity-90 ${item.tone}`}
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80">
              <i className={`${item.icon} text-xl`} />
            </div>
            <p className="text-sm font-medium">{item.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RevenueBarsPanel({ revenueBars }: { revenueBars: RevenueBar[] }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Évolution des revenus</h2>
          <p className="text-sm text-gray-500">Derniers 7 jours de revenus observés sur les flux suivis.</p>
        </div>
        <Link to="/admin/analytics" className="text-sm font-medium text-teal-600 hover:text-teal-700">Voir rapports</Link>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid h-[260px] min-w-[28rem] grid-cols-7 items-end gap-4">
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
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Actions prioritaires</h2>
          <p className="text-sm text-gray-500">Les éléments qui demandent une décision rapide de l’administration.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {pendingActions.reduce((sum, item) => sum + item.count, 0)} à traiter
        </span>
      </div>

      <div className="space-y-3">
        {pendingActions.map((action) => (
          <Link
            key={action.label}
            to={action.link}
            className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 px-4 py-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${action.color} text-white`}>
                <i className={`${action.icon} text-base`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-gray-900">{action.count}</span>
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
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Monétisation C2P</h2>
        <p className="text-sm text-gray-500">Vue rapide sur l’abonnement, les séquestres et le revenu plateforme.</p>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl bg-gray-50 px-4 py-4">
          <p className="text-sm text-gray-500">Abonnements actifs</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{activeSubscriptionCount}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-4 py-4">
          <p className="text-sm text-gray-500">Séquestres en cours</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{activeEscrowCount}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-4 py-4">
          <p className="text-sm text-gray-500">Ledger reconnu</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{commissionTotal.toLocaleString('fr-FR')} FCFA</p>
        </div>
      </div>
    </section>
  );
}

export function BreakdownPanel({ breakdown }: { breakdown: BreakdownItem[] }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Répartition</h2>
        <p className="text-sm text-gray-500">Poids relatif des grands blocs de gestion administrés.</p>
      </div>

      <div className="space-y-4">
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
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Activité récente</h2>
          <p className="text-sm text-gray-500">Dernières actions structurantes sur la plateforme.</p>
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

      <div className="space-y-3">
        {loading && <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement de l’activité...</p>}
        {!loading && history.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
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
