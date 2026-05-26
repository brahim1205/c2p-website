import type { AuthUser, AuditLog, Role, UserSession } from './auth.store.js';

export type AuthTableName =
  | 'auth_users'
  | 'auth_sessions'
  | 'auth_refresh_tokens'
  | 'auth_pending_2fa'
  | 'auth_audit_logs';

export interface AccessSession extends UserSession {
  tokenHash: string;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  revokedAt?: string | null;
  userAgent: string;
}

export interface LoginResult {
  user: AuthUser;
  requires2FA?: boolean;
  challengeId?: string;
  devCodePreview?: string;
  csrfToken?: string;
}

export interface RefreshResult {
  user: AuthUser;
  csrfToken: string;
}

export interface RegisterPayload {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: Role;
  bio?: string;
  location?: string;
  publicTitle?: string;
  website?: string;
  preferredLanguage?: string;
  skills?: string[];
  publicProfileEnabled?: boolean;
}

export interface PasswordChangePayload {
  userId?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface TwoFactorVerificationPayload {
  challengeId?: string;
  userId?: string;
  code?: string;
}

export interface SecurityPayload {
  user: AuthUser;
  sessions: UserSession[];
  auditLogs: AuditLog[];
  backupCodes: string[];
}

export interface PermissionAuditContext {
  targetType?: string | null;
  targetId?: string | null;
  httpMethod?: string | null;
  route?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  reason?: string | null;
}
