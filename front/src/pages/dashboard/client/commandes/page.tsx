import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';
import { downloadSimplePdf } from '@/lib/downloads';
import { ORDER_STATUS_META, getPaymentMethodLabel, type OrderStatus } from '@/lib/clientDashboard';
import {
  fetchClientOrders,
  submitClientIssueReport,
  updateClientOrderStatus,
  type ClientDashboardOrder as Order,
  type ClientDashboardOrderDownload as OrderDownload,
} from '@/lib/clientDashboardApi';

interface ReportForm {
  orderId: number | null;
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export default function ClientCommandesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reportForm, setReportForm] = useState<ReportForm>({
    orderId: null,
    reason: '',
    description: '',
    priority: 'medium',
  });

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setOrders(await fetchClientOrders(user.id));
    } catch (loadError) {
      console.error(loadError);
      error('Erreur', 'Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const paymentMethods = useMemo(() => Array.from(new Set(orders.map((order) => order.payment_method))), [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || order.payment_method === paymentFilter;
      const matchesSearch = !normalizedSearch || order.items.some((item) => item.name.toLowerCase().includes(normalizedSearch)) || String(order.id).includes(normalizedSearch);
      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [orders, paymentFilter, search, statusFilter]);

  const downloadOrderInvoice = (order: Order) => {
    downloadSimplePdf(`commande-${order.id}.pdf`, {
      title: `Commande #${order.id}`,
      lines: [
        `Date : ${order.date}`,
        `Statut : ${ORDER_STATUS_META[order.status].label}`,
        `Paiement : ${getPaymentMethodLabel(order.payment_method)}`,
        `Suivi : ${order.tracking || 'Non disponible'}`,
        '',
        ...order.items.map((item) => `${item.name} x${item.quantity} - ${formatCurrency(item.price)}`),
        '',
        `Total : ${formatCurrency(order.total)}`,
      ],
    });
    success('Facture prête', `La facture de la commande #${order.id} a été téléchargée.`);
  };

  const downloadOrderAsset = (order: Order, asset: OrderDownload) => {
    downloadSimplePdf(`${asset.kind}-${order.id}.pdf`, {
      title: `${asset.label} - commande #${order.id}`,
      lines: [
        `Commande : #${order.id}`,
        `Document : ${asset.label}`,
        `Type : ${asset.kind}`,
        `Date : ${order.date}`,
        '',
        'Document de demonstration genere depuis le dashboard client / prestateur.',
      ],
    });
    success('Téléchargement prêt', `${asset.label} a été généré.`);
  };

  const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      await updateClientOrderStatus(orderId, status);
      success('Commande mise à jour', 'Le statut de la commande a été modifié.');
      await loadOrders();
    } catch (updateError) {
      console.error(updateError);
      error('Erreur', 'Impossible de mettre à jour la commande.');
    }
  };

  const openProblemReport = (orderId: number) => {
    setReportForm({
      orderId,
      reason: '',
      description: '',
      priority: 'medium',
    });
  };

  const submitProblemReport = async () => {
    if (!reportForm.orderId || !reportForm.reason.trim() || !reportForm.description.trim() || !user) {
      error('Champs requis', 'Renseignez le motif et la description du problème.');
      return;
    }

    const order = orders.find((item) => item.id === reportForm.orderId);
    if (!order) return;

    try {
      await submitClientIssueReport({
        user,
        targetId: order.id,
        targetTable: 'client_orders',
        targetLabel: `Commande #${order.id}`,
        type: 'Commande',
        reason: reportForm.reason,
        description: `${reportForm.description.trim()}\n\nCommande #${order.id} - ${order.items.map((item) => item.name).join(', ')}`,
        priority: reportForm.priority,
        adminMessage: `${user.firstName} ${user.lastName} a signalé un problème sur la commande #${order.id}.`,
        userMessage: `Votre signalement sur la commande #${order.id} a bien été transmis.`,
        userLink: '/dashboard/client/commandes',
      });

      success('Signalement envoyé', 'Le support a reçu votre signalement.');
      setReportForm({ orderId: null, reason: '', description: '', priority: 'medium' });
    } catch (reportSubmitError) {
      console.error(reportSubmitError);
      error('Erreur', 'Impossible d envoyer le signalement.');
    }
  };

  const reportTarget = reportForm.orderId ? orders.find((item) => item.id === reportForm.orderId) : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client / Prestateur', path: '/dashboard/client' }, { label: 'Mes commandes' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-600">Suivi prestateur</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Mes commandes</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Paiement, avancement, livraison et téléchargements regroupés dans une vue compacte.
              </p>
            </div>
          </div>
        </section>

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
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
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

        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Commandes visibles</h2>
              <p className="text-sm text-gray-500">Chaque carte résume le suivi; les détails restent dans le panneau repliable.</p>
            </div>
          </div>

        <div className="space-y-4">
          {loading ? <p className="text-sm text-gray-500">Chargement des commandes...</p> : null}

          {!loading && filteredOrders.map((order) => {
            const status = ORDER_STATUS_META[order.status];
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="cursor-pointer p-5 hover:bg-gray-50" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
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
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200">
                      <i className={`ri-arrow-down-s-line text-lg text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </button>
                  </div>
                </div>

                {isExpanded ? (
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
                ) : null}
              </div>
            );
          })}
        </div>
        </section>
      </div>

      {reportForm.orderId && reportTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setReportForm({ orderId: null, reason: '', description: '', priority: 'medium' })}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Signaler un problème</h3>
                <p className="text-sm text-gray-600">Commande #{reportTarget.id}</p>
              </div>
              <button onClick={() => setReportForm({ orderId: null, reason: '', description: '', priority: 'medium' })} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-gray-500"></i>
              </button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2 text-sm text-gray-600">
                <span>Motif</span>
                <input
                  type="text"
                  value={reportForm.reason}
                  onChange={(event) => setReportForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Livraison, article, paiement..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
              <label className="block space-y-2 text-sm text-gray-600">
                <span>Priorité</span>
                <select
                  value={reportForm.priority}
                  onChange={(event) => setReportForm((current) => ({ ...current, priority: event.target.value as ReportForm['priority'] }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm text-gray-600">
                <span>Description</span>
                <textarea
                  rows={5}
                  value={reportForm.description}
                  onChange={(event) => setReportForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Décrivez précisément le problème..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button onClick={() => void submitProblemReport()} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700">
                Envoyer le signalement
              </button>
              <button onClick={() => setReportForm({ orderId: null, reason: '', description: '', priority: 'medium' })} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
