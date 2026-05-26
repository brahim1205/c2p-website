import { apiRequest } from '@/lib/api';
import type { OrderStatus } from '@/lib/clientDashboard';
import type { ClientDashboardOrder } from './types';

export async function fetchClientOrders(userId: string) {
  void userId;
  return apiRequest<ClientDashboardOrder[]>('/marketplace/client/orders');
}

export async function updateClientOrderStatus(orderId: number, status: OrderStatus) {
  await apiRequest<ClientDashboardOrder>(`/marketplace/client/orders/${encodeURIComponent(String(orderId))}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
