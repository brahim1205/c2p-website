import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';
import {
  BOOKING_STATUS_META,
  ORDER_STATUS_META,
  REQUEST_TYPE_META,
  getPaymentMethodLabel,
  type BookingRequestType,
  type BookingStatus,
  type OrderStatus,
} from '@/lib/clientDashboard';
import {
  fetchClientDashboardSnapshot,
  type ClientDashboardBooking as Booking,
  type ClientDashboardOrder as Order,
  type ClientFavoriteRow as Favorite,
} from '@/lib/clientDashboardApi';

type DashboardPeriod = 'focus' | 'week' | 'month';

function parseDate(value: string | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function isWithinPeriod(dateValue: string | undefined, period: DashboardPeriod) {
  const date = parseDate(dateValue);
  if (!date) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((date.getTime() - startOfToday.getTime()) / 86_400_000);

  if (period === 'focus') {
    return diffDays >= -2 && diffDays <= 14;
  }

  if (period === 'week') {
    return diffDays >= -7 && diffDays <= 7;
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

const periodLabels: Record<DashboardPeriod, string> = {
  focus: 'À suivre',
  week: '7 jours',
  month: 'Ce mois',
};

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<DashboardPeriod>('focus');
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
      const snapshot = await fetchClientDashboardSnapshot(user.id);
      setReservations(snapshot.bookings);
      setOrders(snapshot.orders);
      setFavorites(snapshot.favorites);
    } catch (loadError) {
      console.error(loadError);
      error('Erreur', 'Impossible de charger l espace client / prestateur.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const scopedReservations = useMemo(
    () => reservations.filter((reservation) => isWithinPeriod(reservation.booking_date, period)),
    [period, reservations],
  );

  const scopedOrders = useMemo(
    () => orders.filter((order) => isWithinPeriod(order.date, period)),
    [orders, period],
  );

  const activeReservations = useMemo(
    () => scopedReservations.filter((reservation) => ['pending', 'confirmed', 'in_progress'].includes(reservation.status)),
    [scopedReservations],
  );

  const activeOrders = useMemo(
    () => scopedOrders.filter((order) => ['pending_payment', 'processing', 'shipped'].includes(order.status)),
    [scopedOrders],
  );

  const openQuotes = useMemo(
    () => activeReservations.filter((reservation) => reservation.request_type === 'quote').length,
    [activeReservations],
  );

  const scopedSpend = useMemo(
    () => scopedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [scopedOrders],
  );

  const typeBreakdown = useMemo(() => {
    const total = Math.max(scopedReservations.length, 1);
    const byType: BookingRequestType[] = ['booking', 'quote', 'appointment'];
    return byType.map((type) => {
      const count = scopedReservations.filter((reservation) => (reservation.request_type || 'booking') === type).length;
      return {
        type,
        count,
        ratio: Math.round((count / total) * 100),
      };
    });
  }, [scopedReservations]);

  const quickLinks = [
    { label: 'Trouver un prestataire', icon: 'ri-search-line', path: '/dashboard/client/prestataires', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Mes réservations', icon: 'ri-calendar-check-line', path: '/dashboard/client/reservations', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Mes commandes', icon: 'ri-shopping-bag-line', path: '/dashboard/client/commandes', tone: 'bg-orange-50 text-orange-700' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements', tone: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client / Prestateur', path: '/dashboard/client' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-600">Espace client / prestateur</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
                Bonjour, {user?.firstName || 'Prestateur'} <span className="align-middle">👋</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Suivez vos demandes, vos commandes et le traitement C2P sans surcharge d’information.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="inline-flex w-full rounded-2xl bg-gray-100 p-1 xl:w-auto">
                {(Object.keys(periodLabels) as DashboardPeriod[]).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setPeriod(entry)}
                    className={`flex-1 rounded-2xl px-4 py-2 text-sm font-medium transition-colors xl:flex-none ${
                      period === entry ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {periodLabels[entry]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
            <Link to="/dashboard/client/prestataires" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              Ouvrir le catalogue
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-gray-200 hover:bg-white ${link.tone}`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <i className={`${link.icon} text-lg`}></i>
                </div>
                <p className="text-sm font-medium">{link.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr,1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">À traiter maintenant</h2>
                  <p className="text-sm text-gray-500">Les éléments qui demandent encore une action de votre part ou un suivi proche.</p>
                </div>
                <Link to="/dashboard/client/reservations" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                  Voir tout
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Demandes et rendez-vous</h3>
                    <span className="text-xs text-gray-400">{activeReservations.length} actif(s)</span>
                  </div>
                  <div className="space-y-3">
                    {loading ? <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement des demandes...</p> : null}
                    {!loading && activeReservations.length === 0 ? (
                      <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Aucune demande active sur cette période.</p>
                    ) : null}
                    {!loading &&
                      activeReservations.slice(0, 3).map((reservation) => {
                        const requestType = REQUEST_TYPE_META[reservation.request_type || 'booking'];
                        const status = BOOKING_STATUS_META[reservation.status];
                        return (
                          <div key={reservation.id} className="rounded-2xl border border-gray-100 px-4 py-4">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <p className="font-medium text-gray-900">{reservation.service}</p>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${requestType.color}`}>{requestType.label}</span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>{status.label}</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {reservation.provider?.name
                                || reservation.requested_provider?.name
                                || reservation.requested_provider_name
                                || 'Équipe C2P'} · {reservation.booking_date}
                              {reservation.booking_time ? ` · ${reservation.booking_time}` : ''}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              <span>{reservation.price ? formatCurrency(reservation.price) : 'Sur devis'}</span>
                              <span className="text-gray-300">•</span>
                              <span>{getPaymentMethodLabel(reservation.payment_method)}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Commandes</h3>
                    <span className="text-xs text-gray-400">{activeOrders.length} en cours</span>
                  </div>
                  <div className="space-y-3">
                    {loading ? <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement des commandes...</p> : null}
                    {!loading && scopedOrders.length === 0 ? (
                      <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Aucune commande sur cette période.</p>
                    ) : null}
                    {!loading &&
                      scopedOrders.slice(0, 3).map((order) => (
                        <div key={order.id} className="rounded-2xl border border-gray-100 px-4 py-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900">Commande #{order.id}</p>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_META[order.status].color}`}>
                              {ORDER_STATUS_META[order.status].label}
                            </span>
                          </div>
                          <p className="truncate text-sm text-gray-500">{order.items.map((item) => item.name).join(', ')}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span className="font-medium text-gray-900">{formatCurrency(order.total)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{getPaymentMethodLabel(order.payment_method)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">Répartition</h2>
                <p className="text-sm text-gray-500">Vos demandes sur la période sélectionnée.</p>
              </div>

              <div className="space-y-4">
                {typeBreakdown.map((item) => (
                  <div key={item.type}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{REQUEST_TYPE_META[item.type].label}</span>
                      <span className="text-gray-500">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          item.type === 'booking' ? 'bg-teal-500' : item.type === 'quote' ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${item.ratio}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-4">
                <div className="text-sm font-medium text-gray-900">Devis à traiter</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{openQuotes}</div>
                <p className="mt-1 text-sm text-gray-500">Demandes de devis encore en attente de retour.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Prestataires favoris</h2>
                <Link to="/dashboard/client/prestataires" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                  Gérer
                </Link>
              </div>

              <div className="space-y-3">
                {loading ? <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement des favoris...</p> : null}
                {!loading && favorites.length === 0 ? (
                  <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Aucun favori enregistré pour le moment.</p>
                ) : null}
                {!loading &&
                  favorites.map((favorite) => (
                    <div key={favorite.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {favorite.provider?.image ? (
                          <img src={favorite.provider.image} alt={favorite.provider.name} className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                            {favorite.provider?.name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{favorite.provider?.name}</p>
                          <p className="truncate text-xs text-gray-500">{favorite.provider?.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-sm font-medium text-gray-900">
                          <i className="ri-star-fill text-xs text-yellow-500"></i>
                          {favorite.provider?.rating?.toFixed(1)}
                        </div>
                        {favorite.provider?.distance_km !== null && favorite.provider?.distance_km !== undefined ? (
                          <p className="text-xs text-gray-500">{favorite.provider.distance_km} km</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Support</h2>
              <p className="mt-1 text-sm text-gray-500">Besoin d’aide sur un devis, une commande ou un rendez-vous.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link to="/dashboard/messages?support=1" className="rounded-2xl bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800">
                  Contacter le support
                </Link>
                <Link to="/dashboard/paiements" className="rounded-2xl border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Voir les paiements
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
