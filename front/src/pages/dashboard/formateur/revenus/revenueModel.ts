import { type PayoutAccount, type PayoutRequest } from '@/lib/saasApi';

export interface CourseRevenue {
  id: string | number;
  title: string;
  revenue: number;
  students_count: number;
  current_price?: number;
}

export interface RevenueSnapshot {
  courses?: CourseRevenue[];
  accounts?: PayoutAccount[];
  requests?: PayoutRequest[];
}

export type SupportedPayoutMethod = 'bank' | 'paypal' | 'orange_money' | 'wave' | 'free_money' | 'mtn_money';

export const methodLabels: Record<SupportedPayoutMethod, string> = {
  bank: 'Virement bancaire',
  paypal: 'PayPal',
  orange_money: 'Orange Money',
  wave: 'Wave',
  free_money: 'Free Money',
  mtn_money: 'MTN Mobile Money',
};

export const emptyAccountForm = {
  method: 'bank' as SupportedPayoutMethod,
  account_name: '',
  account_identifier: '',
  label: '',
  is_default: false,
};

export function getMethodLabel(method: string) {
  return methodLabels[method as SupportedPayoutMethod] ?? method;
}

export function buildRevenueTotals(courses: CourseRevenue[], requests: PayoutRequest[]) {
  const grossRevenue = courses.reduce((sum, course) => sum + Number(course.revenue || 0), 0);
  const paidOut = requests.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = requests
    .filter((item) => item.status === 'pending' || item.status === 'approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    grossRevenue,
    paidOut,
    pending,
    available: Math.max(grossRevenue - paidOut - pending, 0),
  };
}

export function buildPayoutBreakdown(requests: PayoutRequest[]) {
  return {
    pending: requests.filter((item) => item.status === 'pending').length,
    approved: requests.filter((item) => item.status === 'approved').length,
    paid: requests.filter((item) => item.status === 'paid').length,
    rejected: requests.filter((item) => item.status === 'rejected').length,
  };
}
