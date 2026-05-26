import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';
import {
  BOOKING_STATUS_META,
  ORDER_STATUS_META,
  REQUEST_TYPE_META,
  getPaymentMethodLabel,
} from '@/lib/clientDashboard';
import type { ClientDashboardBooking, ClientDashboardOrder, ClientFavoriteRow } from '@/lib/clientDashboardApi';
import { clientQuickLinks, periodLabels, type DashboardPeriod } from './clientDashboardModel';

export function ClientDashboardHero({
  firstName,
  period,
  onPeriodChange,
}: {
  firstName?: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal-600">Espace client / prestataire</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
            Bonjour, {firstName || 'Prestataire'} <span className="align-middle">👋</span>
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
                onClick={() => onPeriodChange(entry)}
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
  );
}

export function ClientQuickAccessPanel() {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
        <Link to="/dashboard/client/prestataires" className="text-sm font-medium text-teal-600 hover:text-teal-700">
          Ouvrir le catalogue
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {clientQuickLinks.map((link) => (
          <Link key={link.path} to={link.path} className={`rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-gray-200 hover:bg-white ${link.tone}`}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <i className={`${link.icon} text-lg`} />
            </div>
            <p className="text-sm font-medium">{link.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ClientActionsPanel({
  activeOrders,
  activeReservations,
  loading,
  scopedOrders,
}: {
  activeOrders: ClientDashboardOrder[];
  activeReservations: ClientDashboardBooking[];
  loading: boolean;
  scopedOrders: ClientDashboardOrder[];
}) {
  return (
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
        <ReservationSummary loading={loading} activeReservations={activeReservations} />
        <OrdersSummary loading={loading} scopedOrders={scopedOrders} activeOrdersCount={activeOrders.length} />
      </div>
    </section>
  );
}

export function ClientFavoritesPanel({ favorites, loading }: { favorites: ClientFavoriteRow[]; loading: boolean }) {
  return (
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
        {!loading && favorites.map((favorite) => <FavoriteProviderRow key={favorite.id} favorite={favorite} />)}
      </div>
    </section>
  );
}

export function ClientSupportPanel() {
  return (
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
  );
}

function ReservationSummary({ loading, activeReservations }: { loading: boolean; activeReservations: ClientDashboardBooking[] }) {
  return (
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
        {!loading && activeReservations.slice(0, 3).map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)}
      </div>
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: ClientDashboardBooking }) {
  const requestType = REQUEST_TYPE_META[reservation.request_type || 'booking'];
  const status = BOOKING_STATUS_META[reservation.status];

  return (
    <div className="rounded-2xl border border-gray-100 px-4 py-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="font-medium text-gray-900">{reservation.service}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${requestType.color}`}>{requestType.label}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>
      <p className="text-sm text-gray-500">
        {reservation.provider?.name || reservation.requested_provider?.name || reservation.requested_provider_name || 'Équipe C2P'} · {reservation.booking_date}
        {reservation.booking_time ? ` · ${reservation.booking_time}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>{reservation.price ? formatCurrency(reservation.price) : 'Sur devis'}</span>
        <span className="text-gray-300">•</span>
        <span>{getPaymentMethodLabel(reservation.payment_method)}</span>
      </div>
    </div>
  );
}

function OrdersSummary({
  loading,
  scopedOrders,
  activeOrdersCount,
}: {
  loading: boolean;
  scopedOrders: ClientDashboardOrder[];
  activeOrdersCount: number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Commandes</h3>
        <span className="text-xs text-gray-400">{activeOrdersCount} en cours</span>
      </div>
      <div className="space-y-3">
        {loading ? <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement des commandes...</p> : null}
        {!loading && scopedOrders.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Aucune commande sur cette période.</p>
        ) : null}
        {!loading && scopedOrders.slice(0, 3).map((order) => <OrderCard key={order.id} order={order} />)}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: ClientDashboardOrder }) {
  return (
    <div className="rounded-2xl border border-gray-100 px-4 py-4">
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
  );
}

function FavoriteProviderRow({ favorite }: { favorite: ClientFavoriteRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-4 py-4">
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
          <i className="ri-star-fill text-xs text-yellow-500" />
          {favorite.provider?.rating?.toFixed(1)}
        </div>
        {favorite.provider?.distance_km !== null && favorite.provider?.distance_km !== undefined ? (
          <p className="text-xs text-gray-500">{favorite.provider.distance_km} km</p>
        ) : null}
      </div>
    </div>
  );
}
