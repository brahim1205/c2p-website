import { apiRequest } from './api';
import type { AuthUser } from './roles';

export interface DirectoryUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  avatar?: string;
  publicTitle?: string;
  expertVerified?: boolean;
}

export interface SecuritySession {
  id: string;
  userId: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  ip: string;
  device: string;
  status: 'success' | 'failed';
}

export interface PublicInstructorCourse {
  id: string | number;
  title: string;
  category: string;
  description: string | null;
  thumbnail: string | null;
  duration: string | null;
  level?: string | null;
  current_price?: number | null;
  is_free?: boolean;
}

export interface SecurityPayload {
  user: AuthUser;
  sessions: SecuritySession[];
  auditLogs: AuditLogEntry[];
  backupCodes: string[];
}

export async function fetchUsers() {
  return apiRequest<(AuthUser & { status: string; bio?: string; location?: string })[]>('/auth/users');
}

export async function fetchDirectoryUsers() {
  return apiRequest<DirectoryUser[]>('/auth/directory');
}

export async function updateManagedUser(
  id: string,
  payload: Partial<AuthUser> & { status?: string; bio?: string; location?: string },
) {
  return apiRequest<AuthUser>(`/auth/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchProfile(id: string) {
  return apiRequest<AuthUser & { status?: string }>(`/auth/profile/${id}`);
}

export async function updateProfile(
  id: string,
  payload: Partial<AuthUser>,
) {
  return apiRequest<AuthUser>(`/auth/profile/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(id: string) {
  return apiRequest<{ success: boolean }>(`/auth/profile/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchPublicInstructorProfile(id: string) {
  return apiRequest<AuthUser>(`/auth/public-profile/${id}`, {}, { retryOnAuth: false });
}

export async function fetchPublicInstructorCourses(id: string) {
  return apiRequest<PublicInstructorCourse[]>(`/learning/public/instructors/${encodeURIComponent(id)}/courses`, {}, { retryOnAuth: false });
}

export async function changeAccountPassword(userId: string, currentPassword: string, newPassword: string) {
  return apiRequest<{ user: AuthUser | null }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });
}

export async function fetchSecurity(userId: string) {
  return apiRequest<SecurityPayload>(`/auth/security/${userId}`);
}

export async function revokeAccountSession(userId: string, sessionId: string) {
  return apiRequest<{ success: boolean }>(`/auth/security/sessions/${sessionId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export async function revokeOtherAccountSessions(userId: string) {
  return apiRequest<{ success: boolean; removed: number }>(`/auth/security/sessions?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
