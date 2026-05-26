import { apiRequest } from '@/lib/api';
import type { ClientDashboardBooking, ClientDashboardOrder, ClientFavoriteRow } from './types';

export async function fetchClientDashboardSnapshot(userId: string) {
  void userId;
  return apiRequest<{
    bookings: ClientDashboardBooking[];
    orders: ClientDashboardOrder[];
    favorites: ClientFavoriteRow[];
  }>('/marketplace/client/dashboard');
}
