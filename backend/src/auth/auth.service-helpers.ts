import type { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import type { StoredUser } from './auth.store.js';

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

export function createAuthId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function randomAuthToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function randomNumericSecurityCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}
