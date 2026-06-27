import type { ProviderCatalogRecord } from '@/lib/providerApi';

export type ProviderDetailRecord = ProviderCatalogRecord & {
  member_since: string;
  skills: string[];
};

export interface ProviderReview {
  id: number;
  client_name: string;
  client_avatar: string | null;
  rating: number;
  comment: string;
  service: string;
  helpful: number;
  created_at: string;
}

export interface ReservationFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  date: string;
  description: string;
  budget: string;
  address: string;
}
