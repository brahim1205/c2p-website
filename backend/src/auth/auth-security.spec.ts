import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RBAC_ALL_PERMISSION_IDS,
  RBAC_DEFAULT_ROLE_PERMISSIONS,
  RBAC_PERMISSION_DEFINITIONS,
  getDefaultPermissionsForRole,
  getDefaultPermissionsForRoles,
  isKnownApplicationRole,
} from './permissions.js';
import {
  MANAGED_USER_PATCH_KEYS,
  SELF_PROFILE_PATCH_KEYS,
  hashAuthToken,
  isBasicEmail,
  isSixDigitCode,
  listAccessSessionsForUser,
  pickStoredUserPatch,
  randomAuthToken,
  randomNumericSecurityCode,
} from './auth.service-helpers.js';
import { buildPersonalDataExport, buildPublicSessions } from './auth-export-utils.js';
import { addDays, isExpired, normalizeIp, summarizeUserAgent } from './auth-session-utils.js';
import type { AccessSession } from './auth.types.js';
import type { StoredUser } from './auth.store.js';

describe('RBAC defaults', () => {
  it('declare every permission exactly once', () => {
    assert.equal(new Set(RBAC_ALL_PERMISSION_IDS).size, RBAC_PERMISSION_DEFINITIONS.length);
  });

  it('only grant permissions that exist', () => {
    const known = new Set(RBAC_ALL_PERMISSION_IDS);
    for (const [role, permissions] of Object.entries(RBAC_DEFAULT_ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        assert.ok(known.has(permission), `${role} grants unknown permission ${permission}`);
      }
    }
  });

  it('reserve superadmin.* permissions to superadmin', () => {
    for (const [role, permissions] of Object.entries(RBAC_DEFAULT_ROLE_PERMISSIONS)) {
      const sensitive = permissions.filter((permission) => permission.startsWith('superadmin.'));
      if (role === 'superadmin') {
        assert.ok(sensitive.length > 0);
      } else {
        assert.deepEqual(sensitive, [], `${role} must not hold superadmin permissions`);
      }
    }
  });

  it('reserve admin data and finance administration to admins', () => {
    const adminOnly = ['users.manage', 'data.admin.write'];
    const financeAdminOnly = ['payments.admin.write', 'data.finance.write'];
    for (const [role, permissions] of Object.entries(RBAC_DEFAULT_ROLE_PERMISSIONS)) {
      if (role === 'admin' || role === 'superadmin') continue;
      const forbidden = role === 'finance_admin' ? adminOnly : [...adminOnly, ...financeAdminOnly];
      for (const permission of forbidden) {
        assert.ok(!permissions.includes(permission), `${role} must not hold ${permission}`);
      }
    }
  });

  it('return no permission for an unknown role and merge multiple roles', () => {
    assert.deepEqual(getDefaultPermissionsForRole('hacker'), []);
    const merged = getDefaultPermissionsForRoles(['apprenant', 'formateur']);
    assert.ok(merged.has('data.learning.write'));
    assert.ok(!isKnownApplicationRole('operator'));
    assert.ok(isKnownApplicationRole('superadmin'));
  });
});

describe('user patch whitelists', () => {
  it('never let a user change their own role, status, 2FA or verification badge', () => {
    for (const key of ['role', 'status', 'is2FAEnabled', 'expertVerified'] as const) {
      assert.ok(!SELF_PROFILE_PATCH_KEYS.includes(key), `${key} must not be self editable`);
    }
  });

  it('never accept credentials through a patch, even for admins', () => {
    for (const keys of [SELF_PROFILE_PATCH_KEYS, MANAGED_USER_PATCH_KEYS]) {
      for (const key of ['id', 'password', 'passwordHash', 'passwordHistory', 'backupCodes', 'createdAt']) {
        assert.ok(!(keys as string[]).includes(key), `${key} must not be patchable`);
      }
    }
  });

  it('drop keys outside the whitelist', () => {
    const patch = pickStoredUserPatch(
      { firstName: 'Awa', role: 'superadmin', passwordHash: 'x', status: 'active' },
      SELF_PROFILE_PATCH_KEYS,
    );
    assert.deepEqual(patch, { firstName: 'Awa' });
  });
});

describe('auth primitives', () => {
  it('validate emails conservatively', () => {
    assert.ok(isBasicEmail('awa@c2p.sn'));
    for (const value of ['', 'awa', '@c2p.sn', 'awa@c2p', 'a@b@c2p.sn', 'awa @c2p.sn']) {
      assert.ok(!isBasicEmail(value), value);
    }
  });

  it('validate six digit codes only', () => {
    assert.ok(isSixDigitCode('012345'));
    for (const value of ['12345', '1234567', '12a456', ' 12345', '١٢٣٤٥٦']) {
      assert.ok(!isSixDigitCode(value), value);
    }
  });

  it('generate six digit security codes', () => {
    for (let index = 0; index < 200; index += 1) {
      assert.ok(isSixDigitCode(randomNumericSecurityCode()));
    }
  });

  it('generate unique url-safe tokens and hash them deterministically', () => {
    const first = randomAuthToken();
    assert.notEqual(first, randomAuthToken());
    assert.match(first, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(hashAuthToken(first), hashAuthToken(first));
    assert.notEqual(hashAuthToken(first), first);
    assert.match(hashAuthToken(first), /^[0-9a-f]{64}$/);
  });
});

function session(overrides: Partial<AccessSession>): AccessSession {
  return {
    id: 's1',
    userId: 'u1',
    device: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
    location: 'Dakar',
    ip: '127.0.0.1',
    lastActive: '2026-01-01T10:00:00.000Z',
    current: false,
    tokenHash: 'secret-hash',
    csrfToken: 'secret-csrf',
    createdAt: '2026-01-01T09:00:00.000Z',
    expiresAt: '2026-01-01T11:00:00.000Z',
    absoluteExpiresAt: '2026-01-02T09:00:00.000Z',
    revokedAt: null,
    userAgent: 'raw-agent',
    ...overrides,
  };
}

describe('session exposure', () => {
  it('strip token hashes and csrf tokens from public sessions', () => {
    const [publicSession] = buildPublicSessions([session({})]);
    const serialized = JSON.stringify(publicSession);
    assert.ok(!serialized.includes('secret-hash'));
    assert.ok(!serialized.includes('secret-csrf'));
    assert.equal(publicSession.device, 'Google Chrome sur Windows');
    assert.equal(publicSession.ip, 'Environnement local');
  });

  it('exclude revoked sessions and sort by last activity', () => {
    const sessions = listAccessSessionsForUser('u1', [
      session({ id: 'old', lastActive: '2026-01-01T08:00:00.000Z' }),
      session({ id: 'revoked', revokedAt: '2026-01-01T09:30:00.000Z' }),
      session({ id: 'recent', lastActive: '2026-01-01T12:00:00.000Z' }),
      session({ id: 'other-user', userId: 'u2' }),
    ]);
    assert.deepEqual(sessions.map((entry) => entry.id), ['recent', 'old']);
  });

  it('never leak credentials in the personal data export', () => {
    const user = {
      id: 'u1',
      firstName: 'Awa',
      lastName: 'Diop',
      email: 'awa@c2p.sn',
      role: 'apprenant',
      status: 'active',
      password: 'plain-password',
      passwordHash: '$argon2id$secret',
      passwordHistory: ['$argon2id$old'],
      backupCodes: ['backup-1'],
      createdAt: '2026-01-01T00:00:00.000Z',
    } as unknown as StoredUser;
    const serialized = JSON.stringify(buildPersonalDataExport({ user, sessions: [session({})], auditLogs: [] }));
    for (const secret of ['plain-password', '$argon2id$secret', '$argon2id$old', 'backup-1', 'secret-hash', 'secret-csrf']) {
      assert.ok(!serialized.includes(secret), `export leaks ${secret}`);
    }
  });

  it('summarize user agents and IPs', () => {
    assert.equal(summarizeUserAgent(''), 'Navigateur Web');
    assert.equal(summarizeUserAgent('Mozilla/5.0 (Macintosh) Version/17 Safari/605'), 'Safari sur macOS');
    assert.equal(summarizeUserAgent('HeadlessChrome/120'), 'Navigateur local de test');
    assert.equal(normalizeIp(''), 'Adresse masquee');
    assert.equal(normalizeIp('41.82.1.2'), '41.82.1.2');
  });

  it('compute expirations', () => {
    assert.ok(!isExpired(null));
    assert.ok(isExpired('2000-01-01T00:00:00.000Z'));
    assert.ok(!isExpired(addDays(new Date().toISOString(), 1)));
  });
});
