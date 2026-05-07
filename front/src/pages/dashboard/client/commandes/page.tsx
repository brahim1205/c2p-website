import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';
import { downloadHtmlFile } from '@/lib/downloads';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  client_id: string;
  date: string;
  status: 'pending_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  tracking?: string | null;
  payment_method: string;
}

const statusConfig: Record<Order['status'], { label: string; color: string; step: number; icon: string }> = {
  pending_payment: { label: 'Paiement en attente', color: 'bg-orange-100 text-orange-700', step: 1, icon: 'ri-money-dollar-circle-line' },
  processing: { label: 'En preparation', color: 'bg-[#14B8A6]/10 text-[#14B8A6]', step: 2, icon: 'ri-box-3-line' },
  shipped: { label: 'Expediee', color: 'bg-amber-100 text-amber-700', step: 3, icon: 'ri-truck-line' },
  delivered: { label: 'Livree', color: 'bg-green-100 text-green-700', step: 4, icon: 'ri-check-double-line' },
  cancelled: { label: 'Annulee', color: 'bg-red-100 text-red-700', step: 0, icon: 'ri-close-circle-line' },
};

export default function ClientCommandesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: apiError } = await backendClient
        .from('client_orders')
        .select('*')
        .eq('client_id', user.id)
        .order('date', { ascending: false });
      if (apiError) throw new Error(apiError.message);
      setOrders((data as Order[]) || []);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => (
    statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)
  ), [orders, statusFilter]);

  const updateOrderStatus = async (orderId: number, status: Order['status']) => {
    try {
      const { error: apiError } = await backendClient
        .from('client_orders')
        .update({ status })
        .eq('id', orderId);
      if (apiError) throw new Error(apiError.message);
      success('Commande mise a jour', 'Le statut de la commande a ete modifie.');
      loadOrders();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre a jour la commande.');
    }
  };

  const downloadOrderInvoice = (order: Order) => {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Commande-${order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f7f7f7; margin: 0; padding: 40px; color: #111; }
    main { max-width: 760px; margin: 0 auto; background: white; border-radius: 20px; border: 1px solid #e5e7eb; padding: 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #ececec; }
  </style>
</head>
<body>
  <main>
    <h1>Facture commande #${order.id}</h1>
    <p>Date : ${order.date}</p>
    <p>Statut : ${statusConfig[order.status].label}</p>
    <table>
      <thead><tr><th>Article</th><th>Quantite</th><th>Prix</th></tr></thead>
      <tbody>${order.items.map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td></tr>`).join('')}</tbody>
    </table>
    <p style="margin-top: 24px; font-weight: 700;">Total : ${formatCurrency(order.total)}</p>
  </main>
</body>
</html>`;
    downloadHtmlFile(`commande-${order.id}.html`, html);
    success('Facture prete', `La facture de la commande #${order.id} a ete telechargee.`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client', path: '/dashboard/client' }, { label: 'Mes commandes' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes commandes</h1>
          <p className="text-gray-600">Suivi des commandes, des paiements et des livraisons depuis le backend local.</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === status ? 'bg-[#14B8A6] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              {status === 'all' ? 'Toutes' : statusConfig[status].label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Chargement des commandes...</p>}

          {!loading && filteredOrders.map((order) => {
            const status = statusConfig[order.status];
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-[#14B8A6]/10 rounded-lg flex items-center justify-center text-[#14B8A6]">
                        <i className={`${status.icon} text-xl`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">Commande #{order.id}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span>{order.date}</span>
                          <span className="font-medium text-gray-700">{formatCurrency(order.total)}</span>
                          <span>{order.payment_method}</span>
                          {order.tracking && <span className="text-[#14B8A6] font-medium">{order.tracking}</span>}
                        </div>
                      </div>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200">
                      <i className={`ri-arrow-down-s-line text-gray-500 text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-5 bg-gray-50">
                    <div className="space-y-3 mb-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">Qté : {item.quantity}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {order.status === 'pending_payment' && (
                        <button onClick={() => updateOrderStatus(order.id, 'processing')} className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]">
                          Marquer payee
                        </button>
                      )}
                      {(order.status === 'pending_payment' || order.status === 'processing') && (
                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                          Annuler
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <button onClick={() => downloadOrderInvoice(order)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                          Telecharger la facture
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
