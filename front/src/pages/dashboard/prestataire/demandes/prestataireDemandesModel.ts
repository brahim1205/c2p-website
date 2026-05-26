import type { PrestataireBooking as Booking } from '@/lib/prestataireDashboardApi';

export const prestataireDemandStatusFilters = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'declined'] as const;

export type PrestataireDemandStatusFilter = typeof prestataireDemandStatusFilters[number];

export function getPrestataireDemandStats(requests: Booking[]) {
  return {
    pending: requests.filter((request) => request.status === 'pending').length,
    confirmed: requests.filter((request) => request.status === 'confirmed').length,
    in_progress: requests.filter((request) => request.status === 'in_progress').length,
    completed: requests.filter((request) => request.status === 'completed').length,
    declined: requests.filter((request) => request.status === 'declined').length,
  };
}
