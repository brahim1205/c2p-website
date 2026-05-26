import type { AdminAccreditation } from '@/lib/adminApi';

export type AccreditationStatus = AdminAccreditation['status'];

export const statusLabels: Record<AccreditationStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvées',
  rejected: 'Rejetées',
};

export const statusBadgeClassNames: Record<AccreditationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getStatusBadge(status: AccreditationStatus) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClassNames[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
