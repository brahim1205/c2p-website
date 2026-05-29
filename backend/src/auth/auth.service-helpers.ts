import type { Prisma } from '@prisma/client';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
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
