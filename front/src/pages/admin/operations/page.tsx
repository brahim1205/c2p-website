import { useEffect, useMemo } from 'react';
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
  getSlaLabel,
  kindLabels,
  priorityClassNames,
  priorityLabels,
  type ManagedUser,
  type OperationsSnapshot,
} from './adminOperationsModel';

export default function AdminOperationsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const operationsQuery = useQuery({
    queryKey: queryKeys.admin.operations(),
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

  const handleQuickWin = async () => {
    const firstContent = contents.find((item) => item.status === 'pending');
    const firstSupport = supportRequests.find((item) => item.status === 'new');

    try {
      if (firstContent) {
        const updated = await updateAdminContentItem(firstContent.id, { status: 'published' });
        updateOperationsCache((snapshot) => ({
          ...snapshot,
          contents: snapshot.contents.map((item) => (item.id === updated.id ? updated : item)),
        }));
        success('Contenu publie', updated.title);
        return;
      }

      if (firstSupport) {
        const updated = await markPublicContactSubmissionHandled(firstSupport.id);
        updateOperationsCache((snapshot) => ({
          ...snapshot,
          supportRequests: snapshot.supportRequests.map((item) => (item.id === updated.id ? updated : item)),
        }));
        success('Support traite', updated.subject);
        return;
      }

      success('File a jour', 'Aucune action rapide disponible.');
    } catch (err) {
      console.error(err);
      error('Erreur', "L'action rapide a echoue.");
    }
  };

  const handleResolveOldestReport = async () => {
    const report = reports.filter((item) => item.status === 'pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    if (!report) return;

    try {
      const updated = await updateAdminReport(report.id, { status: 'resolved', adminAction: 'Resolu depuis la file operations' });
      updateOperationsCache((snapshot) => ({
        ...snapshot,
        reports: snapshot.reports.map((item) => (item.id === updated.id ? updated : item)),
      }));
      success('Signalement resolu', updated.reported);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de resoudre le signalement.');
    }
  };

  const handleApproveOldestAccreditation = async () => {
    const accreditation = accreditations.filter((item) => item.status === 'pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    if (!accreditation) return;

    try {
      const updated = await updateAdminAccreditation(accreditation.id, { status: 'approved', reject_reason: '' });
      updateOperationsCache((snapshot) => ({
        ...snapshot,
        accreditations: snapshot.accreditations.map((item) => (item.id === updated.id ? updated : item)),
      }));
      success('Accreditation approuvee', updated.name);
    } catch (err) {
      console.error(err);
      error('Erreur', "Impossible d'approuver l'accreditation.");
    }
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

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600">Pilotage admin</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Operations et files de traitement</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600 md:text-base">
                Priorisez les actions quotidiennes: moderation, support, comptes, accreditations et alertes metier.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleExportQueue} className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Export CSV
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Signalements ouverts', value: stats.pendingReports, icon: 'ri-alert-line', tone: 'text-red-700 bg-red-50' },
            { label: 'Accreditations', value: stats.pendingAccreditations, icon: 'ri-shield-check-line', tone: 'text-amber-700 bg-amber-50' },
            { label: 'Contenus a valider', value: stats.pendingContents, icon: 'ri-file-list-line', tone: 'text-sky-700 bg-sky-50' },
            { label: 'Support non traite', value: stats.pendingSupport, icon: 'ri-customer-service-2-line', tone: 'text-teal-700 bg-teal-50' },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                <i className={`${item.icon} text-lg`}></i>
              </div>
              <p className="mt-4 text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="mt-1 text-sm text-gray-500">{item.label}</p>
            </article>
          ))}
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">File priorisee</h2>
              <p className="text-sm text-gray-500">Les elements sont classes par urgence puis anciennete.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {loading && <p className="px-5 py-8 text-sm text-gray-500">Chargement des operations...</p>}
              {!loading && queues.length === 0 && <p className="px-5 py-8 text-sm text-gray-500">Aucune action en attente.</p>}
              {!loading && queues.slice(0, 12).map((item) => {
                const sla = getSlaLabel(item);
                return (
                  <Link key={item.id} to={item.href} className="block px-5 py-4 hover:bg-gray-50">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{kindLabels[item.kind]}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityClassNames[item.priority]}`}>{priorityLabels[item.priority]}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sla.className}`}>{sla.label}</span>
                        </div>
                        <h3 className="mt-2 truncate text-sm font-semibold text-gray-900">{item.title}</h3>
                        <p className="mt-1 truncate text-sm text-gray-500">{item.subtitle}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Actions rapides</h2>
              <div className="mt-4 space-y-3">
                <button onClick={handleQuickWin} className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Traiter le prochain contenu/support
                  <i className="ri-arrow-right-line"></i>
                </button>
                <button onClick={handleResolveOldestReport} disabled={stats.pendingReports === 0} className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Resoudre le plus ancien signalement
                  <i className="ri-check-line"></i>
                </button>
                <button onClick={handleApproveOldestAccreditation} disabled={stats.pendingAccreditations === 0} className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Approuver la plus ancienne accreditation
                  <i className="ri-shield-check-line"></i>
                </button>
              </div>
            </article>

            <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Points de vigilance</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-gray-600">Comptes en attente</span>
                  <strong className="text-gray-900">{stats.pendingUsers}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-gray-600">Comptes suspendus</span>
                  <strong className="text-gray-900">{stats.suspendedUsers}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-gray-600">Alertes paiements metier</span>
                  <strong className="text-gray-900">{paymentAlerts}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
