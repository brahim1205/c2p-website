import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { fetchUsers, updateManagedUser } from '@/lib/accountApi';
import { ROLE_LABELS, type AuthUser, type UserRole } from '@/lib/roles';
import { formatDate } from '@/lib/formatters';
import { downloadCsvFile } from '@/lib/downloads';

type ManagedUser = AuthUser & {
  status: 'active' | 'pending' | 'suspended';
  bio?: string;
  location?: string;
};

const statusLabels: Record<ManagedUser['status'], string> = {
  active: 'Actif',
  pending: 'En attente',
  suspended: 'Suspendu',
};

export default function AdminUsersPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | ManagedUser['status']>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data as ManagedUser[]);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        fullName.includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = activeTab === 'all' || user.status === activeTab;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [activeTab, roleFilter, searchQuery, users]);

  const counts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((user) => user.status === 'active').length,
      pending: users.filter((user) => user.status === 'pending').length,
      suspended: users.filter((user) => user.status === 'suspended').length,
    }),
    [users],
  );

  const syncUserStatus = async (id: string, status: ManagedUser['status']) => {
    try {
      const updated = await updateManagedUser(id, { status });
      setUsers((prev) => prev.map((user) => (user.id === id ? ({ ...user, ...(updated as ManagedUser) }) : user)));
      success('Utilisateur mis a jour', `Le compte a ete passe au statut "${statusLabels[status]}".`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'La mise a jour du compte a echoue.');
    }
  };

  const toggleTrainerVerification = async (user: ManagedUser) => {
    try {
      const updated = await updateManagedUser(user.id, { expertVerified: !user.expertVerified });
      setUsers((prev) => prev.map((entry) => (entry.id === user.id ? ({ ...entry, ...(updated as ManagedUser) }) : entry)));
      success('Badge mis à jour', !user.expertVerified ? 'Le formateur est maintenant vérifié.' : 'La vérification du formateur a été retirée.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre à jour le badge expert.');
    }
  };

  const applyBulkStatus = async (status: ManagedUser['status']) => {
    try {
      await Promise.all(selectedUsers.map((id) => updateManagedUser(id, { status })));
      setUsers((prev) => prev.map((user) => (selectedUsers.includes(user.id) ? { ...user, status } : user)));
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
    downloadCsvFile('admin-utilisateurs.csv', filteredUsers.map((user) => ({
      id: user.id,
      prenom: user.firstName,
      nom: user.lastName,
      email: user.email,
      role: ROLE_LABELS[user.role],
      statut: statusLabels[user.status],
      createdAt: user.createdAt,
    })));
    success('Export pret', 'La liste des utilisateurs a ete telechargee.');
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Utilisateurs' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600">Administration</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Gestion des utilisateurs</h1>
              <p className="mt-2 text-sm text-gray-600 md:text-base">Validation, suspension et suivi des comptes plateforme.</p>
            </div>
            <button
              onClick={handleExport}
              className="rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Exporter
            </button>
          </div>
        </section>

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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
            >
              <option value="all">Tous les roles</option>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
              className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>
        </section>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex flex-wrap items-center gap-5">
              <button onClick={() => setActiveTab('all')} className={`text-sm font-medium ${activeTab === 'all' ? 'text-[#5fa6f3]' : 'text-gray-500'}`}>Tous ({counts.all})</button>
              <button onClick={() => setActiveTab('pending')} className={`text-sm font-medium ${activeTab === 'pending' ? 'text-[#5fa6f3]' : 'text-gray-500'}`}>En attente ({counts.pending})</button>
              <button onClick={() => setActiveTab('active')} className={`text-sm font-medium ${activeTab === 'active' ? 'text-[#5fa6f3]' : 'text-gray-500'}`}>Actifs ({counts.active})</button>
              <button onClick={() => setActiveTab('suspended')} className={`text-sm font-medium ${activeTab === 'suspended' ? 'text-[#5fa6f3]' : 'text-gray-500'}`}>Suspendus ({counts.suspended})</button>
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-[#5fa6f3]/20 bg-[#5fa6f3]/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-[#27346b]">{selectedUsers.length} compte(s) selectionne(s)</p>
              <div className="flex gap-2">
                <button onClick={() => applyBulkStatus('active')} className="px-4 py-2 rounded-lg bg-white border border-[#5fa6f3]/30 text-[#27346b] text-sm font-medium hover:bg-[#5fa6f3]/5">Valider</button>
                <button onClick={() => applyBulkStatus('suspended')} className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50">Suspendre</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#5fa6f3] focus:ring-[#5fa6f3]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Inscription</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-sm text-gray-500">Chargement des utilisateurs...</td>
                  </tr>
                )}

                {!loading && filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleToggleUser(user.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#5fa6f3] focus:ring-[#5fa6f3]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.firstName} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
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
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : user.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
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
                        {user.status !== 'active' && (
                          <button
                            onClick={() => syncUserStatus(user.id, 'active')}
                            className="px-3 py-1.5 rounded-lg border border-green-200 text-green-700 text-xs font-medium hover:bg-green-50"
                          >
                            Valider
                          </button>
                        )}
                        {user.role === 'formateur' && (
                          <button
                            onClick={() => toggleTrainerVerification(user)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              user.expertVerified
                                ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border border-teal-200 text-teal-700 hover:bg-teal-50'
                            }`}
                          >
                            {user.expertVerified ? 'Retirer le badge' : 'Vérifier'}
                          </button>
                        )}
                        {user.status !== 'suspended' ? (
                          <button
                            onClick={() => syncUserStatus(user.id, 'suspended')}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50"
                          >
                            Suspendre
                          </button>
                        ) : (
                          <button
                            onClick={() => syncUserStatus(user.id, 'active')}
                            className="px-3 py-1.5 rounded-lg border border-[#5fa6f3]/20 text-[#27346b] text-xs font-medium hover:bg-[#5fa6f3]/5"
                          >
                            Reactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      Aucun utilisateur ne correspond aux filtres actuels.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
