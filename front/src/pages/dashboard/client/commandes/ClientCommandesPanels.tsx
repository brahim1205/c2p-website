import { ORDER_STATUS_META, getPaymentMethodLabel, type OrderStatus } from '@/lib/clientDashboard';
import type {
  ClientDashboardOrder as Order,
  ClientDashboardOrderDownload as OrderDownload,
} from '@/lib/clientDashboardApi';
import { ClientOrderCard } from './ClientOrderCard';
export { ClientIssueReportModal } from './ClientIssueReportModal';

export function ClientCommandesHero() {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-teal-600">Suivi prestateur</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Mes commandes</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
          Paiement, avancement, livraison et téléchargements regroupés dans une vue compacte.
        </p>
      </div>
    </section>
  );
}

export function ClientCommandesFilters({
  paymentFilter,
  paymentMethods,
  search,
  setPaymentFilter,
  setSearch,
  setStatusFilter,
  statusFilter,
}: {
  paymentFilter: string;
  paymentMethods: string[];
  search: string;
  setPaymentFilter: (value: string) => void;
  setSearch: (value: string) => void;
  setStatusFilter: (value: 'all' | OrderStatus) => void;
  statusFilter: 'all' | OrderStatus;
}) {
  return (
    <section className="mb-6 space-y-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Filtres de commandes</h2>
        <p className="text-sm text-gray-500">Réduisez la liste par article, paiement ou statut sans surcharger l’écran.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[2fr,1fr,1fr]">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une commande ou un article..."
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
        />
        <select
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="all">Tous les paiements</option>
          {paymentMethods.map((method) => <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | OrderStatus)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="all">Tous les statuts</option>
          {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((status) => <option key={status} value={status}>{ORDER_STATUS_META[status].label}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${statusFilter === status ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {status === 'all' ? 'Toutes' : ORDER_STATUS_META[status].label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ClientCommandesList({
  downloadOrderAsset,
  downloadOrderInvoice,
  expandedOrder,
  filteredOrders,
  loading,
  openProblemReport,
  setExpandedOrder,
  updateOrderStatus,
}: {
  downloadOrderAsset: (order: Order, asset: OrderDownload) => void;
  downloadOrderInvoice: (order: Order) => void;
  expandedOrder: number | null;
  filteredOrders: Order[];
  loading: boolean;
  openProblemReport: (orderId: number) => void;
  setExpandedOrder: (orderId: number | null) => void;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void | Promise<void>;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Commandes visibles</h2>
          <p className="text-sm text-gray-500">Chaque carte résume le suivi; les détails restent dans le panneau repliable.</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-sm text-gray-500">Chargement des commandes...</p> : null}

        {!loading && filteredOrders.map((order) => (
          <ClientOrderCard
            key={order.id}
            downloadOrderAsset={downloadOrderAsset}
            downloadOrderInvoice={downloadOrderInvoice}
            isExpanded={expandedOrder === order.id}
            onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
            openProblemReport={openProblemReport}
            order={order}
            updateOrderStatus={updateOrderStatus}
          />
        ))}
      </div>
    </section>
  );
}
