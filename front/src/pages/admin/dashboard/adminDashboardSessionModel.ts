import type {
  AdminDashboardBooking as Booking,
  AdminDashboardCertificate,
  AdminDashboardContentItem,
  AdminDashboardCourse,
  AdminDashboardManagedUser,
  AdminDashboardProject,
  AdminDashboardService,
} from '@/lib/adminApi';
import { formatPercent, formatShortCurrency } from '@/lib/formatters';
import type { DexPayStatus } from '@/lib/paymentsApi';
import type {
  BreakdownItem,
  FinanceProviderSignal,
  KpiCard,
  PendingAction,
  ProviderRuntimeBadge,
  QuickAccessItem,
  RevenueBar,
  TimeRange,
} from './adminDashboardContentModel';

export interface ProviderHealthSummary {
  pending: number;
  failed: number;
  receiptsKo: number;
  jobsRunning: number;
  outboxDead: number;
  outboxFailed: number;
}

export const defaultProviderHealth = {
  pending: 0, failed: 0, receiptsKo: 0, jobsRunning: 0, outboxDead: 0, outboxFailed: 0,
} satisfies ProviderHealthSummary;

export interface AdminModuleItem {
  title: string;
  description: string;
  path: string;
  icon: string;
}

export function filterBookingsByTimeRange(
  bookings: Booking[],
  timeRange: TimeRange,
  now = new Date(),
) {
  return bookings.filter((booking) => {
    if (!booking.created_at) return timeRange === 'month';
    const date = new Date(booking.created_at);
    if (timeRange === 'today') return date.toDateString() === now.toDateString();
    if (timeRange === 'week') {
      const diff = now.getTime() - date.getTime();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
}

export function calculateRevenue(bookings: Booking[], courses: AdminDashboardCourse[]) {
  return bookings
    .filter((booking) => booking.status === 'completed' || booking.status === 'confirmed')
    .reduce((sum, booking) => sum + Number(booking.price ?? 0), 0)
    + courses.reduce((sum, course) => sum + Number(course.revenue ?? 0), 0);
}

export function calculateBookingRevenue(bookings: Booking[]) {
  return bookings
    .filter((booking) => booking.status === 'completed' || booking.status === 'confirmed')
    .reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
}

export function calculateActiveUsers(users: AdminDashboardManagedUser[]) {
  return users.filter((entry) => entry.status === 'active').length;
}

export function calculateModerationRate(courses: AdminDashboardCourse[]) {
  const published = courses.filter((course) => course.status === 'published').length;
  return courses.length ? (published / courses.length) * 100 : 0;
}

export function createPendingActions(input: {
  users: AdminDashboardManagedUser[];
  bookings: Booking[];
  projects: AdminDashboardProject[];
  courses: AdminDashboardCourse[];
  services: AdminDashboardService[];
  contentItems: AdminDashboardContentItem[];
  certificates: AdminDashboardCertificate[];
}): PendingAction[] {
  const { users, bookings, projects, courses, services, contentItems, certificates } = input;
  const pendingServices = contentItems.filter((item) => (
    item.status === 'pending'
    && (String(item.source_table ?? '').includes('provider_services') || String(item.type ?? '').toLowerCase().includes('service'))
  )).length || services.filter((service) => String(service.status ?? '').toLowerCase() === 'pending').length;
  const pendingCourses = contentItems.filter((item) => (
    item.status === 'pending'
    && String(item.source_table ?? '') === 'courses'
  )).length || courses.filter((course) => course.status === 'review').length;
  const pendingCertificates = certificates.filter((certificate) => ['ready', 'pending', 'review'].includes(String(certificate.status ?? '').toLowerCase())).length;
  return [
    { label: 'Comptes a valider', count: users.filter((entry) => entry.status === 'pending').length, link: '/admin/users', color: 'bg-orange-500', icon: 'ri-user-follow-line' },
    { label: 'Demandes a assigner', count: bookings.filter((booking) => booking.status === 'pending' && !booking.provider_id).length, link: '/admin/dashboard', color: 'bg-[#5fa6f3]', icon: 'ri-file-list-3-line' },
    { label: 'Services a valider', count: pendingServices, link: '/admin/operations', color: 'bg-emerald-500', icon: 'ri-briefcase-line' },
    { label: 'Formations en revue', count: pendingCourses, link: '/admin/content', color: 'bg-blue-500', icon: 'ri-book-open-line' },
    { label: 'Certifications', count: pendingCertificates, link: '/admin/dashboard', color: 'bg-purple-500', icon: 'ri-award-line' },
    { label: 'Projets en incubation', count: projects.filter((project) => project.status === 'incubation').length, link: '/admin/project-financing', color: 'bg-amber-500', icon: 'ri-lightbulb-line' },
  ];
}

export function createAdminModules(isSuperAdmin: boolean): AdminModuleItem[] {
  return [
    { title: 'Utilisateurs', description: 'Validation, suspension et suivi des comptes.', path: '/admin/users', icon: 'ri-user-settings-line' },
    { title: 'Contenus', description: 'Formations, projets et contenus a valider.', path: '/admin/content', icon: 'ri-layout-grid-line' },
    { title: 'Paiements', description: 'Transactions, commissions et rapprochement.', path: '/admin/payments', icon: 'ri-bank-card-line' },
    { title: 'Communications', description: 'Campagnes et messages plateforme.', path: '/admin/communications', icon: 'ri-mail-send-line' },
    ...(isSuperAdmin ? [{ title: 'Securite', description: 'Backups, alertes et supervision systeme.', path: '/admin/security', icon: 'ri-shield-keyhole-line' }] : []),
    { title: 'Parametres', description: 'Regles, categories et configuration.', path: '/admin/settings', icon: 'ri-settings-4-line' },
  ];
}

export function createKpis(input: {
  scopedRevenue: number;
  filteredBookings: Booking[];
  pendingAssignments: number;
  activeUsers: number;
  pendingUsers: number;
  moderationRate: number;
  publishedCourses: number;
}): KpiCard[] {
  const {
    scopedRevenue,
    filteredBookings,
    pendingAssignments,
    activeUsers,
    pendingUsers,
    moderationRate,
    publishedCourses,
  } = input;

  return [
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
      detail: `${pendingAssignments} en attente`,
      trend: `+${Math.max(1, filteredBookings.filter((booking) => booking.status === 'confirmed').length)}`,
      icon: 'ri-file-list-3-line',
      surface: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: 'Utilisateurs',
      value: String(activeUsers),
      detail: `${pendingUsers} à valider`,
      trend: `+${Math.max(1, activeUsers % 7 || 1)}`,
      icon: 'ri-team-line',
      surface: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Taux de modération',
      value: formatPercent(moderationRate),
      detail: `${publishedCourses} cours publiés`,
      trend: `+${Math.max(1, Math.round(moderationRate / 10))}%`,
      icon: 'ri-pie-chart-2-line',
      surface: 'bg-amber-50 text-amber-700',
    },
  ];
}

export function createQuickAccess(isSuperAdmin: boolean): QuickAccessItem[] {
  return [
    { title: 'Utilisateurs', path: '/admin/users', icon: 'ri-user-line', tone: 'bg-emerald-50 text-emerald-700' },
    { title: 'Paiements', path: '/admin/payments', icon: 'ri-money-dollar-circle-line', tone: 'bg-teal-50 text-teal-700' },
    { title: 'Contenus', path: '/admin/content', icon: 'ri-file-list-line', tone: 'bg-cyan-50 text-cyan-700' },
    { title: 'Accréditations', path: '/admin/accreditations', icon: 'ri-shield-check-line', tone: 'bg-amber-50 text-amber-700' },
    { title: 'Signalements', path: '/admin/reports', icon: 'ri-alert-line', tone: 'bg-rose-50 text-rose-700' },
    { title: 'Statistiques', path: '/admin/analytics', icon: 'ri-bar-chart-line', tone: 'bg-indigo-50 text-indigo-700' },
    ...(isSuperAdmin ? [{ title: 'Superadmin', path: '/superadmin/dashboard', icon: 'ri-command-line', tone: 'bg-red-50 text-red-700' }] : []),
  ];
}

export function createFinanceProviderSignals(providerHealth: ProviderHealthSummary): FinanceProviderSignal[] {
  return [
    {
      label: 'Provider en attente',
      value: providerHealth.pending,
      tone: 'bg-amber-50 text-amber-700',
      helper: 'Transactions à confirmer ou synchroniser',
      badge: 'pending_provider',
      path: '/admin/payments?panel=provider',
    },
    {
      label: 'Provider en échec',
      value: providerHealth.failed,
      tone: 'bg-red-50 text-red-700',
      helper: 'Transactions à revoir',
      badge: 'failed',
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
      badge: 'processing',
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
}

export function createProviderRuntimeBadge(dexPayStatus: DexPayStatus | null): ProviderRuntimeBadge {
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
}

export function createRevenueBars(bookings: Booking[], now = new Date()): RevenueBar[] {
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
}

export function createBreakdown(input: {
  users: AdminDashboardManagedUser[];
  bookings: Booking[];
  courses: AdminDashboardCourse[];
  projects: AdminDashboardProject[];
  activeUsers: number;
}): BreakdownItem[] {
  const { users, bookings, courses, projects, activeUsers } = input;
  const confirmedBookingsCount = bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed').length;
  const publishedCoursesCount = courses.filter((course) => course.status === 'published').length;
  const activeProjectsCount = projects.filter((project) => project.status !== 'termine').length;

  return [
    {
      label: 'Comptes actifs',
      value: activeUsers,
      ratio: users.length ? Math.round((activeUsers / users.length) * 100) : 0,
    },
    {
      label: 'Prestations confirmées',
      value: confirmedBookingsCount,
      ratio: bookings.length ? Math.round((confirmedBookingsCount / bookings.length) * 100) : 0,
    },
    {
      label: 'Cours publiés',
      value: publishedCoursesCount,
      ratio: courses.length ? Math.round((publishedCoursesCount / courses.length) * 100) : 0,
    },
    {
      label: 'Projets actifs',
      value: activeProjectsCount,
      ratio: projects.length ? Math.round((activeProjectsCount / projects.length) * 100) : 0,
    },
  ];
}
