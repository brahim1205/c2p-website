import { ROLE_LABELS, type AuthUser, type UserRole } from '@/lib/roles';

export type ManagedUser = AuthUser & {
  status: 'active' | 'pending' | 'suspended';
  bio?: string;
  location?: string;
};

export type AdminUsersStatusFilter = 'all' | ManagedUser['status'];
export type AdminUsersRoleFilter = 'all' | UserRole;

export const statusLabels: Record<ManagedUser['status'], string> = {
  active: 'Actif',
  pending: 'En attente',
  suspended: 'Suspendu',
};

export function filterManagedUsers({
  activeTab,
  roleFilter,
  searchQuery,
  users,
}: {
  activeTab: AdminUsersStatusFilter;
  roleFilter: AdminUsersRoleFilter;
  searchQuery: string;
  users: ManagedUser[];
}) {
  const normalizedSearch = searchQuery.toLowerCase();
  return users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      fullName.includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);
    const matchesStatus = activeTab === 'all' || user.status === activeTab;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });
}

export function getManagedUserCounts(users: ManagedUser[]) {
  return {
    all: users.length,
    active: users.filter((user) => user.status === 'active').length,
    pending: users.filter((user) => user.status === 'pending').length,
    suspended: users.filter((user) => user.status === 'suspended').length,
  };
}

export function buildUsersExportRows(users: ManagedUser[]) {
  return users.map((user) => ({
    id: user.id,
    prenom: user.firstName,
    nom: user.lastName,
    email: user.email,
    role: ROLE_LABELS[user.role],
    statut: statusLabels[user.status],
    createdAt: user.createdAt,
  }));
}

export function getStatusBadgeClass(status: ManagedUser['status']) {
  if (status === 'active') return 'bg-green-100 text-green-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}
