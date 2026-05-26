import { ROLE_LABELS, type AuthUser } from '@/lib/roles';
import type {
  AdminAccreditation,
  AdminContentItem,
  AdminReport,
} from '@/lib/adminApi';
import type { PublicContactSubmission } from '@/lib/communicationsApi';

export type ManagedUser = AuthUser & { status: string };

export type OperationsSnapshot = {
  reports: AdminReport[];
  accreditations: AdminAccreditation[];
  contents: AdminContentItem[];
  users: ManagedUser[];
  supportRequests: PublicContactSubmission[];
  paymentAlerts: number;
};

export type QueueItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: 'signalement' | 'accreditation' | 'contenu' | 'support' | 'compte' | 'paiement';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  href: string;
};

export const priorityLabels = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

export const priorityClassNames = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-teal-100 text-teal-700',
};

export const kindLabels = {
  signalement: 'Signalement',
  accreditation: 'Accreditation',
  contenu: 'Contenu',
  support: 'Support',
  compte: 'Compte',
  paiement: 'Paiement',
};

export function getAgeHours(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
}

export function getSlaLabel(item: QueueItem) {
  const age = getAgeHours(item.createdAt);
  const limit = item.priority === 'high' ? 4 : item.priority === 'medium' ? 24 : 72;
  if (age >= limit) return { label: `SLA depasse (${age}h)`, className: 'bg-red-50 text-red-700' };
  return { label: `${Math.max(1, limit - age)}h restantes`, className: 'bg-gray-100 text-gray-700' };
}

function sortByPriorityAndAge(left: QueueItem, right: QueueItem) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const priorityDiff = priorityOrder[left.priority] - priorityOrder[right.priority];
  if (priorityDiff !== 0) return priorityDiff;
  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

export function buildOperationsQueue(input: Omit<OperationsSnapshot, 'paymentAlerts'>) {
  const { reports, accreditations, contents, supportRequests, users } = input;
  const pendingReports = reports
    .filter((report) => report.status === 'pending')
    .map((report) => ({
      id: `report-${report.id}`,
      title: report.reason,
      subtitle: `${report.reported} signale par ${report.reporter}`,
      kind: 'signalement' as const,
      priority: report.priority,
      createdAt: report.date,
      href: '/admin/reports',
    }));

  const pendingAccreditations = accreditations
    .filter((item) => item.status === 'pending')
    .map((item) => ({
      id: `accreditation-${item.id}`,
      title: item.name,
      subtitle: `${item.profession} - ${item.experience}`,
      kind: 'accreditation' as const,
      priority: 'medium' as const,
      createdAt: item.date,
      href: '/admin/accreditations',
    }));

  const pendingContents = contents
    .filter((item) => item.status === 'pending')
    .map((item) => ({
      id: `content-${item.id}`,
      title: item.title,
      subtitle: `${item.type} par ${item.author}`,
      kind: 'contenu' as const,
      priority: 'medium' as const,
      createdAt: item.date,
      href: '/admin/content',
    }));

  const pendingSupport = supportRequests
    .filter((item) => item.status === 'new')
    .map((item) => ({
      id: `support-${item.id}`,
      title: item.subject,
      subtitle: `${item.firstName} ${item.lastName} - ${item.email}`,
      kind: 'support' as const,
      priority: getAgeHours(item.createdAt) > 24 ? 'high' as const : 'medium' as const,
      createdAt: item.createdAt,
      href: '/admin/messages',
    }));

  const pendingUsers = users
    .filter((item) => item.status === 'pending' || item.status === 'suspended')
    .map((item) => ({
      id: `user-${item.id}`,
      title: `${item.firstName} ${item.lastName}`,
      subtitle: `${ROLE_LABELS[item.role]} - ${item.email}`,
      kind: 'compte' as const,
      priority: item.status === 'suspended' ? 'high' as const : 'low' as const,
      createdAt: item.createdAt,
      href: '/admin/users',
    }));

  return [...pendingReports, ...pendingAccreditations, ...pendingContents, ...pendingSupport, ...pendingUsers]
    .sort(sortByPriorityAndAge);
}

export function buildOperationsStats(input: Omit<OperationsSnapshot, 'paymentAlerts'>) {
  const { reports, accreditations, contents, supportRequests, users } = input;
  return {
    pendingReports: reports.filter((report) => report.status === 'pending').length,
    pendingAccreditations: accreditations.filter((item) => item.status === 'pending').length,
    pendingContents: contents.filter((item) => item.status === 'pending').length,
    pendingSupport: supportRequests.filter((item) => item.status === 'new').length,
    pendingUsers: users.filter((item) => item.status === 'pending').length,
    suspendedUsers: users.filter((item) => item.status === 'suspended').length,
  };
}
