import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';
import { downloadSimplePdf } from '@/lib/downloads';
import { queryKeys } from '@/lib/queryKeys';
import { ORDER_STATUS_META, getPaymentMethodLabel, type OrderStatus } from '@/lib/clientDashboard';
import {
  fetchClientOrders,
  submitClientIssueReport,
  updateClientOrderStatus,
  type ClientDashboardOrder as Order,
  type ClientDashboardOrderDownload as OrderDownload,
} from '@/lib/clientDashboardApi';
import {
  ClientCommandesFilters,
  ClientCommandesHero,
  ClientCommandesList,
  ClientIssueReportModal,
} from './ClientCommandesPanels';
import { emptyReportForm, type ReportForm } from './clientCommandesModel';

export default function ClientCommandesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>(emptyReportForm);

  const ordersQuery = useQuery({
    queryKey: queryKeys.client.orders(user?.id),
    queryFn: () => fetchClientOrders(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (ordersQuery.isError) {
      console.error(ordersQuery.error);
      error('Erreur', 'Impossible de charger les commandes.');
    }
  }, [error, ordersQuery.error, ordersQuery.isError]);

  const loading = ordersQuery.isLoading;
  const orders: Order[] = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.client.orders(user?.id) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.client.dashboard(user?.id) });
  };

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
        'Document généré depuis votre espace client C2P.',
      ],
    });
    success('Téléchargement prêt', `${asset.label} a été généré.`);
  };

  const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      await updateClientOrderStatus(orderId, status);
      success('Commande mise à jour', 'Le statut de la commande a été modifié.');
      await refreshOrders();
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
      setReportForm(emptyReportForm);
    } catch (reportSubmitError) {
      console.error(reportSubmitError);
      error('Erreur', 'Impossible d envoyer le signalement.');
    }
  };

  const reportTarget = reportForm.orderId ? orders.find((item) => item.id === reportForm.orderId) : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client', path: '/dashboard/client' }, { label: 'Mes commandes' }]} />
        <ClientCommandesHero />
        <ClientCommandesFilters
          paymentFilter={paymentFilter}
          paymentMethods={paymentMethods}
          search={search}
          setPaymentFilter={setPaymentFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          statusFilter={statusFilter}
        />
        <ClientCommandesList
          downloadOrderAsset={downloadOrderAsset}
          downloadOrderInvoice={downloadOrderInvoice}
          expandedOrder={expandedOrder}
          filteredOrders={filteredOrders}
          loading={loading}
          openProblemReport={openProblemReport}
          setExpandedOrder={setExpandedOrder}
          updateOrderStatus={updateOrderStatus}
        />
      </div>

      {reportForm.orderId && reportTarget ? (
        <ClientIssueReportModal
          reportForm={reportForm}
          reportTarget={reportTarget}
          setReportForm={setReportForm}
          submitProblemReport={submitProblemReport}
        />
      ) : null}
    </DashboardLayout>
  );
}
