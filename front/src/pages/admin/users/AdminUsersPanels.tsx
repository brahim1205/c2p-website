import { ROLE_LABELS, type UserRole } from '@/lib/roles';
import { formatDate } from '@/lib/formatters';
import {
  getStatusBadgeClass,
  statusLabels,
  type AdminUsersRoleFilter,
  type AdminUsersStatusFilter,
  type ManagedUser,
} from './adminUsersModel';

export function AdminUsersHero({ onExport }: { onExport: () => void }) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-600">Administration</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Gestion des utilisateurs</h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">Validation, suspension et suivi des comptes plateforme.</p>
        </div>
        <button onClick={onExport} className="rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
          Exporter
        </button>
      </div>
    </section>
  );
}

export function AdminUsersFilters({
  activeTab,
  currentRole,
  roleFilter,
  searchQuery,
  onRoleFilterChange,
  onSearchChange,
  onStatusChange,
}: {
  activeTab: AdminUsersStatusFilter;
  currentRole?: UserRole;
  roleFilter: AdminUsersRoleFilter;
  searchQuery: string;
  onRoleFilterChange: (role: AdminUsersRoleFilter) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: AdminUsersStatusFilter) => void;
}) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Filtres utilisateurs</h2>
        <p className="text-sm text-gray-500">Gardez la liste lisible en filtrant par rôle, statut ou recherche directe.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
        />
        <select
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value as AdminUsersRoleFilter)}
          className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
        >
          <option value="all">Tous les roles</option>
          {Object.entries(ROLE_LABELS)
            .filter(([role]) => currentRole === 'superadmin' || role !== 'superadmin')
            .map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
        </select>
        <select
          value={activeTab}
          onChange={(event) => onStatusChange(event.target.value as AdminUsersStatusFilter)}
          className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </select>
      </div>
    </section>
  );
}

export function AdminUsersTable({
  activeTab,
  counts,
  filteredUsers,
  loading,
  selectedUsers,
  onBulkStatus,
  onSelectAll,
  onStatusChange,
  onToggleTrainerVerification,
  onToggleUser,
  onUserStatusChange,
}: {
  activeTab: AdminUsersStatusFilter;
  counts: Record<AdminUsersStatusFilter, number>;
  filteredUsers: ManagedUser[];
  loading: boolean;
  selectedUsers: string[];
  onBulkStatus: (status: ManagedUser['status']) => void;
  onSelectAll: () => void;
  onStatusChange: (status: AdminUsersStatusFilter) => void;
  onToggleTrainerVerification: (user: ManagedUser) => void;
  onToggleUser: (id: string) => void;
  onUserStatusChange: (id: string, status: ManagedUser['status']) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <StatusTabs activeTab={activeTab} counts={counts} onStatusChange={onStatusChange} />

      {selectedUsers.length > 0 ? (
        <BulkActionBar selectedCount={selectedUsers.length} onBulkStatus={onBulkStatus} />
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                  onChange={onSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-[#5fa6f3] focus:ring-[#5fa6f3]"
                />
              </th>
              {['Utilisateur', 'Role', 'Statut', 'Inscription', 'Actions'].map((head) => (
                <th key={head} className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${head === 'Actions' ? 'text-right' : 'text-left'}`}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-sm text-gray-500">Chargement des utilisateurs...</td>
              </tr>
            ) : null}

            {!loading && filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                selected={selectedUsers.includes(user.id)}
                user={user}
                onStatusChange={onUserStatusChange}
                onToggleTrainerVerification={onToggleTrainerVerification}
                onToggleUser={onToggleUser}
              />
            ))}

            {!loading && filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                  Aucun utilisateur ne correspond aux filtres actuels.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusTabs({
  activeTab,
  counts,
  onStatusChange,
}: {
  activeTab: AdminUsersStatusFilter;
  counts: Record<AdminUsersStatusFilter, number>;
  onStatusChange: (status: AdminUsersStatusFilter) => void;
}) {
  const tabs: Array<{ key: AdminUsersStatusFilter; label: string }> = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'En attente' },
    { key: 'active', label: 'Actifs' },
    { key: 'suspended', label: 'Suspendus' },
  ];
  return (
    <div className="border-b border-gray-200 px-6 py-4">
      <div className="flex flex-wrap items-center gap-5">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => onStatusChange(tab.key)} className={`text-sm font-medium ${activeTab === tab.key ? 'text-[#5fa6f3]' : 'text-gray-500'}`}>
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>
    </div>
  );
}

function BulkActionBar({ selectedCount, onBulkStatus }: { selectedCount: number; onBulkStatus: (status: ManagedUser['status']) => void }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#5fa6f3]/20 bg-[#5fa6f3]/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm font-medium text-[#27346b]">{selectedCount} compte(s) selectionne(s)</p>
      <div className="flex gap-2">
        <button onClick={() => onBulkStatus('active')} className="rounded-lg border border-[#5fa6f3]/30 bg-white px-4 py-2 text-sm font-medium text-[#27346b] hover:bg-[#5fa6f3]/5">Valider</button>
        <button onClick={() => onBulkStatus('suspended')} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Suspendre</button>
      </div>
    </div>
  );
}

function UserRow({
  selected,
  user,
  onStatusChange,
  onToggleTrainerVerification,
  onToggleUser,
}: {
  selected: boolean;
  user: ManagedUser;
  onStatusChange: (id: string, status: ManagedUser['status']) => void;
  onToggleTrainerVerification: (user: ManagedUser) => void;
  onToggleUser: (id: string) => void;
}) {
  const nextStatusAction = user.status === 'active'
    ? { label: 'Suspendre', status: 'suspended' as const, className: 'border-red-200 text-red-700 hover:bg-red-50' }
    : { label: user.status === 'suspended' ? 'Réactiver' : 'Valider', status: 'active' as const, className: 'border-green-200 text-green-700 hover:bg-green-50' };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleUser(user.id)}
          className="h-4 w-4 rounded border-gray-300 text-[#5fa6f3] focus:ring-[#5fa6f3]"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img src={user.avatar} alt={user.firstName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
              {user.firstName[0]}{user.lastName[0]}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-700">{ROLE_LABELS[user.role]}</td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(user.status)}`}>
            {statusLabels[user.status]}
          </span>
          {user.role === 'formateur' && user.expertVerified ? (
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              Expert vérifié
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          {user.role === 'formateur' ? (
            <button
              onClick={() => onToggleTrainerVerification(user)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                user.expertVerified
                  ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                  : 'border border-teal-200 text-teal-700 hover:bg-teal-50'
              }`}
            >
              {user.expertVerified ? 'Retirer le badge' : 'Vérifier'}
            </button>
          ) : null}
          <button onClick={() => onStatusChange(user.id, nextStatusAction.status)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${nextStatusAction.className}`}>
            {nextStatusAction.label}
          </button>
        </div>
      </td>
    </tr>
  );
}
