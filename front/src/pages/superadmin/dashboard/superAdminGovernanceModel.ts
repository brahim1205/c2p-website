import type { AdminFeatureFlag, AdminSecurityAlert } from '@/lib/adminApi';
import type { AuthUser, UserRole } from '@/lib/roles';

export type ManagedUser = AuthUser & { status: 'active' | 'pending' | 'suspended' };

export const privilegedRoles = new Set<UserRole>(['superadmin', 'admin']);

export function riskTone(risk: string) {
  if (risk === 'critical') return 'bg-red-100 text-red-700';
  if (risk === 'high') return 'bg-amber-100 text-amber-700';
  if (risk === 'medium') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

export function statusTone(status: string) {
  if (status === 'active' || status === 'connected' || status === 'success' || status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  if (status === 'suspended' || status === 'disconnected' || status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export function getGovernanceStats({
  alerts,
  flags,
  users,
}: {
  alerts: AdminSecurityAlert[];
  flags: AdminFeatureFlag[];
  users: ManagedUser[];
}) {
  return {
    superadmins: users.filter((entry) => entry.role === 'superadmin' && entry.status === 'active').length,
    admins: users.filter((entry) => entry.role === 'admin').length,
    suspended: users.filter((entry) => entry.status === 'suspended').length,
    criticalFlagsOff: flags.filter((entry) => entry.risk === 'critical' && !entry.enabled).length,
    activeAlerts: alerts.filter((entry) => entry.status === 'active').length,
  };
}
