import type { BookingRequestType, BookingStatus, OrderStatus } from '@/lib/clientDashboard';

export interface ClientDashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
}

export interface ClientDashboardBooking {
  id: number;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  provider_id?: number | null;
  requested_provider_id?: number | null;
  requested_provider_name?: string | null;
  service: string;
  description?: string;
  booking_date: string;
  booking_time?: string;
  request_type?: BookingRequestType;
  status: BookingStatus;
  price?: number | null;
  payment_method?: string | null;
  address?: string;
  created_at?: string;
  provider?: ClientDashboardProvider | null;
  requested_provider?: ClientDashboardProvider | null;
}

export interface ClientDashboardOrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

export interface ClientDashboardOrderDownload {
  id: string;
  label: string;
  kind: string;
}

export interface ClientDashboardOrder {
  id: number;
  client_id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: ClientDashboardOrderItem[];
  tracking?: string | null;
  payment_method: string;
  downloads?: ClientDashboardOrderDownload[];
}

export interface ClientDashboardProviderRow {
  id: number;
  user_id?: string;
  name: string;
  title?: string | null;
  image?: string | null;
  services?: string[];
  category?: string | null;
  location?: string | null;
  city?: string | null;
  rating?: number | null;
  reviews?: number | null;
  reviews_count?: number | null;
  price_per_hour?: number | null;
  completed_jobs?: number | null;
  verified?: boolean | null;
  distance_km?: number | null;
  availability_status?: 'today' | 'tomorrow' | 'busy' | null;
  next_available_at?: string | null;
  payment_methods?: string[];
}

export interface ClientDashboardProvider {
  id: number;
  user_id?: string;
  name: string;
  image: string | null;
}

export interface ClientFavoriteRow {
  id: number | string;
  provider_id: number;
  provider?: {
    id: number;
    name: string;
    title: string;
    rating: number;
    image: string | null;
    distance_km?: number | null;
  } | null;
}

export interface ClientPrestataire {
  id: number;
  user_id?: string;
  name: string;
  title: string;
  avatar: string;
  service: string;
  services: string[];
  location: string;
  rating: number;
  reviews: number;
  pricePerHour: number | null;
  available: boolean;
  availabilityStatus: 'today' | 'tomorrow' | 'busy';
  nextAvailableAt: string | null;
  verified: boolean;
  categories: string[];
  experience: string;
  distanceKm: number | null;
  paymentMethods: string[];
}

export interface ClientIssueReportInput {
  user: ClientDashboardUser;
  targetId: string | number;
  targetTable: string;
  targetLabel: string;
  type: string;
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  adminMessage: string;
  userMessage: string;
  userLink: string;
}
