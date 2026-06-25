import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  fetchAdminAccreditations,
  fetchAdminContentItems,
  fetchAdminFinanceOverview,
  fetchAdminReports,
  updateAdminAccreditation,
  updateAdminContentItem,
  updateAdminReport,
} from '@/lib/adminApi';
import { fetchUsers } from '@/lib/accountApi';
import { fetchPublicContactSubmissions, markPublicContactSubmissionHandled } from '@/lib/communicationsApi';
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
      const [reportsData, accreditationsData, contentsData, usersData, supportData, financeOverview] = await Promise.all([
        fetchAdminReports(),
        fetchAdminAccreditations(),
        fetchAdminContentItems(),
        fetchUsers(),
        fetchPublicContactSubmissions(50),
        fetchAdminFinanceOverview(),
      ]);

      return {
        reports: reportsData,
        accreditations: accreditationsData,
        contents: contentsData,
        users: usersData.filter((entry) => entry.role !== 'superadmin') as ManagedUser[],
        supportRequests: supportData,
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
  const supportRequests = useMemo(() => operationsQuery.data?.supportRequests ?? [], [operationsQuery.data?.supportRequests]);
  const paymentAlerts = operationsQuery.data?.paymentAlerts ?? 0;

  const updateOperationsCache = (updater: (snapshot: OperationsSnapshot) => OperationsSnapshot) => {
    queryClient.setQueryData<OperationsSnapshot>(queryKeys.admin.operations(), (current) => current ? updater(current) : current);
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.operations() });
  };

  const operationsInput = useMemo(() => ({
    accreditations,
    contents,
    reports,
    supportRequests,
    users,
  }), [accreditations, contents, reports, supportRequests, users]);
  const queues = useMemo(() => buildOperationsQueue(operationsInput), [operationsInput]);
  const stats = useMemo(() => buildOperationsStats(operationsInput), [operationsInput]);
  const pendingContents = useMemo(() => contents.filter((item) => item.status === 'pending'), [contents]);
  const pendingAccreditations = useMemo(() => accreditations.filter((item) => item.status === 'pending'), [accreditations]);
  const pendingReports = useMemo(() => reports.filter((item) => item.status === 'pending'), [reports]);
  const pendingSupport = useMemo(() => supportRequests.filter((item) => item.status === 'new'), [supportRequests]);
  const pendingUsers = useMemo(() => users.filter((item) => item.status === 'pending' || item.status === 'suspended'), [users]);
  const totalPending = pendingContents.length + pendingAccreditations.length + pendingReports.length + pendingSupport.length + pendingUsers.length;

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

  const markSupportHandled = async (id: string) => {
    const updated = await markPublicContactSubmissionHandled(id);
    updateOperationsCache((snapshot) => ({
      ...snapshot,
      supportRequests: snapshot.supportRequests.map((item) => (item.id === updated.id ? updated : item)),
    }));
    success('Support traité', updated.subject);
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
            { label: 'Publications', value: stats.pendingContents, icon: 'ri-file-list-line', tone: 'text-sky-700 bg-sky-50' },
            { label: 'Accréditations', value: stats.pendingAccreditations, icon: 'ri-shield-check-line', tone: 'text-amber-700 bg-amber-50' },
            { label: 'Signalements', value: stats.pendingReports, icon: 'ri-alert-line', tone: 'text-red-700 bg-red-50' },
            { label: 'Support', value: stats.pendingSupport, icon: 'ri-customer-service-2-line', tone: 'text-teal-700 bg-teal-50' },
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

          {pendingSupport.slice(0, 6).map((request) => (
            <OperationCard
              key={`support-${request.id}`}
              badge="Support"
              date={request.createdAt}
              detail={`${request.firstName} ${request.lastName} · ${request.email}`}
              title={request.subject}
              tone="bg-teal-50 text-teal-700"
              actions={(
                <>
                  <SmallActionButton tone="success" disabled={busyKey === `support-${request.id}`} onClick={() => void runOperation(`support-${request.id}`, () => markSupportHandled(request.id))}>Marquer traité</SmallActionButton>
                  <Link to="/admin/messages" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Ouvrir</Link>
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
