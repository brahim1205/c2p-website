import { normalizeIp, summarizeUserAgent } from './auth-session-utils.js';
import { editableProfileUser, type AuditLog, type StoredUser, type UserSession } from './auth.store.js';
import type { AccessSession } from './auth.types.js';

export function buildPublicSessions(sessions: AccessSession[]): UserSession[] {
  return sessions.map(({
    tokenHash: _tokenHash,
    csrfToken: _csrfToken,
    createdAt: _createdAt,
    expiresAt: _expiresAt,
    absoluteExpiresAt: _absoluteExpiresAt,
    revokedAt: _revokedAt,
    userAgent: _userAgent,
    ...session
  }) => ({
    ...session,
    device: summarizeUserAgent(session.device),
    ip: normalizeIp(session.ip),
  }));
}

export function buildPersonalDataExport(input: {
  user: StoredUser;
  sessions: AccessSession[];
  auditLogs: AuditLog[];
  currentSessionId?: string;
}) {
  return {
    generatedAt: new Date().toISOString(),
    subject: {
      id: input.user.id,
      role: input.user.role,
      status: input.user.status,
    },
    profile: editableProfileUser(input.user),
    security: {
      sessions: input.sessions.map((session) => ({
        id: session.id,
        device: session.device,
        location: session.location,
        ip: session.ip,
        createdAt: session.createdAt,
        lastActive: session.lastActive,
        expiresAt: session.expiresAt,
        absoluteExpiresAt: session.absoluteExpiresAt,
        current: session.id === input.currentSessionId,
      })),
      auditLogs: input.auditLogs,
    },
    retention: {
      accountDeletion: 'Suppression depuis /auth/profile/:id par le titulaire du compte.',
      auditLogs: 'Conserves pour securite et obligations operationnelles selon la politique C2P.',
    },
  };
}
