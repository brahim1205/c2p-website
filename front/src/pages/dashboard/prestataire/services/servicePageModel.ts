import type { PrestataireService as Service } from '@/lib/prestataireDashboardApi';

export type ServiceStatusFilter = 'all' | 'active' | 'paused' | 'pending';

export const SERVICE_STATUS_FILTERS: ServiceStatusFilter[] = ['all', 'active', 'paused', 'pending'];

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  paused: 'En pause',
  pending: 'En attente',
};

export const SERVICE_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  pending: 'bg-blue-100 text-blue-700',
};

export function getServiceStatusFilterLabel(status: ServiceStatusFilter) {
  if (status === 'all') return 'Tous';
  if (status === 'active') return 'Actifs';
  if (status === 'paused') return 'En pause';
  return 'En attente';
}

export function filterPrestataireServices(
  services: Service[],
  searchQuery: string,
  statusFilter: ServiceStatusFilter,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return services.filter((service) => {
    const matchesSearch = !normalizedQuery
      || service.title.toLowerCase().includes(normalizedQuery)
      || service.category.toLowerCase().includes(normalizedQuery)
      || service.description.toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}

export function computePrestataireServiceStats(services: Service[]) {
  const ratedServices = services.filter((service) => Number(service.rating) > 0);
  const avgRating = ratedServices.length
    ? (ratedServices.reduce((sum, service) => sum + Number(service.rating), 0) / ratedServices.length).toFixed(1)
    : '0.0';

  return {
    active: services.filter((service) => service.status === 'active').length,
    bookings: services.reduce((sum, service) => sum + service.bookings, 0),
    avgRating,
    revenue: services.reduce((sum, service) => {
      const price = parseInt(service.price.replace(/[^0-9]/g, ''), 10) || 0;
      return sum + price * service.bookings;
    }, 0),
  };
}
