import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  assignAdminBookingProvider,
  fetchAdminDashboardSnapshot,
  type AdminDashboardBooking as Booking,
  type AdminDashboardCourse as Course,
  type AdminDashboardHistoryItem as HistoryItem,
  type AdminDashboardManagedUser as ManagedUser,
  type AdminDashboardMatchingCandidate as MatchingCandidate,
  type AdminDashboardProject as Project,
  type AdminDashboardProviderOption as ProviderOption,
} from '@/lib/adminApi';
import { formatPercent, formatShortCurrency } from '@/lib/formatters';
import { downloadJsonFile } from '@/lib/downloads';
import { useAuth } from '@/hooks/useAuth';
import { getPaymentLifecycleLabel, getPaymentLifecycleTone } from '@/lib/paymentStatus';
import { fetchDexPayStatus, type DexPayStatus } from '@/lib/paymentsApi';

interface EscrowSummary {
  id: string;
  amount_total: number;
  status: string;
}

interface SubscriptionSummary {
  id: string;
  amount: number;
  status: string;
}

interface ProviderHealthSummary {
  pending: number;
  failed: number;
  receiptsKo: number;
  jobsRunning: number;
  outboxDead: number;
  outboxFailed: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [escrows, setEscrows] = useState<EscrowSummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [providerHealth, setProviderHealth] = useState<ProviderHealthSummary>({
    pending: 0,
    failed: 0,
    receiptsKo: 0,
    jobsRunning: 0,
    outboxDead: 0,
    outboxFailed: 0,
  });
  const [dexPayStatus, setDexPayStatus] = useState<DexPayStatus | null>(null);
  const [selectedProviderByBooking, setSelectedProviderByBooking] = useState<Record<number, string>>({});
  const [assigningBookingId, setAssigningBookingId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshot, dexPayRuntime] = await Promise.all([
        fetchAdminDashboardSnapshot(),
        fetchDexPayStatus().catch(() => null),
      ]);

      setUsers(snapshot.users);
      setCourses(snapshot.courses);
      setBookings(snapshot.bookings);
      setProviders(snapshot.providers);
      setProjects(snapshot.projects);
      setHistory(snapshot.history);
      setEscrows(snapshot.escrows as EscrowSummary[]);
      setSubscriptions(snapshot.subscriptions as SubscriptionSummary[]);
      setCommissionTotal(snapshot.commissionTotal);
      setDexPayStatus(dexPayRuntime);
      setProviderHealth(snapshot.providerHealth);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le tableau de bord administrateur.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((booking) => {
      if (!booking.created_at) return timeRange === 'month';
      const date = new Date(booking.created_at);
      if (timeRange === 'today') {
        return date.toDateString() === now.toDateString();
      }
      if (timeRange === 'week') {
        const diff = now.getTime() - date.getTime();
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [bookings, timeRange]);

  const revenue = useMemo(
    () => bookings
      .filter((booking) => booking.status === 'completed' || booking.status === 'confirmed')
      .reduce((sum, booking) => sum + Number(booking.price ?? 0), 0)
      + courses.reduce((sum, course) => sum + Number(course.revenue ?? 0), 0),
    [bookings, courses],
  );

  const scopedRevenue = useMemo(
    () => filteredBookings
      .filter((booking) => booking.status === 'completed' || booking.status === 'confirmed')
      .reduce((sum, booking) => sum + Number(booking.price ?? 0), 0),
    [filteredBookings],
  );

  const activeUsers = useMemo(
    () => users.filter((entry) => entry.status === 'active').length,
    [users],
  );

  const moderationRate = useMemo(() => {
    const published = courses.filter((course) => course.status === 'published').length;
    return courses.length ? (published / courses.length) * 100 : 0;
  }, [courses]);

  const pendingActions = useMemo(() => [
    { label: 'Comptes a valider', count: users.filter((user) => user.status === 'pending').length, link: '/admin/users', color: 'bg-orange-500', icon: 'ri-user-follow-line' },
    { label: 'Demandes a assigner', count: bookings.filter((booking) => booking.status === 'pending' && !booking.provider_id).length, link: '/admin/dashboard', color: 'bg-[#5fa6f3]', icon: 'ri-file-list-3-line' },
    { label: 'Projets en incubation', count: projects.filter((project) => project.status === 'incubation').length, link: '/admin/content', color: 'bg-amber-500', icon: 'ri-lightbulb-line' },
    { label: 'Cours en revue', count: courses.filter((course) => course.status === 'review').length, link: '/admin/content', color: 'bg-blue-500', icon: 'ri-book-open-line' },
  ], [bookings, courses, projects, users]);

  const modules = [
    { title: 'Utilisateurs', description: 'Validation, suspension et suivi des comptes.', path: '/admin/users', icon: 'ri-user-settings-line' },
    { title: 'Contenus', description: 'Formations, projets et contenus a valider.', path: '/admin/content', icon: 'ri-layout-grid-line' },
    { title: 'Paiements', description: 'Transactions, commissions et rapprochement.', path: '/admin/payments', icon: 'ri-bank-card-line' },
    { title: 'Communications', description: 'Campagnes et messages plateforme.', path: '/admin/communications', icon: 'ri-mail-send-line' },
    { title: 'Securite', description: 'Backups, alertes et supervision systeme.', path: '/admin/security', icon: 'ri-shield-keyhole-line' },
    { title: 'Parametres', description: 'Regles, categories et configuration.', path: '/admin/settings', icon: 'ri-settings-4-line' },
  ];

  const handleExport = () => {
    downloadJsonFile('admin-supervision-snapshot.json', {
      generatedAt: new Date().toISOString(),
      revenue,
      pendingActions,
      modules,
      history,
    });
    success('Export pret', 'Le snapshot de supervision a ete telecharge.');
  };

  const managerName = `${user?.firstName || 'Admin'} ${user?.lastName || ''}`.trim();

  const kpis = [
    {
      label: 'Recettes suivies',
      value: formatShortCurrency(scopedRevenue),
      detail: `${filteredBookings.length} flux`,
      trend: `+${Math.max(1, filteredBookings.filter((booking) => booking.status === 'completed').length)}`,
      icon: 'ri-money-dollar-circle-line',
      surface: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Transactions',
      value: String(filteredBookings.length),
      detail: `${pendingActions[1].count} en attente`,
      trend: `+${Math.max(1, filteredBookings.filter((booking) => booking.status === 'confirmed').length)}`,
      icon: 'ri-file-list-3-line',
      surface: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: 'Utilisateurs',
      value: String(activeUsers),
      detail: `${users.filter((entry) => entry.status === 'pending').length} à valider`,
      trend: `+${Math.max(1, users.filter((entry) => entry.status === 'active').length % 7 || 1)}`,
      icon: 'ri-team-line',
      surface: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Taux de modération',
      value: formatPercent(moderationRate),
      detail: `${courses.filter((course) => course.status === 'published').length} cours publiés`,
      trend: `+${Math.max(1, Math.round(moderationRate / 10))}%`,
      icon: 'ri-pie-chart-2-line',
      surface: 'bg-amber-50 text-amber-700',
    },
  ];

  const quickAccess = [
    { title: 'Utilisateurs', path: '/admin/users', icon: 'ri-user-line', tone: 'bg-emerald-50 text-emerald-700' },
    { title: 'Paiements', path: '/admin/payments', icon: 'ri-money-dollar-circle-line', tone: 'bg-teal-50 text-teal-700' },
    { title: 'Contenus', path: '/admin/content', icon: 'ri-file-list-line', tone: 'bg-cyan-50 text-cyan-700' },
    { title: 'Accréditations', path: '/admin/accreditations', icon: 'ri-shield-check-line', tone: 'bg-amber-50 text-amber-700' },
    { title: 'Signalements', path: '/admin/reports', icon: 'ri-alert-line', tone: 'bg-rose-50 text-rose-700' },
    { title: 'Statistiques', path: '/admin/analytics', icon: 'ri-bar-chart-line', tone: 'bg-indigo-50 text-indigo-700' },
  ];

  const financeProviderSignals = [
    {
      label: 'Provider en attente',
      value: providerHealth.pending,
      tone: 'bg-amber-50 text-amber-700',
      helper: 'Transactions à confirmer ou synchroniser',
      badge: 'pending_provider' as const,
      path: '/admin/payments?panel=provider',
    },
    {
      label: 'Provider en échec',
      value: providerHealth.failed,
      tone: 'bg-red-50 text-red-700',
      helper: 'Transactions à revoir',
      badge: 'failed' as const,
      path: '/admin/payments?panel=provider',
    },
    {
      label: 'Webhook KO',
      value: providerHealth.receiptsKo,
      tone: 'bg-orange-50 text-orange-700',
      helper: 'Receipts provider rejetés ou échoués',
      badge: null,
      path: '/admin/payments?panel=provider',
    },
    {
      label: 'Jobs de réconciliation',
      value: providerHealth.jobsRunning,
      tone: 'bg-blue-50 text-blue-700',
      helper: 'Scans provider actuellement actifs',
      badge: 'processing' as const,
      path: '/admin/payments?panel=provider',
    },
    {
      label: 'Outbox failed',
      value: providerHealth.outboxFailed,
      tone: 'bg-slate-50 text-slate-700',
      helper: 'Événements à relancer',
      badge: null,
      path: '/admin/payments?panel=outbox',
    },
    {
      label: 'Outbox dead',
      value: providerHealth.outboxDead,
      tone: 'bg-rose-50 text-rose-700',
      helper: 'Événements bloqués',
      badge: null,
      path: '/admin/payments?panel=outbox',
    },
  ];

  const providerRuntimeBadge = useMemo(() => {
    if (!dexPayStatus) {
      return { label: 'Statut provider indisponible', tone: 'bg-gray-100 text-gray-700' };
    }
    if (!dexPayStatus.configured) {
      return { label: 'DexPay non configuré', tone: 'bg-slate-100 text-slate-700' };
    }
    if (dexPayStatus.reachable === false) {
      return { label: 'DexPay live injoignable', tone: 'bg-red-100 text-red-700' };
    }
    return { label: 'DexPay live opérationnel', tone: 'bg-emerald-100 text-emerald-700' };
  }, [dexPayStatus]);

  const revenueBars = useMemo(() => {
    const now = new Date();
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const items = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const amount = bookings
        .filter((booking) => {
          if (!booking.created_at) return false;
          const createdAt = new Date(booking.created_at);
          return createdAt.toDateString() === date.toDateString();
        })
        .reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
      return {
        label: labels[date.getDay() === 0 ? 6 : date.getDay() - 1],
        amount,
      };
    });

    const maxAmount = Math.max(...items.map((item) => item.amount), 1);
    return items.map((item) => ({
      ...item,
      height: Math.max(10, Math.round((item.amount / maxAmount) * 180)),
    }));
  }, [bookings]);

  const breakdown = [
    {
      label: 'Comptes actifs',
      value: activeUsers,
      ratio: users.length ? Math.round((activeUsers / users.length) * 100) : 0,
    },
    {
      label: 'Prestations confirmées',
      value: bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed').length,
      ratio: bookings.length ? Math.round((bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed').length / bookings.length) * 100) : 0,
    },
    {
      label: 'Cours publiés',
      value: courses.filter((course) => course.status === 'published').length,
      ratio: courses.length ? Math.round((courses.filter((course) => course.status === 'published').length / courses.length) * 100) : 0,
    },
    {
      label: 'Projets actifs',
      value: projects.filter((project) => project.status !== 'termine').length,
      ratio: projects.length ? Math.round((projects.filter((project) => project.status !== 'termine').length / projects.length) * 100) : 0,
    },
  ];

  const pendingC2PRequests = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending' && !booking.provider_id).slice(0, 6),
    [bookings],
  );

  const getRequestedProviderLabel = (booking: Booking) => (
    booking.requested_provider?.name || booking.requested_provider_name || 'Aucune préférence'
  );

  const getSuggestedProviderId = (booking: Booking) => (
    selectedProviderByBooking[booking.id]
      || String(booking.requested_provider_id || booking.matching_candidates?.[0]?.id || '')
  );

  const handleAssignProvider = async (booking: Booking) => {
    const providerId = Number(getSuggestedProviderId(booking) || 0);
    if (!providerId) {
      error('Assignation impossible', 'Choisissez un prestataire avant de confirmer.');
      return;
    }

    const provider = providers.find((entry) => entry.id === providerId);
    if (!provider) {
      error('Prestataire introuvable', 'Le prestataire sélectionné n’est plus disponible.');
      return;
    }

    setAssigningBookingId(booking.id);
    try {
      const updatedBooking = await assignAdminBookingProvider({
        booking,
        provider,
        adminUserId: user?.id || 'usr-admin',
      });

      setBookings((current) => current.map((entry) => (
        entry.id === booking.id
          ? {
              ...entry,
              ...updatedBooking,
              provider,
              provider_id: provider.id,
              status: 'confirmed',
              assignment_status: 'assigned',
            }
          : entry
      )));
      setSelectedProviderByBooking((current) => ({ ...current, [booking.id]: '' }));

      success('Mission attribuée', `${provider.name} reçoit maintenant cette mission via C2P.`);
    } catch (assignError) {
      console.error(assignError);
      error('Erreur', 'Impossible d’assigner ce prestataire pour le moment.');
    } finally {
      setAssigningBookingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Tableau de bord' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-600">Administration</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900 md:text-4xl">
                Bonjour, {managerName} <span className="align-middle">👋</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Vue d’ensemble des validations, contenus, paiements et signaux de supervision.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="inline-flex rounded-full bg-gray-100 p-1" role="group" aria-label="Période d'analyse">
                {[
                  { key: 'today', label: 'Aujourd’hui' },
                  { key: 'week', label: 'Cette semaine' },
                  { key: 'month', label: 'Ce mois' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTimeRange(item.key as typeof timeRange)}
                    aria-pressed={timeRange === item.key}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      timeRange === item.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExport}
                aria-label="Exporter le snapshot administrateur"
                className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700"
              >
                Exporter
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div key={item.label} className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.detail}</p>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.surface}`}>
                  <i className={`${item.icon} text-2xl`}></i>
                </div>
              </div>
              <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <i className="ri-arrow-up-line mr-1"></i>{item.trend}
              </div>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
            <p className="text-sm text-gray-500">Les modules que l’administration utilise le plus souvent.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {quickAccess.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-2xl px-4 py-5 text-center transition-colors hover:opacity-90 ${item.tone}`}
              >
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80">
                  <i className={`${item.icon} text-xl`}></i>
                </div>
                <p className="text-sm font-medium">{item.title}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Demandes client via C2P</h2>
                  <p className="text-sm text-gray-500">C2P reçoit, analyse puis attribue chaque mission à un prestataire.</p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                  {pendingC2PRequests.length} en attente
                </span>
              </div>

              <div className="space-y-3">
                {loading ? <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement des demandes...</p> : null}
                {!loading && pendingC2PRequests.length === 0 ? (
                  <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Aucune demande client en attente d’assignation.</p>
                ) : null}
                {!loading && pendingC2PRequests.map((booking) => (
                  <div key={booking.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{booking.service || 'Mission client'}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {booking.client_name || 'Client'} · {booking.booking_date || 'Date à confirmer'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Préférence client : {getRequestedProviderLabel(booking)}
                        </p>
                        {booking.matching_candidates && booking.matching_candidates.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {booking.matching_candidates.map((candidate) => (
                              <button
                                key={candidate.id}
                                type="button"
                                onClick={() => setSelectedProviderByBooking((current) => ({ ...current, [booking.id]: String(candidate.id) }))}
                                aria-pressed={getSuggestedProviderId(booking) === String(candidate.id)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                  getSuggestedProviderId(booking) === String(candidate.id)
                                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-teal-200'
                                }`}
                              >
                                {candidate.name} · score {candidate.score}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>{formatShortCurrency(Number(booking.price || 0))}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Commission {Number(booking.platform_fee_amount || 0).toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-center">
                      <select
                        value={getSuggestedProviderId(booking)}
                        onChange={(event) => setSelectedProviderByBooking((current) => ({ ...current, [booking.id]: event.target.value }))}
                        aria-label={`Choisir un prestataire pour ${booking.service || 'cette mission'}`}
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
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
                        onClick={() => void handleAssignProvider(booking)}
                        aria-label={`Assigner le prestataire sélectionné à ${booking.service || 'la mission'}`}
                        disabled={assigningBookingId === booking.id}
                        className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {assigningBookingId === booking.id ? 'Assignation...' : 'Assigner'}
                      </button>
                    </div>
                    {booking.matching_candidates?.[0]?.reasons?.length ? (
                      <p className="mt-3 text-xs text-gray-500">
                        Suggestion IA C2P : {booking.matching_candidates[0].reasons?.join(' · ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Évolution des revenus</h2>
                  <p className="text-sm text-gray-500">Derniers 7 jours de revenus observés sur les flux suivis.</p>
                </div>
                <Link to="/admin/analytics" className="text-sm font-medium text-teal-600 hover:text-teal-700">Voir rapports</Link>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="grid h-[260px] min-w-[28rem] grid-cols-7 items-end gap-4">
                {revenueBars.map((item) => (
                  <div key={item.label} className="flex h-full flex-col justify-end">
                    <div className="mb-2 text-center text-xs font-medium text-gray-500">
                      {item.amount > 0 ? formatShortCurrency(item.amount) : '0'}
                    </div>
                    <div
                      className={`w-full rounded-t-2xl ${item.amount > 0 ? 'bg-teal-500' : 'bg-gray-200'}`}
                      style={{ height: `${item.height}px` }}
                    />
                    <div className="mt-3 text-center text-sm font-medium text-gray-600">{item.label}</div>
                  </div>
                ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Actions prioritaires</h2>
                  <p className="text-sm text-gray-500">Les éléments qui demandent une décision rapide de l’administration.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {pendingActions.reduce((sum, item) => sum + item.count, 0)} à traiter
                </span>
              </div>

              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.link}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 px-4 py-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${action.color} text-white`}>
                        <i className={`${action.icon} text-base`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{action.label}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{action.count}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">Monétisation C2P</h2>
                <p className="text-sm text-gray-500">Vue rapide sur l’abonnement, les séquestres et le revenu plateforme.</p>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <p className="text-sm text-gray-500">Abonnements actifs</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{subscriptions.filter((item) => item.status === 'active').length}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <p className="text-sm text-gray-500">Séquestres en cours</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{escrows.filter((item) => ['funded', 'assigned', 'in_progress', 'delivery_review'].includes(item.status)).length}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <p className="text-sm text-gray-500">Ledger reconnu</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{commissionTotal.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Santé finance / provider</h2>
                  <p className="text-sm text-gray-500">Vision opérateur sur l’état des confirmations provider et de la delivery asynchrone.</p>
                </div>
                <Link to="/admin/payments" className="text-sm font-medium text-teal-600 hover:text-teal-700">Ouvrir la supervision</Link>
              </div>
              <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">Runtime provider DexPay</p>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${providerRuntimeBadge.tone}`}>
                        {providerRuntimeBadge.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Mode {dexPayStatus?.mode === 'live' ? 'live' : 'désactivé'}
                      {dexPayStatus?.baseUrlHost ? ` · ${dexPayStatus.baseUrlHost}` : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs text-gray-500">API provider</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {dexPayStatus?.configured ? (dexPayStatus.reachable === false ? 'Config OK / ping KO' : 'Config OK') : 'Non configurée'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs text-gray-500">Webhook verification</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {dexPayStatus?.webhookVerification === 'strict' ? 'Signature stricte' : 'Sans secret'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs text-gray-500">Dernier contrôle</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {dexPayStatus?.lastCheckedAt ? new Date(dexPayStatus.lastCheckedAt).toLocaleTimeString('fr-FR') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {financeProviderSignals.map((signal) => (
                  <Link key={signal.label} to={signal.path} className={`rounded-2xl px-4 py-4 transition-opacity hover:opacity-90 ${signal.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{signal.label}</p>
                        <p className="mt-2 text-2xl font-bold">{signal.value}</p>
                        <p className="mt-1 text-xs opacity-80">{signal.helper}</p>
                      </div>
                      {signal.badge ? (
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentLifecycleTone(signal.badge)}`}>
                          {getPaymentLifecycleLabel(signal.badge)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">Répartition</h2>
                <p className="text-sm text-gray-500">Poids relatif des grands blocs de gestion administrés.</p>
              </div>

              <div className="space-y-4">
                {breakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="text-gray-500">{item.ratio}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${item.ratio}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{item.value} élément(s)</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Activité récente</h2>
                  <p className="text-sm text-gray-500">Dernières actions structurantes sur la plateforme.</p>
                </div>
                <button type="button" aria-label="Actualiser l'activité récente" onClick={loadDashboard} className="text-sm font-medium text-teal-600 hover:text-teal-700">Actualiser</button>
              </div>

              <div className="space-y-3">
                {loading && <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement de l’activité...</p>}
                {!loading && history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                      <i className="ri-notification-3-line"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                      <p className="mt-1 text-sm text-gray-600">{entry.user}</p>
                      <p className="mt-1 text-xs text-gray-500">{entry.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
