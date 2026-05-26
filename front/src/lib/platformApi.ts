import { apiRequest } from './api';

export interface PlatformStatus {
  maintenance: boolean;
  timestamp: string;
}

export async function fetchPlatformStatus() {
  return apiRequest<PlatformStatus>('/public/platform-status', {}, { retryOnAuth: false, timeoutMs: 5000 });
}
