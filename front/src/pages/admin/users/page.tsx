import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { fetchUsers, updateManagedUser } from '@/lib/accountApi';
import { type UserRole } from '@/lib/roles';
import { downloadCsvFile } from '@/lib/downloads';
import { queryKeys } from '@/lib/queryKeys';
import { AdminUsersFilters, AdminUsersHero, AdminUsersTable } from './AdminUsersPanels';
import {
  buildUsersExportRows,
  filterManagedUsers,
  getManagedUserCounts,
  statusLabels,
  type AdminUsersStatusFilter,
  type ManagedUser,
} from './adminUsersModel';

export default function AdminUsersPage() {
  const { success, error } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminUsersStatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users(currentUser?.role ?? 'anonymous'),
    queryFn: async () => {
      const data = await fetchUsers();
      const visibleUsers = currentUser?.role === 'superadmin'
        ? data
        : data.filter((entry) => entry.role !== 'superadmin');
      return visibleUsers as ManagedUser[];
    },
  });

  useEffect(() => {
    if (usersQuery.isError) {
      console.error(usersQuery.error);
      error('Erreur', 'Impossible de charger les utilisateurs.');
    }
  }, [error, usersQuery.error, usersQuery.isError]);

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const loading = usersQuery.isLoading;

  const updateUsersCache = (updater: (items: ManagedUser[]) => ManagedUser[]) => {
    queryClient.setQueryData<ManagedUser[]>(queryKeys.admin.users(currentUser?.role ?? 'anonymous'), (current) => updater(current ?? users));
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(currentUser?.role ?? 'anonymous') });
  };

  const filteredUsers = useMemo(
    () => filterManagedUsers({ activeTab, roleFilter, searchQuery, users }),
    [activeTab, roleFilter, searchQuery, users],
  );

  const counts = useMemo(() => getManagedUserCounts(users), [users]);

  const syncUserStatus = async (id: string, status: ManagedUser['status']) => {
    try {
      const updated = await updateManagedUser(id, { status });
      updateUsersCache((prev) => prev.map((user) => (user.id === id ? ({ ...user, ...(updated as ManagedUser) }) : user)));
      success('Utilisateur mis a jour', `Le compte a ete passe au statut "${statusLabels[status]}".`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'La mise a jour du compte a echoue.');
    }
  };

  const toggleTrainerVerification = async (user: ManagedUser) => {
    try {
      const updated = await updateManagedUser(user.id, { expertVerified: !user.expertVerified });
      updateUsersCache((prev) => prev.map((entry) => (entry.id === user.id ? ({ ...entry, ...(updated as ManagedUser) }) : entry)));
      success('Badge mis à jour', !user.expertVerified ? 'Le formateur est maintenant vérifié.' : 'La vérification du formateur a été retirée.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre à jour le badge expert.');
    }
  };

  const applyBulkStatus = async (status: ManagedUser['status']) => {
    try {
      await Promise.all(selectedUsers.map((id) => updateManagedUser(id, { status })));
      updateUsersCache((prev) => prev.map((user) => (selectedUsers.includes(user.id) ? { ...user, status } : user)));
      success('Traitement termine', `${selectedUsers.length} compte(s) mis a jour.`);
      setSelectedUsers([]);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Le traitement en masse a echoue.');
    }
  };

  const handleToggleUser = (id: string) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
      return;
    }
    setSelectedUsers(filteredUsers.map((user) => user.id));
  };

  const handleExport = () => {
    downloadCsvFile('admin-utilisateurs.csv', buildUsersExportRows(filteredUsers));
    success('Export pret', 'La liste des utilisateurs a ete telechargee.');
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Utilisateurs' }]} />

        <AdminUsersHero onExport={handleExport} />
        <AdminUsersFilters
          activeTab={activeTab}
          currentRole={currentUser?.role}
          roleFilter={roleFilter}
          searchQuery={searchQuery}
          onRoleFilterChange={setRoleFilter}
          onSearchChange={setSearchQuery}
          onStatusChange={setActiveTab}
        />
        <AdminUsersTable
          activeTab={activeTab}
          counts={counts}
          filteredUsers={filteredUsers}
          loading={loading}
          selectedUsers={selectedUsers}
          onBulkStatus={(status) => void applyBulkStatus(status)}
          onSelectAll={handleSelectAll}
          onStatusChange={setActiveTab}
          onToggleTrainerVerification={(user) => void toggleTrainerVerification(user)}
          onToggleUser={handleToggleUser}
          onUserStatusChange={(id, status) => void syncUserStatus(id, status)}
        />
      </div>
    </AdminLayout>
  );
}
