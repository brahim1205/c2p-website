import { Link } from 'react-router-dom';
import { ORDER_STATUS_META, getPaymentMethodLabel, type OrderStatus } from '@/lib/clientDashboard';
import type {
  ClientDashboardOrder as Order,
  ClientDashboardOrderDownload as OrderDownload,
} from '@/lib/clientDashboardApi';
import { formatCurrency } from '@/lib/formatters';

export function ClientOrderCard({
  downloadOrderAsset,
  downloadOrderInvoice,
  isExpanded,
  onToggle,
  openProblemReport,
  order,
  updateOrderStatus,
}: {
  downloadOrderAsset: (order: Order, asset: OrderDownload) => void;
  downloadOrderInvoice: (order: Order) => void;
  isExpanded: boolean;
  onToggle: () => void;
  openProblemReport: (orderId: number) => void;
  order: Order;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void | Promise<void>;
}) {
  const status = ORDER_STATUS_META[order.status];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button type="button" className="block w-full cursor-pointer p-5 text-left hover:bg-gray-50" onClick={onToggle}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <i className={`${status.icon} text-xl`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-gray-900">Commande #{order.id}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                <span>{order.date}</span>
                <span className="font-medium text-gray-700">{formatCurrency(order.total)}</span>
                <span>{getPaymentMethodLabel(order.payment_method)}</span>
                {order.tracking ? <span className="font-medium text-teal-600">{order.tracking}</span> : null}
              </div>
              <p className="mt-2 text-sm text-gray-600">{order.items.map((item) => item.name).join(', ')}</p>
            </div>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200">
            <i className={`ri-arrow-down-s-line text-lg text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
          </span>
        </div>
      </button>

      {isExpanded ? (
        <ClientOrderDetails
          downloadOrderAsset={downloadOrderAsset}
          downloadOrderInvoice={downloadOrderInvoice}
          openProblemReport={openProblemReport}
          order={order}
          updateOrderStatus={updateOrderStatus}
        />
      ) : null}
    </div>
  );
}

function ClientOrderDetails({
  downloadOrderAsset,
  downloadOrderInvoice,
  openProblemReport,
  order,
  updateOrderStatus,
}: {
  downloadOrderAsset: (order: Order, asset: OrderDownload) => void;
  downloadOrderInvoice: (order: Order) => void;
  openProblemReport: (orderId: number) => void;
  order: Order;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void | Promise<void>;
}) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-5">
      <div className="mb-4 grid gap-4 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">Qté : {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-gray-900">Téléchargements</div>
          <div className="space-y-2">
            {order.downloads && order.downloads.length > 0 ? order.downloads.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => downloadOrderAsset(order, asset)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>{asset.label}</span>
                <i className="ri-download-line text-gray-400"></i>
              </button>
            )) : (
              <p className="text-sm text-gray-500">Aucun téléchargement disponible pour le moment.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {order.status === 'pending_payment' ? (
          <Link to="/dashboard/paiements" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
            Régler via paiements
          </Link>
        ) : null}
        {(order.status === 'pending_payment' || order.status === 'processing') ? (
          <button onClick={() => void updateOrderStatus(order.id, 'cancelled')} className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
            Annuler la commande
          </button>
        ) : null}
        {order.status === 'delivered' ? (
          <button onClick={() => downloadOrderInvoice(order)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Télécharger la facture
          </button>
        ) : null}
        <button onClick={() => openProblemReport(order.id)} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100">
          Signaler un problème
        </button>
      </div>
    </div>
  );
}
