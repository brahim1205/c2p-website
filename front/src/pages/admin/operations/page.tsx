import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  assignAdminBookingProvider,
  fetchAdminAccreditations,
  fetchAdminContentItems,
  fetchAdminDashboardSnapshot,
  fetchAdminFinanceOverview,
  fetchAdminReports,
  updateAdminAccreditation,
  updateAdminContentItem,
  updateAdminReport,
} from '@/lib/adminApi';
import { fetchUsers } from '@/lib/accountApi';
import { downloadCsvFile } from '@/lib/downloads';
import { formatDate } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildOperationsQueue,
  buildOperationsStats,
  getAgeHours,
  kindLabels,
  priorityLabels,
  type ManagedUser,
  type OperationsSnapshot,
} from './adminOperationsModel';

function OperationCard({
  actions,
  badge,
  date,
  detail,
  title,
  tone = 'bg-gray-100 text-gray-700',
}: {
  actions: ReactNode;
  badge: string;
  date: string;
  detail: string;
  title: string;
  tone?: string;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{badge}</span>
            <span className="text-xs text-gray-500">{formatDate(date)}</span>
          </div>
          <h3 className="mt-2 truncate text-sm font-bold text-gray-900">{title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {actions}
        </div>
      </div>
    </article>
  );
}

function SmallActionButton({
  children,
  disabled,
  onClick,
  tone = 'neutral',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const className = {
    neutral: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
    success: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    danger: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    >
      {children}
    </button>
  );
}

export default function AdminOperationsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const operationsQuery = useQuery({
    queryKey: queryKeys.admin.operations(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OperationsSnapshot> => {
      const [reportsData, accreditationsData, contentsData, usersData, financeOverview, dashboardSnapshot] = await Promise.all([
        fetchAdminReports(),
        fetchAdminAccreditations(),
        fetchAdminContentItems(),
        fetchUsers(),
        fetchAdminFinanceOverview(),
        fetchAdminDashboardSnapshot(),
      ]);

      return {
        reports: reportsData,
        accreditations: accreditationsData,
        contents: contentsData,
        users: usersData.filter((entry) => entry.role !== 'superadmin') as ManagedUser[],
        bookings: dashboardSnapshot.bookings,
        providers: dashboardSnapshot.providers,
        paymentAlerts:
        (financeOverview.payoutRequests ?? []).filter((entry) => String(entry.status) === 'pending').length
        + (financeOverview.escrowCases ?? []).filter((entry) => ['awaiting_funding', 'delivery_review'].includes(String(entry.status))).length,
      };
    },
  });

  useEffect(() => {
    if (operationsQuery.isError) {
      console.error(operationsQuery.error);
      error('Erreur', 'Impossible de charger les operations admin.');
    }
  }, [error, operationsQuery.error, operationsQuery.isError]);

  const loading = operationsQuery.isLoading;
  const reports = useMemo(() => operationsQuery.data?.reports ?? [], [operationsQuery.data?.reports]);
  const accreditations = useMemo(() => operationsQuery.data?.accreditations ?? [], [operationsQuery.data?.accreditations]);
  const contents = useMemo(() => operationsQuery.data?.contents ?? [], [operationsQuery.data?.contents]);
  const users = useMemo(() => operationsQuery.data?.users ?? [], [operationsQuery.data?.users]);
  const bookings = useMemo(() => operationsQuery.data?.bookings ?? [], [operationsQuery.data?.bookings]);
  const providers = useMemo(() => operationsQuery.data?.providers ?? [], [operationsQuery.data?.providers]);
  const paymentAlerts = operationsQuery.data?.paymentAlerts ?? 0;

  const updateOperationsCache = (updater: (snapshot: OperationsSnapshot) => OperationsSnapshot) => {
    queryClient.setQueryData<OperationsSnapshot>(queryKeys.admin.operations(), (current) => current ? updater(current) : current);
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.operations() });
  };

  const operationsInput = useMemo(() => ({
    accreditations,
    bookings,
    contents,
    providers,
    reports,
    users,
  }), [accreditations, bookings, contents, providers, reports, users]);
  const queues = useMemo(() => buildOperationsQueue(operationsInput), [operationsInput]);
  const stats = useMemo(() => buildOperationsStats(operationsInput), [operationsInput]);
  const pendingContents = useMemo(() => contents.filter((item) => item.status === 'pending'), [contents]);
  const pendingAccreditations = useMemo(() => accreditations.filter((item) => item.status === 'pending'), [accreditations]);
  const pendingReports = useMemo(() => reports.filter((item) => item.status === 'pending'), [reports]);
  const pendingUsers = useMemo(() => users.filter((item) => item.status === 'pending' || item.status === 'suspended'), [users]);
  const pendingAssignments = useMemo(
    () => bookings.filter((item) => item.status === 'pending' && !item.provider_id),
    [bookings],
  );
  const totalPending = pendingAssignments.length + pendingContents.length + pendingAccreditations.length + pendingReports.length + pendingUsers.length;

  const [selectedProviderByBooking, setSelectedProviderByBooking] = useState<Record<number, string>>({});

  const getSuggestedProviderId = (bookingId: number) => selectedProviderByBooking[bookingId] ?? '';

  const runOperation = async (key: string, action: () => Promise<void>) => {
    setBusyKey(key);
    try {
      await action();
    } catch (err) {
      console.error(err);
      error('Erreur', "L'action n'a pas pu être réalisée.");
    } finally {
      setBusyKey(null);
    }
  };

  const updateContentStatus = async (id: number | string, status: 'published' | 'rejected') => {
    const updated = await updateAdminContentItem(id, { status });
    updateOperationsCache((snapshot) => ({
      ...snapshot,
      contents: snapshot.contents.map((item) => (item.id === updated.id ? updated : item)),
    }));
    success(status === 'published' ? 'Publication validée' : 'Publication rejetée', updated.title);
  };

  const updateAccreditationStatus = async (id: number, status: 'approved' | 'rejected') => {
    const updated = await updateAdminAccreditation(id, {
      status,
      reject_reason: status === 'rejected' ? 'Refusé depuis la file opérations.' : '',
    });
    updateOperationsCache((snapshot) => ({
      ...snapshot,
      accreditations: snapshot.accreditations.map((item) => (item.id === updated.id ? updated : item)),
    }));
    success(status === 'approved' ? 'Accréditation approuvée' : 'Accréditation refusée', updated.name);
  };

  const updateReportStatus = async (id: number, status: 'resolved' | 'dismissed') => {
    const updated = await updateAdminReport(id, {
      status,
      adminAction: status === 'resolved' ? 'Résolu depuis la file opérations.' : 'Ignoré depuis la file opérations.',
    });
    updateOperationsCache((snapshot) => ({
      ...snapshot,
      reports: snapshot.reports.map((item) => (item.id === updated.id ? updated : item)),
    }));
    success(status === 'resolved' ? 'Signalement résolu' : 'Signalement ignoré', updated.reported);
  };

  const handleAssignProvider = async (booking: typeof pendingAssignments[number]) => {
    const providerId = Number(getSuggestedProviderId(booking.id));
    if (!providerId) {
      error('Assignation impossible', 'Choisissez un prestataire avant de confirmer.');
      return;
    }

    const provider = providers.find((entry) => Number(entry.id) === providerId);
    if (!provider) {
      error('Prestataire introuvable', 'Le prestataire sélectionné est indisponible.');
      return;
    }

    const updated = await assignAdminBookingProvider({
      booking,
      provider,
      adminUserId: 'usr-admin',
    });

    queryClient.setQueryData(queryKeys.admin.operations(), (current: typeof operationsQuery.data) => current ? {
      ...current,
      bookings: current.bookings.map((entry) => entry.id === booking.id ? { ...entry, ...updated } : entry),
    } : current);
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.operations() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard('admin') });
    success('Mission assignée', `${provider.name} reçoit maintenant cette demande.`);
  };

  const handleExportQueue = () => {
    downloadCsvFile('admin-file-operations.csv', queues.map((item) => ({
      id: item.id,
      type: kindLabels[item.kind],
      priorite: priorityLabels[item.priority],
      titre: item.title,
      detail: item.subtitle,
      cree_le: item.createdAt,
      age_heures: getAgeHours(item.createdAt),
      page: item.href,
    })));
    success('Export pret', 'La file operationnelle a ete telechargee.');
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Operations' }]} />

        <section className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600">Pilotage admin</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Opérations à traiter</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Une liste courte avec les actions directes : valider, refuser, résoudre ou traiter.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700">{totalPending} action(s)</span>
              <button onClick={handleExportQueue} className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Export CSV
              </button>
            </div>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[
            { label: 'Assignations', value: pendingAssignments.length, icon: 'ri-route-line', tone: 'text-cyan-700 bg-cyan-50' },
            { label: 'Publications', value: stats.pendingContents, icon: 'ri-file-list-line', tone: 'text-sky-700 bg-sky-50' },
            { label: 'Accréditations', value: stats.pendingAccreditations, icon: 'ri-shield-check-line', tone: 'text-amber-700 bg-amber-50' },
            { label: 'Signalements', value: stats.pendingReports, icon: 'ri-alert-line', tone: 'text-red-700 bg-red-50' },
            { label: 'Comptes', value: stats.pendingUsers + stats.suspendedUsers, icon: 'ri-user-settings-line', tone: 'text-purple-700 bg-purple-50' },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
                <i className={`${item.icon} text-lg`}></i>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="mt-0.5 text-sm text-gray-500">{item.label}</p>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          {loading && <p className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">Chargement des opérations...</p>}
          {!loading && totalPending === 0 && <p className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">Aucune action en attente.</p>}

          {!loading && pendingAssignments.length > 0 ? (
            <div className="mb-2 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 py-3">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-800">Assignations C2P</h2>
              <p className="mt-1 text-sm text-cyan-700">Les demandes client qui attendent un prestataire sont traitées ici.</p>
            </div>
          ) : null}

          {pendingAssignments.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pendingAssignments.slice(0, 9).map((booking) => (
                <article key={`booking-${booking.id}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">Demande à assigner</span>
                      <h3 className="mt-2 line-clamp-2 text-sm font-bold text-gray-900">{booking.service || 'Mission client'}</h3>
                    </div>
                    <div className="shrink-0 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                      {Number(booking.price || 0).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-500">
                    <p className="truncate">{booking.client_name || 'Client'}</p>
                    <p>{formatDate(booking.created_at || new Date().toISOString())}</p>
                    <p>{booking.booking_date || 'Date à confirmer'}</p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <select
                      value={getSuggestedProviderId(booking.id)}
                      onChange={(event) => setSelectedProviderByBooking((current) => ({ ...current, [booking.id]: event.target.value }))}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-700 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Choisir un prestataire</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}{provider.category ? ` · ${provider.category}` : ''}{provider.verified ? ' · vérifié' : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={busyKey === `assign-${booking.id}`}
                      onClick={() => void runOperation(`assign-${booking.id}`, () => handleAssignProvider(booking))}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {busyKey === `assign-${booking.id}` ? 'Assignation...' : 'Assigner'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!loading && pendingContents.length > 0 ? (
            <div className="mb-2 mt-6 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-sky-800">Publications à valider</h2>
              <p className="mt-1 text-sm text-sky-700">Formations et services publiés par les acteurs en attente de décision.</p>
            </div>
          ) : null}

          {pendingContents.slice(0, 8).map((content) => {
            const isService = String(content.source_table).includes('provider_services') || String(content.type).toLowerCase().includes('service');
            return (
              <OperationCard
                key={`content-${content.id}`}
                badge={isService ? 'Service à valider' : 'Publication à valider'}
                date={content.date}
                detail={`${content.type} · ${content.author} · ${content.category}`}
                title={content.title}
                tone="bg-sky-50 text-sky-700"
                actions={(
                  <>
                    <SmallActionButton
                      tone="success"
                      disabled={busyKey === `content-publish-${content.id}`}
                      onClick={() => void runOperation(`content-publish-${content.id}`, () => updateContentStatus(content.id, 'published'))}
                    >
                      Valider
                    </SmallActionButton>
                    <SmallActionButton
                      tone="danger"
                      disabled={busyKey === `content-reject-${content.id}`}
                      onClick={() => void runOperation(`content-reject-${content.id}`, () => updateContentStatus(content.id, 'rejected'))}
                    >
                      Refuser
                    </SmallActionButton>
                    <Link to="/admin/content" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Voir</Link>
                  </>
                )}
              />
            );
          })}

          {pendingAccreditations.slice(0, 6).map((item) => (
            <OperationCard
              key={`accreditation-${item.id}`}
              badge="Accréditation"
              date={item.date}
              detail={`${item.profession} · ${item.experience}`}
              title={item.name}
              tone="bg-amber-50 text-amber-700"
              actions={(
                <>
                  <SmallActionButton tone="success" disabled={busyKey === `accreditation-approve-${item.id}`} onClick={() => void runOperation(`accreditation-approve-${item.id}`, () => updateAccreditationStatus(item.id, 'approved'))}>Approuver</SmallActionButton>
                  <SmallActionButton tone="danger" disabled={busyKey === `accreditation-reject-${item.id}`} onClick={() => void runOperation(`accreditation-reject-${item.id}`, () => updateAccreditationStatus(item.id, 'rejected'))}>Refuser</SmallActionButton>
                  <Link to="/admin/accreditations" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Voir</Link>
                </>
              )}
            />
          ))}

          {pendingReports.slice(0, 6).map((report) => (
            <OperationCard
              key={`report-${report.id}`}
              badge="Signalement"
              date={report.date}
              detail={`${report.reported} signalé par ${report.reporter} · ${report.type}`}
              title={report.reason}
              tone="bg-red-50 text-red-700"
              actions={(
                <>
                  <SmallActionButton tone="success" disabled={busyKey === `report-resolve-${report.id}`} onClick={() => void runOperation(`report-resolve-${report.id}`, () => updateReportStatus(report.id, 'resolved'))}>Résoudre</SmallActionButton>
                  <SmallActionButton disabled={busyKey === `report-dismiss-${report.id}`} onClick={() => void runOperation(`report-dismiss-${report.id}`, () => updateReportStatus(report.id, 'dismissed'))}>Ignorer</SmallActionButton>
                  <Link to="/admin/reports" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Voir</Link>
                </>
              )}
            />
          ))}

          {pendingUsers.slice(0, 6).map((user) => (
            <OperationCard
              key={`user-${user.id}`}
              badge={user.status === 'suspended' ? 'Compte suspendu' : 'Compte à valider'}
              date={user.createdAt}
              detail={`${user.role} · ${user.email}`}
              title={`${user.firstName} ${user.lastName}`}
              tone="bg-purple-50 text-purple-700"
              actions={<Link to="/admin/users" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Gérer</Link>}
            />
          ))}

          {paymentAlerts > 0 ? (
            <OperationCard
              badge="Paiement"
              date={new Date().toISOString()}
              detail="Séquestres, retraits ou transactions qui demandent une vérification."
              title={`${paymentAlerts} alerte(s) paiement à vérifier`}
              tone="bg-orange-50 text-orange-700"
              actions={<Link to="/admin/payments" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Ouvrir paiements</Link>}
            />
          ) : null}
        </section>
      </div>
    </AdminLayout>
  );
}
