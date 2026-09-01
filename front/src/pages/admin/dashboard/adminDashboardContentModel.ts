import type {
  AdminDashboardBooking as Booking,
  AdminDashboardHistoryItem as HistoryItem,
  AdminDashboardProviderOption as ProviderOption,
} from '@/lib/adminApi';
import type { DexPayStatus } from '@/lib/paymentsApi';

export type { Booking, DexPayStatus, HistoryItem, ProviderOption };

export type TimeRange = 'today' | 'week' | 'month';

export interface KpiCard {
  label: string;
  value: string;
  detail: string;
  trend: string;
  icon: string;
  surface: string;
}

export interface QuickAccessItem {
  title: string;
  path: string;
  icon: string;
  tone: string;
}

export interface PendingAction {
  label: string;
  count: number;
  link: string;
  color: string;
  icon: string;
}

export interface RevenueBar {
  label: string;
  amount: number;
  height: number;
}

export interface BreakdownItem {
  label: string;
  value: number;
  ratio: number;
}

export interface FinanceProviderSignal {
  label: string;
  value: number;
  tone: string;
  helper: string;
  badge: 'pending_provider' | 'failed' | 'processing' | null;
  path: string;
}

export interface ProviderRuntimeBadge {
  label: string;
  tone: string;
}

export interface RecentRegistrationItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string | null;
}
