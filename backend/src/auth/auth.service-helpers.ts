import type { Prisma } from '@prisma/client';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import type { AuditLog, PendingTwoFactorChallenge, StoredUser, UserSession } from './auth.store.js';
import type { AccessSession } from './auth.types.js';
import { addHours, addMinutes, normalizeIp, summarizeUserAgent } from './auth-session-utils.js';

type EditableUserPatchKey = keyof Omit<
  StoredUser,
  'id' | 'password' | 'passwordHash' | 'passwordHistory' | 'backupCodes' | 'createdAt'
>;

export const MANAGED_USER_PATCH_KEYS: EditableUserPatchKey[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'avatar',
  'bio',
  'location',
  'publicTitle',
  'website',
  'preferredLanguage',
  'languages',
  'skills',
  'socialLinks',
  'certifications',
  'portfolioItems',
  'introVideo',
  'publicProfileEnabled',
  'expertVerified',
  'paymentSettings',
  'userPreferences',
  'role',
  'status',
  'is2FAEnabled',
];

export const SELF_PROFILE_PATCH_KEYS: EditableUserPatchKey[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'avatar',
  'bio',
  'location',
  'publicTitle',
  'website',
  'preferredLanguage',
  'languages',
  'skills',
  'socialLinks',
  'certifications',
  'portfolioItems',
  'introVideo',
  'publicProfileEnabled',
  'paymentSettings',
  'userPreferences',
];

export const PASSWORD_RESET_CHALLENGE_TTL_MINUTES = 10;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return cloneJson(value) as Prisma.InputJsonValue;
}

export function authRowKey(table: string, rowId: string) {
  return `${table}:${rowId}`;
}

export function hashAuthToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function isBasicEmail(value: string) {
  const atIndex = value.indexOf('@');
  const lastAtIndex = value.lastIndexOf('@');
  if (atIndex <= 0 || atIndex !== lastAtIndex) return false;
  const domain = value.slice(atIndex + 1);
  return domain.includes('.') && !value.includes(' ') && !value.includes('\t') && !value.includes('\n');
}

export function isSixDigitCode(value: string) {
  return value.length === 6 && Array.from(value).every((char) => char >= '0' && char <= '9');
}

export function createAuthId(prefix: string) {
  return `${prefix}-${Date.now()}-${randomUUID()}`;
}

export function randomAuthToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function randomNumericSecurityCode() {
  return `${randomInt(100000, 1000000)}`;
}

export function normalizeStoredUser(user: StoredUser): StoredUser {
  return {
    ...user,
    passwordHistory: [...(user.passwordHistory ?? [])],
    backupCodes: [...(user.backupCodes ?? [])],
    failedLoginAttempts: user.failedLoginAttempts ?? 0,
    lockedUntil: user.lockedUntil ?? null,
    lastPasswordChangeAt: user.lastPasswordChangeAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

export function normalizeAccessSession(
  session: UserSession | AccessSession,
  accessTokenTtlMinutes: number,
  absoluteTimeoutHours: number,
): AccessSession {
  const now = new Date().toISOString();
  const base = session as Partial<AccessSession>;
  return {
    id: session.id,
    userId: session.userId,
    device: summarizeUserAgent(session.device),
    location: session.location,
    ip: normalizeIp(session.ip),
    lastActive: session.lastActive,
    current: session.current,
    tokenHash: base.tokenHash ?? '',
    csrfToken: base.csrfToken ?? '',
    createdAt: base.createdAt ?? now,
    expiresAt: base.expiresAt ?? addMinutes(now, accessTokenTtlMinutes),
    absoluteExpiresAt: base.absoluteExpiresAt ?? addHours(now, absoluteTimeoutHours),
    revokedAt: base.revokedAt ?? null,
    userAgent: base.userAgent ?? 'unknown',
  };
}

export function ensureAuthDevice(userAgent: string) {
  return userAgent || 'Navigateur Web';
}

export function pickStoredUserPatch(payload: Record<string, unknown>, keys: readonly EditableUserPatchKey[]) {
  const patch: Partial<Omit<
    StoredUser,
    'id' | 'password' | 'passwordHash' | 'passwordHistory' | 'backupCodes' | 'createdAt'
  >> = {};
  for (const key of keys) {
    if (key in payload) {
      patch[key] = payload[key] as never;
    }
  }
  return patch;
}

export function findStoredUserByEmail(email: string, users: StoredUser[]) {
  return users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
}

export function findStoredUserById(id: string, users: StoredUser[]) {
  return users.find((candidate) => candidate.id === id);
}

export function getPasswordResetChallenges(userId: string, pendingChallenges: PendingTwoFactorChallenge[]) {
  return pendingChallenges
    .filter((candidate) => candidate.userId === userId && (candidate.purpose ?? 'login-2fa') === 'password-reset')
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function withoutPasswordResetChallenges(userId: string, pendingChallenges: PendingTwoFactorChallenge[]) {
  return pendingChallenges.filter((candidate) => !(
    candidate.userId === userId
    && (candidate.purpose ?? 'login-2fa') === 'password-reset'
  ));
}

export function listAccessSessionsForUser(userId: string, sessions: AccessSession[]) {
  return sessions
    .filter((session) => session.userId === userId && !session.revokedAt)
    .sort((left, right) => Date.parse(right.lastActive) - Date.parse(left.lastActive));
}

export function listNormalizedAuditLogsForUser(userId: string, auditLogs: AuditLog[]) {
  return auditLogs
    .filter((entry) => entry.userId === userId)
    .map((entry) => ({
      ...entry,
      device: summarizeUserAgent(entry.device),
      ip: normalizeIp(entry.ip),
    }))
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}
