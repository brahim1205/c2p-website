import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import GlobalSearch from '../components/GlobalSearch';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';

interface Booking {
  id: number;
  provider_id: number;
  service: string;
  booking_date: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'in_progress';
  provider?: { name?: string; image?: string | null } | null;
}

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

interface Favorite {
  id: number;
  provider?: {
    id: number;
    name: string;
    title: string;
    rating: number;
    image: string | null;
  } | null;
}

const statusConfig: Record<Booking['status'], { label: string; color: string }> = {
  confirmed: { label: 'Confirmee', color: 'text-green-600 bg-green-50' },
  pending: { label: 'En attente', color: 'text-amber-600 bg-amber-50' },
  completed: { label: 'Terminee', color: 'text-[#14B8A6] bg-[#14B8A6]/10' },
  cancelled: { label: 'Annulee', color: 'text-red-600 bg-red-50' },
  in_progress: { label: 'En cours', color: 'text-blue-600 bg-blue-50' },
};

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [bookingsRes, ordersRes, favoritesRes] = await Promise.all([
        backendClient.from('bookings').select('*').eq('client_id', user.id).order('created_at', { ascending: false }).limit(4),
        backendClient.from('client_orders').select('*').eq('client_id', user.id).order('date', { ascending: false }).limit(4),
        backendClient.from('client_favorites').select('*').eq('client_id', user.id).order('added_at', { ascending: false }).limit(4),
      ]);

      if (bookingsRes.error) throw new Error(bookingsRes.error.message);
      if (ordersRes.error) throw new Error(ordersRes.error.message);
      if (favoritesRes.error) throw new Error(favoritesRes.error.message);

      setReservations((bookingsRes.data as Booking[]) || []);
      setOrders((ordersRes.data as Order[]) || []);
      setFavorites((favoritesRes.data as Favorite[]) || []);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger l espace client.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => [
    { label: 'Reservations actives', value: reservations.filter((item) => item.status === 'confirmed' || item.status === 'in_progress').length, icon: 'ri-calendar-check-line', color: 'bg-teal-600' },
    { label: 'Commandes en cours', value: orders.filter((item) => item.status === 'processing' || item.status === 'shipped' || item.status === 'pending_payment').length, icon: 'ri-shopping-bag-line', color: 'bg-orange-500' },
    { label: 'Prestataires favoris', value: favorites.length, icon: 'ri-heart-line', color: 'bg-pink-500' },
    { label: 'Historique termine', value: reservations.filter((item) => item.status === 'completed').length, icon: 'ri-check-double-line', color: 'bg-green-500' },
  ], [favorites.length, orders, reservations]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client', path: '/dashboard/client' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon espace client</h1>
          <p className="text-gray-600">Reservations, commandes et prestataires favoris sur une seule vue.</p>
        </div>

        <GlobalSearch context="client" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                  <i className={`${stat.icon} text-sm`}></i>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Actions rapides</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Trouver prestataire', icon: 'ri-search-line', link: '/dashboard/client/prestataires', color: 'bg-teal-600' },
                  { label: 'Mes reservations', icon: 'ri-calendar-check-line', link: '/dashboard/client/reservations', color: 'bg-teal-600' },
                  { label: 'Mes commandes', icon: 'ri-shopping-bag-line', link: '/dashboard/client/commandes', color: 'bg-orange-600' },
                  { label: 'Explorer formations', icon: 'ri-graduation-cap-line', link: '/espace-numerique', color: 'bg-[#14B8A6]' },
                ].map((action) => (
                  <Link key={action.link} to={action.link} className={`${action.color} text-white rounded-lg p-4 hover:opacity-90 transition-opacity text-center`}>
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <i className={`${action.icon} text-sm`}></i>
                    </div>
                    <p className="text-xs font-medium">{action.label}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Reservations recentes</h2>
                <Link to="/dashboard/client/reservations" className="text-sm text-teal-600 hover:text-teal-700 font-medium">Voir tout</Link>
              </div>
              <div className="space-y-3">
                {loading && <p className="text-sm text-gray-500">Chargement des reservations...</p>}
                {!loading && reservations.map((reservation) => {
                  const status = statusConfig[reservation.status];
                  return (
                    <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        {reservation.provider?.image ? (
                          <img src={reservation.provider.image} alt={reservation.provider.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                            {(reservation.provider?.name || reservation.service).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{reservation.service}</p>
                          <p className="text-xs text-gray-500">{reservation.provider?.name || 'Prestataire'} · {reservation.booking_date}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Commandes recentes</h2>
                <Link to="/dashboard/client/commandes" className="text-sm text-teal-600 hover:text-teal-700 font-medium">Voir tout</Link>
              </div>
              <div className="space-y-3">
                {loading && <p className="text-sm text-gray-500">Chargement des commandes...</p>}
                {!loading && orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Commande #{order.id}</p>
                      <p className="text-xs text-gray-500">{order.items.map((item) => item.name).join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-gray-500">{order.status} · {order.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Prestataires favoris</h2>
                <Link to="/dashboard/client/prestataires" className="text-sm text-teal-600 hover:text-teal-700 font-medium">Voir tout</Link>
              </div>
              <div className="space-y-3">
                {loading && <p className="text-sm text-gray-500">Chargement des favoris...</p>}
                {!loading && favorites.map((favorite) => (
                  <div key={favorite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      {favorite.provider?.image ? (
                        <img src={favorite.provider.image} alt={favorite.provider.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                          {favorite.provider?.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{favorite.provider?.name}</p>
                        <p className="text-xs text-gray-500">{favorite.provider?.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="ri-star-fill text-yellow-500 text-xs"></i>
                      <span className="text-sm font-medium text-gray-900">{favorite.provider?.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#0f766e] bg-[#0f766e] p-6 text-white">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/16">
                <i className="ri-graduation-cap-line"></i>
              </div>
              <h3 className="font-bold text-lg mb-2">Continuer votre progression</h3>
              <p className="mb-4 text-sm text-white/78">Le meme compte donne acces aux prestations, aux formations et aux projets C2P.</p>
              <Link to="/espace-numerique" className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0f766e] hover:bg-[#f3f7f6]">
                Explorer
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Support</h2>
              <p className="text-sm text-gray-600 mb-4">Notre equipe reste disponible pour vos reservations et commandes.</p>
              <Link to="/dashboard/messages" className="block w-full rounded-lg bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800">
                Contacter le support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
