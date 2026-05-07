import { backendClient } from './backendClient';

export interface ProviderRecord {
  id: number;
  user_id?: string;
  name: string;
  title?: string | null;
  category?: string | null;
  bio?: string | null;
  city?: string | null;
  location?: string | null;
  rating?: number;
  reviews?: number;
  reviews_count?: number;
  price_per_hour?: number;
  verified?: boolean;
  image?: string | null;
  services?: string[];
  languages?: string[];
  completed_jobs?: number;
  response_time?: string | null;
  created_at?: string;
}

export async function fetchProviderByUserId(userId: string) {
  const { data, error } = await backendClient
    .from<ProviderRecord>('providers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
