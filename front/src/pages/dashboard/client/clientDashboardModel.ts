import type { ClientDashboardBooking, ClientDashboardOrder } from '@/lib/clientDashboardApi';

export type DashboardPeriod = 'focus' | 'week' | 'month';

export const periodLabels: Record<DashboardPeriod, string> = {
  focus: 'À suivre',
  week: '7 jours',
  month: 'Ce mois',
};

export const clientQuickLinks = [
  { label: 'Trouver un prestataire', icon: 'ri-search-line', path: '/dashboard/client/prestataires', tone: 'bg-teal-50 text-teal-700' },
  { label: 'Mes réservations', icon: 'ri-calendar-check-line', path: '/dashboard/client/reservations', tone: 'bg-sky-50 text-sky-700' },
  { label: 'Mes commandes', icon: 'ri-shopping-bag-line', path: '/dashboard/client/commandes', tone: 'bg-orange-50 text-orange-700' },
  { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements', tone: 'bg-violet-50 text-violet-700' },
];

function parseDate(value: string | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function isWithinPeriod(dateValue: string | undefined, period: DashboardPeriod) {
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

export function getActiveReservations(reservations: ClientDashboardBooking[]) {
  return reservations.filter((reservation) => ['pending', 'confirmed', 'in_progress'].includes(reservation.status));
}

export function getActiveOrders(orders: ClientDashboardOrder[]) {
  return orders.filter((order) => ['pending_payment', 'processing', 'shipped'].includes(order.status));
}
