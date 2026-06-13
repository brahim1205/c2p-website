import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service.js';
import { AuditLogService } from '../database/audit-log.service.js';
import { ConfigService } from '../config/config.service.js';
import { normalizeUserPhoneForStorage } from '../communications/phone-normalization.js';
import { AuthSecurityDeliveryService } from './auth-security-delivery.service.js';
import { AuthOAuthService } from './auth-oauth.service.js';
import { RbacService } from './rbac.service.js';
import {
  editableProfileUser,
  directoryUser,
  isAdminRole,
  publicUser,
  publicInstructorProfile,
  type AuditLog,
  type AuditStatus,
  type AuthUser,
  type CertificationItem,
  type DirectoryUser,
  type PaymentSettings,
  type PendingTwoFactorChallenge,
  type PortfolioItem,
  type RefreshTokenSession,
  type Role,
  type SocialLinks,
  type StoredUser,
  type UserSession,
  type UserStatus,
} from './auth.store.js';
import type { AuthenticatedRequest, RequestMeta } from '../common/http/request-context.js';
import type {
  AccessSession,
  AuthTableName,
  LoginResult,
  PasswordChangePayload,
  PermissionAuditContext,
  RefreshResult,
  RegisterPayload,
  SecurityPayload,
  TwoFactorVerificationPayload,
} from './auth.types.js';
import {
  addDays,
  addHours,
  addMinutes,
  isExpired,
  normalizeIp,
  summarizeUserAgent,
} from './auth-session-utils.js';
import {
  MANAGED_USER_PATCH_KEYS,
  PASSWORD_RESET_CHALLENGE_TTL_MINUTES,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  PASSWORD_RESET_MAX_ATTEMPTS,
  SELF_PROFILE_PATCH_KEYS,
  authRowKey,
  createAuthId,
  ensureAuthDevice,
  findStoredUserByEmail,
  findStoredUserById,
  getPasswordResetChallenges,
  hashAuthToken,
  isBasicEmail,
  isSixDigitCode,
  listAccessSessionsForUser,
  listNormalizedAuditLogsForUser,
  normalizeAccessSession,
  normalizeStoredUser,
  pickStoredUserPatch,
  randomAuthToken,
  randomNumericSecurityCode,
  toPrismaJson,
  withoutPasswordResetChallenges,
} from './auth.service-helpers.js';
import { buildPersonalDataExport, buildPublicSessions } from './auth-export-utils.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly securityDeliveryService: AuthSecurityDeliveryService,
    private readonly oauthService: AuthOAuthService,
    private readonly rbacService: RbacService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private mutationQueue: Promise<void> = Promise.resolve();

  private async runSerializedMutation<T>(operation: () => Promise<T>) {
    const previous = this.mutationQueue;
    let release!: () => void;

    this.mutationQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await operation();
    } finally {
      release();
    }
  }

  private normalizePhonePatch(patch: { phone?: string }) {
    if (patch.phone === undefined) return;
    const normalizedPhone = normalizeUserPhoneForStorage(patch.phone);
    if (patch.phone && !normalizedPhone) {
      throw new BadRequestException('Numero de telephone invalide.');
    }
    patch.phone = normalizedPhone;
  }

  private ensureLocation() {
    return 'Dakar, Senegal';
  }

  private cookieBaseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
      domain: this.config.cookieDomain,
      path: '/',
    };
  }

  private csrfCookieOptions(): CookieOptions {
    return {
      ...this.cookieBaseOptions(),
      httpOnly: false,
    };
  }

  private clearCookieOptions(): CookieOptions {
    return {
      ...this.cookieBaseOptions(),
      maxAge: 0,
    };
  }

  private async loadRows<T>(table: AuthTableName): Promise<T[]> {
    if (!this.prisma.isConnected) {
      throw new ServiceUnavailableException('La base de donnees est indisponible.');
    }

    const rows = await this.prisma.appRow.findMany({
      where: { table },
      orderBy: [{ createdAt: 'asc' }],
    });

    return rows.map((row) => row.data as T);
  }

  private async saveRows<T extends { id: string }>(table: AuthTableName, rows: T[]) {
    if (!this.prisma.isConnected) {
      throw new ServiceUnavailableException('La base de donnees est indisponible.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appRow.deleteMany({ where: { table } });
      if (rows.length > 0) {
        await tx.appRow.createMany({
          data: rows.map((row) => ({
            key: authRowKey(table, row.id),
            table,
            rowId: row.id,
            data: toPrismaJson(row),
          })),
        });
      }
    });
  }

  private async loadSnapshot() {
    const [rawUsers, rawSessions, refreshTokens, pendingChallenges, auditLogs] = await Promise.all([
      this.loadRows<StoredUser>('auth_users'),
      this.loadRows<UserSession>('auth_sessions'),
      this.loadRows<RefreshTokenSession>('auth_refresh_tokens'),
      this.loadRows<PendingTwoFactorChallenge>('auth_pending_2fa'),
      this.loadRows<AuditLog>('auth_audit_logs'),
    ]);

    const users = rawUsers.map((user) => normalizeStoredUser(user));
    const sessions = rawSessions.map((session) => normalizeAccessSession(
      session,
      this.config.accessTokenTtlMinutes,
      this.config.sessionAbsoluteTimeoutHours,
    ));
    const now = Date.now();

    return {
      users,
      sessions: sessions.filter((session) => !session.revokedAt && Date.parse(session.absoluteExpiresAt) > now),
      refreshTokens: refreshTokens.filter((token) => !token.revokedAt && Date.parse(token.expiresAt) > now),
      pendingChallenges: pendingChallenges.filter((challenge) => Date.parse(challenge.expiresAt) > now),
      auditLogs,
    };
  }

  private async saveUsers(users: StoredUser[]) {
    await this.saveRows('auth_users', users);
  }

  private async saveSessions(sessions: AccessSession[]) {
    await this.saveRows('auth_sessions', sessions);
  }

  private async saveRefreshTokens(refreshTokens: RefreshTokenSession[]) {
    await this.saveRows('auth_refresh_tokens', refreshTokens);
  }

  private async savePendingChallenges(pendingChallenges: PendingTwoFactorChallenge[]) {
    await this.saveRows('auth_pending_2fa', pendingChallenges);
  }

  private async saveAuditLogs(auditLogs: AuditLog[]) {
    await this.saveRows('auth_audit_logs', auditLogs);
  }

  private appendAuditLog(
    auditLogs: AuditLog[],
    sessions: AccessSession[],
    userId: string,
    action: string,
    status: AuditStatus,
    overrides: Partial<Omit<AuditLog, 'id' | 'userId' | 'action' | 'status'>> = {},
  ) {
    const latestSession = listAccessSessionsForUser(userId, sessions)[0];
    auditLogs.unshift({
      id: createAuthId('audit'),
      userId,
      action,
      status,
      timestamp: overrides.timestamp ?? new Date().toISOString(),
      ip: normalizeIp(overrides.ip ?? latestSession?.ip ?? '127.0.0.1'),
      device: summarizeUserAgent(overrides.device ?? latestSession?.device ?? 'Navigateur Web'),
    });
  }

  private getRequestMeta(request: Pick<AuthenticatedRequest, 'ip' | 'headers' | 'requestId'>): RequestMeta {
    return {
      ip: normalizeIp(request.ip || '127.0.0.1'),
      userAgent: summarizeUserAgent(String(request.headers['user-agent'] ?? 'Navigateur Web')),
      requestId: String(request.requestId ?? request.headers['x-request-id'] ?? createAuthId('req')),
    };
  }

  private async ensureUserHasPasswordHash(user: StoredUser) {
    if (user.passwordHash) return;
    if (!user.password) {
      throw new UnauthorizedException('Compte invalide.');
    }
    user.passwordHash = await argon2.hash(user.password, { type: argon2.argon2id });
    user.passwordHistory = [user.passwordHash, ...(user.passwordHistory ?? [])].slice(0, 5);
    delete user.password;
  }

  private async verifyPassword(user: StoredUser, password: string) {
    if (user.passwordHash) {
      return argon2.verify(user.passwordHash, password);
    }

    if (user.password && user.password === password) {
      user.passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      user.passwordHistory = [user.passwordHash, ...(user.passwordHistory ?? [])].slice(0, 5);
      delete user.password;
      return true;
    }

    return false;
  }

  private validatePasswordPolicy(password: string, previousHashes: string[]) {
    if (password.length < 10) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 10 caracteres.');
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('Le mot de passe doit contenir une minuscule, une majuscule, un chiffre et un caractere special.');
    }
    return Promise.all(previousHashes.slice(0, 5).map((hash) => argon2.verify(hash, password).catch(() => false))).then((results) => {
      if (results.some(Boolean)) {
        throw new BadRequestException('Le nouveau mot de passe a deja ete utilise recemment.');
      }
    });
  }

  private issueSession(
    user: StoredUser,
    sessions: AccessSession[],
    refreshTokens: RefreshTokenSession[],
    meta: RequestMeta,
  ) {
    const now = new Date().toISOString();
    const accessToken = randomAuthToken();
    const refreshToken = randomAuthToken();
    const csrfToken = randomAuthToken(24);
    const sessionId = createAuthId('sess');
    const refreshId = createAuthId('rt');

    const session: AccessSession = {
      id: sessionId,
      userId: user.id,
      device: ensureAuthDevice(meta.userAgent),
      location: this.ensureLocation(),
      ip: meta.ip,
      lastActive: now,
      current: true,
      tokenHash: hashAuthToken(accessToken),
      csrfToken,
      createdAt: now,
      expiresAt: addMinutes(now, this.config.accessTokenTtlMinutes),
      absoluteExpiresAt: addHours(now, this.config.sessionAbsoluteTimeoutHours),
      revokedAt: null,
      userAgent: meta.userAgent,
    };

    const refreshRow: RefreshTokenSession = {
      id: refreshId,
      userId: user.id,
      sessionId,
      tokenHash: hashAuthToken(refreshToken),
      createdAt: now,
      expiresAt: addDays(now, this.config.refreshTokenTtlDays),
      ip: meta.ip,
      userAgent: meta.userAgent,
      revokedAt: null,
      replacedById: null,
    };

    for (const candidate of sessions) {
      if (candidate.userId === user.id) {
        candidate.current = false;
      }
    }

    sessions.unshift(session);
    refreshTokens.unshift(refreshRow);

    const activeSessions = sessions
      .filter((candidate) => candidate.userId === user.id && !candidate.revokedAt)
      .sort((left, right) => Date.parse(right.lastActive) - Date.parse(left.lastActive));
    for (const staleSession of activeSessions.slice(5)) {
      staleSession.revokedAt = now;
      staleSession.current = false;
      refreshTokens
        .filter((token) => token.sessionId === staleSession.id && !token.revokedAt)
        .forEach((token) => {
          token.revokedAt = now;
        });
    }

    return {
      accessToken,
      refreshToken,
      csrfToken,
      sessionId,
    };
  }

  private setAuthCookies(
    response: Response,
    payload: { accessToken: string; refreshToken: string; csrfToken: string },
  ) {
    response.cookie(this.config.sessionCookieName, payload.accessToken, {
      ...this.cookieBaseOptions(),
      maxAge: this.config.accessTokenTtlMinutes * 60_000,
    });
    response.cookie(this.config.refreshCookieName, payload.refreshToken, {
      ...this.cookieBaseOptions(),
      maxAge: this.config.refreshTokenTtlDays * 86_400_000,
    });
    response.cookie(this.config.csrfCookieName, payload.csrfToken, {
      ...this.csrfCookieOptions(),
      maxAge: this.config.accessTokenTtlMinutes * 60_000,
    });
  }

  clearAuthCookies(response: Response) {
    response.clearCookie(this.config.sessionCookieName, this.clearCookieOptions());
    response.clearCookie(this.config.refreshCookieName, this.clearCookieOptions());
    response.clearCookie(this.config.csrfCookieName, { ...this.clearCookieOptions(), httpOnly: false });
  }

  private getActor(request: AuthenticatedRequest) {
    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentification requise.');
    }
    return request.auth.user;
  }

  requireRole(request: AuthenticatedRequest, allowedRoles: Role[]) {
    const actor = this.getActor(request);
    if (!allowedRoles.includes(actor.role)) {
      throw new UnauthorizedException('Acces refuse.');
    }
    return actor;
  }

  private shouldAuditPermissionDecision(
    permissions: string[],
    context?: PermissionAuditContext,
  ) {
    const normalizedMethod = String(context?.httpMethod ?? '').trim().toUpperCase();
    if (normalizedMethod && normalizedMethod !== 'GET') {
      return true;
    }

    return permissions.some((permission) => (
      permission.startsWith('users.')
      || permission.startsWith('communications.')
      || permission.startsWith('payments.')
      || permission.startsWith('superadmin.')
      || permission.startsWith('support.')
      || permission.startsWith('data.admin.')
      || permission.startsWith('data.finance.')
      || permission.startsWith('data.subscriptions.')
      || permission.endsWith('.write')
      || permission.endsWith('.manage')
    ));
  }

  async assertPermissionForActor(
    actor: AuthUser,
    permissions: string | string[],
    context?: PermissionAuditContext,
  ) {
    const requestedPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const resolvedPermissions = [...await this.rbacService.getEffectivePermissions(actor)]
      .sort((left, right) => left.localeCompare(right));
    const resolvedRoles = [...await this.rbacService.getEffectiveRoleIds(actor)]
      .sort((left, right) => left.localeCompare(right));
    const granted = requestedPermissions.every((permission) => resolvedPermissions.includes(permission));

    if (!granted || this.shouldAuditPermissionDecision(requestedPermissions, context)) {
      await this.auditLogService.record({
        scope: 'rbac',
        action: 'permission_check',
        status: granted ? 'success' : 'failed',
        userId: actor.id,
        actorLabel: `${actor.firstName} ${actor.lastName}`.trim() || actor.email || actor.id,
        targetType: context?.targetType ?? 'permission',
        targetId: context?.targetId ?? requestedPermissions.join(','),
        ip: context?.ip ?? undefined,
        device: context?.userAgent ?? undefined,
        reason: context?.reason ?? (granted ? 'permission_granted' : 'permission_denied'),
        metadata: {
          decision: granted ? 'granted' : 'denied',
          permissions: requestedPermissions,
          resolvedPermissions,
          resolvedRoles,
          httpMethod: context?.httpMethod ?? null,
          route: context?.route ?? null,
          requestId: context?.requestId ?? null,
        },
      });
    }

    if (!granted) {
      throw new UnauthorizedException('Acces refuse.');
    }

    return actor;
  }

  async requirePermission(
    request: AuthenticatedRequest,
    permissions: string | string[],
    context: Partial<PermissionAuditContext> = {},
  ) {
    const actor = this.getActor(request);
    const meta = this.getRequestMeta(request);
    await this.assertPermissionForActor(actor, permissions, {
      ...context,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: context.requestId ?? meta.requestId,
      httpMethod: request.method ?? context.httpMethod ?? null,
      route: request.originalUrl ?? request.route?.path ?? context.route ?? null,
    });
    return actor;
  }

  requireSelfOrAdmin(request: AuthenticatedRequest, userId: string) {
    const actor = this.getActor(request);
    if (!isAdminRole(actor) && actor.id !== userId) {
      throw new UnauthorizedException('Acces refuse.');
    }
    return actor;
  }

  requireSelf(request: AuthenticatedRequest, userId: string) {
    const actor = this.getActor(request);
    if (actor.id !== userId) {
      throw new UnauthorizedException('Acces refuse.');
    }
    return actor;
  }

  private async revokeSessionChain(sessionId: string, sessions: AccessSession[], refreshTokens: RefreshTokenSession[]) {
    const now = new Date().toISOString();
    sessions
      .filter((session) => session.id === sessionId && !session.revokedAt)
      .forEach((session) => {
        session.revokedAt = now;
        session.current = false;
      });
    refreshTokens
      .filter((token) => token.sessionId === sessionId && !token.revokedAt)
      .forEach((token) => {
        token.revokedAt = now;
      });
  }

  private assertStatusCanLogin(status: UserStatus) {
    if (status === 'suspended') {
      throw new UnauthorizedException('Ce compte est suspendu.');
    }
    if (status === 'pending') {
      throw new UnauthorizedException('Ce compte est en attente de validation.');
    }
  }

  private async findSessionByAccessToken(accessToken: string | undefined) {
    if (!accessToken) return null;
    const { users, sessions } = await this.loadSnapshot();
    const tokenHash = hashAuthToken(accessToken);
    const session = sessions.find((candidate) => candidate.tokenHash === tokenHash && !candidate.revokedAt);
    if (!session) return null;
    if (isExpired(session.expiresAt) || isExpired(session.absoluteExpiresAt)) {
      return null;
    }
    const user = findStoredUserById(session.userId, users);
    if (!user) return null;
    return { user, session, sessions, users };
  }

  async attachAuthToRequest(request: AuthenticatedRequest) {
    const accessToken = request.cookies?.[this.config.sessionCookieName];
    const snapshot = await this.findSessionByAccessToken(accessToken);
    if (!snapshot) {
      request.auth = undefined;
      return;
    }

    request.auth = {
      user: publicUser(snapshot.user),
      sessionId: snapshot.session.id,
      csrfToken: snapshot.session.csrfToken,
    };
  }

  async getCurrentUser(request: AuthenticatedRequest) {
    return request.auth?.user ?? null;
  }

  async acceptMonetizedClauses(request: AuthenticatedRequest) {
    return this.runSerializedMutation(async () => {
      const actor = this.getActor(request);
      const { users, sessions, auditLogs } = await this.loadSnapshot();
      const user = findStoredUserById(actor.id, users);
      if (!user) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      user.onboardingClausesAcceptedAt = new Date().toISOString();
      user.onboardingClausesVersion = 'monetized-v1';
      this.appendAuditLog(auditLogs, sessions, user.id, 'Acceptation clauses abonnement', 'success');

      await Promise.all([
        this.saveUsers(users),
        this.saveAuditLogs(auditLogs),
      ]);

      return publicUser(user);
    });
  }

  async startOAuth(
    rawProvider: string,
    payload: { role?: Role; returnTo?: string },
    request: AuthenticatedRequest,
    response: Response,
  ) {
    return this.oauthService.start(rawProvider, payload, request, response);
  }

  async completeOAuth(
    rawProvider: string,
    payload: { code?: string; state?: string },
    request: AuthenticatedRequest,
    response: Response,
  ) {
    return this.runSerializedMutation(async () => {
      const { provider, state, profile } = await this.oauthService.complete(rawProvider, payload, request);
      const meta = this.getRequestMeta(request);
      const { users, sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      let user = findStoredUserByEmail(profile.email, users);

      if (user) {
        if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
      } else {
        user = {
          id: createAuthId('usr'),
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: undefined,
          role: state.role,
          status: 'active',
          avatar: profile.avatar,
          bio: undefined,
          location: undefined,
          publicTitle: undefined,
          website: undefined,
          preferredLanguage: undefined,
          skills: undefined,
          publicProfileEnabled: false,
          is2FAEnabled: false,
          backupCodes: [],
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastPasswordChangeAt: null,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        users.push(user);
      }

      this.assertStatusCanLogin(user.status);
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.lastLoginAt = new Date().toISOString();
      const issued = this.issueSession(user, sessions, refreshTokens, meta);
      this.appendAuditLog(auditLogs, sessions, user.id, `Connexion ${provider}`, 'success', {
        ip: meta.ip,
        device: ensureAuthDevice(meta.userAgent),
      });

      await Promise.all([
        this.saveUsers(users),
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      this.setAuthCookies(response, issued);
      const targetPath = this.oauthService.userNeedsProfileOnboarding(user)
        ? `/auth/onboarding/profil?next=${encodeURIComponent(state.returnTo)}`
        : state.returnTo;
      return response.redirect(this.oauthService.getFrontendUrl(targetPath, request));
    });
  }

  async login(payload: { email?: string; password?: string }, request: AuthenticatedRequest, response: Response): Promise<LoginResult> {
    return this.runSerializedMutation(async () => {
      const email = payload.email?.trim().toLowerCase();
      const password = payload.password ?? '';
      const meta = this.getRequestMeta(request);
      const { users, sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      const user = email ? findStoredUserByEmail(email, users) : undefined;

      if (!user) {
        throw new UnauthorizedException('Adresse email ou mot de passe incorrect.');
      }

      if (user.lockedUntil && !isExpired(user.lockedUntil)) {
        this.appendAuditLog(auditLogs, sessions, user.id, 'Tentative de connexion sur compte verrouille', 'failed', {
          ip: meta.ip,
          device: ensureAuthDevice(meta.userAgent),
        });
        await this.saveAuditLogs(auditLogs);
        throw new UnauthorizedException('Compte temporairement verrouille. Reessayez plus tard.');
      }

      const passwordValid = await this.verifyPassword(user, password);
      if (!passwordValid) {
        user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
        if ((user.failedLoginAttempts ?? 0) >= 5) {
          user.lockedUntil = addMinutes(new Date().toISOString(), 15);
        }
        this.appendAuditLog(auditLogs, sessions, user.id, 'Tentative de connexion echouee', 'failed', {
          ip: meta.ip,
          device: ensureAuthDevice(meta.userAgent),
        });
        await Promise.all([this.saveUsers(users), this.saveAuditLogs(auditLogs)]);
        throw new UnauthorizedException('Adresse email ou mot de passe incorrect.');
      }

      this.assertStatusCanLogin(user.status);
      await this.ensureUserHasPasswordHash(user);
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.lastLoginAt = new Date().toISOString();

      const issued = this.issueSession(user, sessions, refreshTokens, meta);
      this.appendAuditLog(auditLogs, sessions, user.id, 'Connexion reussie', 'success', {
        ip: meta.ip,
        device: ensureAuthDevice(meta.userAgent),
      });

      await Promise.all([
        this.saveUsers(users),
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      this.setAuthCookies(response, issued);
      return { user: publicUser(user), csrfToken: issued.csrfToken };
    });
  }

  async verifyTwoFactor(
    payload: TwoFactorVerificationPayload,
    request: AuthenticatedRequest,
    response: Response,
  ): Promise<LoginResult> {
    void payload;
    void request;
    void response;
    throw new BadRequestException('La verification secondaire n est plus utilisee pour la connexion.');
  }

  async resendTwoFactor(
    payload: { challengeId?: string },
    request: AuthenticatedRequest,
  ) {
    void payload;
    void request;
    throw new BadRequestException('La verification secondaire n est plus utilisee pour la connexion.');
  }

  async refresh(request: AuthenticatedRequest, response: Response): Promise<RefreshResult> {
    return this.runSerializedMutation(async () => {
      const refreshToken = request.cookies?.[this.config.refreshCookieName];
      if (!refreshToken) {
        throw new UnauthorizedException('Session expiree.');
      }

      const meta = this.getRequestMeta(request);
      const { users, sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      const refreshRow = refreshTokens.find((candidate) => candidate.tokenHash === hashAuthToken(refreshToken) && !candidate.revokedAt);
      if (!refreshRow || isExpired(refreshRow.expiresAt)) {
        throw new UnauthorizedException('Session expiree.');
      }

      const user = findStoredUserById(refreshRow.userId, users);
      if (!user) {
        throw new UnauthorizedException('Session expiree.');
      }

      await this.revokeSessionChain(refreshRow.sessionId, sessions, refreshTokens);
      const issued = this.issueSession(user, sessions, refreshTokens, meta);
      refreshRow.revokedAt = new Date().toISOString();
      refreshRow.replacedById = issued.sessionId;

      this.appendAuditLog(auditLogs, sessions, user.id, 'Rotation de session', 'success', {
        ip: meta.ip,
        device: ensureAuthDevice(meta.userAgent),
      });

      await Promise.all([
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      this.setAuthCookies(response, issued);
      return {
        user: publicUser(user),
        csrfToken: issued.csrfToken,
      };
    });
  }

  async logout(request: AuthenticatedRequest, response: Response) {
    return this.runSerializedMutation(async () => {
      const accessToken = request.cookies?.[this.config.sessionCookieName];
      const refreshToken = request.cookies?.[this.config.refreshCookieName];
      const { sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      const now = new Date().toISOString();
      let userId: string | null = null;

      if (accessToken) {
        const session = sessions.find((candidate) => candidate.tokenHash === hashAuthToken(accessToken) && !candidate.revokedAt);
        if (session) {
          userId = session.userId;
          session.revokedAt = now;
          session.current = false;
        }
      }

      if (refreshToken) {
        const refreshRow = refreshTokens.find((candidate) => candidate.tokenHash === hashAuthToken(refreshToken) && !candidate.revokedAt);
        if (refreshRow) {
          userId = userId ?? refreshRow.userId;
          refreshRow.revokedAt = now;
        }
      }

      if (userId) {
        this.appendAuditLog(auditLogs, sessions, userId, 'Deconnexion', 'success');
      }

      await Promise.all([
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      this.clearAuthCookies(response);
      return { success: true };
    });
  }

  async register(payload: RegisterPayload, request: AuthenticatedRequest, response: Response) {
    return this.runSerializedMutation(async () => {
      const email = payload.email?.trim().toLowerCase();
      if (!email || !payload.password || !payload.firstName || !payload.lastName || !payload.role) {
        throw new BadRequestException('Informations de compte invalides.');
      }

      await this.validatePasswordPolicy(payload.password, []);
      const phone = normalizeUserPhoneForStorage(payload.phone);
      if (payload.phone && !phone) {
        throw new BadRequestException('Numero de telephone invalide.');
      }
      const { users, sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      if (findStoredUserByEmail(email, users)) {
        throw new ConflictException('Un compte existe deja avec cette adresse email.');
      }

      const meta = this.getRequestMeta(request);
      const passwordHash = await argon2.hash(payload.password, { type: argon2.argon2id });
      const user: StoredUser = {
        id: createAuthId('usr'),
        email,
        passwordHash,
        passwordHistory: [passwordHash],
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone,
        role: payload.role,
        status: 'active',
        avatar: undefined,
        bio: payload.bio?.trim() || undefined,
        location: payload.location?.trim() || undefined,
        publicTitle: payload.publicTitle?.trim() || undefined,
        website: payload.website?.trim() || undefined,
        preferredLanguage: payload.preferredLanguage?.trim() || undefined,
        skills: Array.isArray(payload.skills) ? payload.skills.map((skill) => String(skill).trim()).filter(Boolean).slice(0, 12) : undefined,
        publicProfileEnabled: Boolean(payload.publicProfileEnabled),
        is2FAEnabled: false,
        backupCodes: [],
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastPasswordChangeAt: new Date().toISOString(),
        createdAt: new Date().toISOString().slice(0, 10),
      };

      users.push(user);
      const issued = this.issueSession(user, sessions, refreshTokens, meta);
      this.appendAuditLog(auditLogs, sessions, user.id, 'Inscription du compte', 'success', {
        ip: meta.ip,
        device: ensureAuthDevice(meta.userAgent),
      });

      await Promise.all([
        this.saveUsers(users),
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      this.setAuthCookies(response, issued);
      return { user: publicUser(user), csrfToken: issued.csrfToken };
    });
  }

  async forgotPassword(payload: { email?: string }, request: AuthenticatedRequest) {
    return this.runSerializedMutation(async () => {
      const email = payload.email?.trim().toLowerCase();
      if (!email || !isBasicEmail(email)) {
        throw new BadRequestException('Adresse email invalide.');
      }

      const meta = this.getRequestMeta(request);
      const { users, sessions, pendingChallenges, auditLogs } = await this.loadSnapshot();
      const user = findStoredUserByEmail(email, users);

      if (user && user.status === 'active' && (user.phone || user.email)) {
        const latestChallenge = getPasswordResetChallenges(user.id, pendingChallenges)[0];
        if (
          latestChallenge
          && (Date.now() - Date.parse(latestChallenge.createdAt)) < PASSWORD_RESET_COOLDOWN_SECONDS * 1000
        ) {
          this.appendAuditLog(auditLogs, sessions, user.id, 'Demande de reinitialisation du mot de passe ignoree (cooldown)', 'failed', {
            ip: meta.ip,
            device: ensureAuthDevice(meta.userAgent),
          });
          await this.saveAuditLogs(auditLogs);
          return {
            message: 'Si un compte existe, un code de reinitialisation sera envoye.',
          };
        }

        const code = process.env.NODE_ENV === 'production' ? randomNumericSecurityCode() : '123456';
        const createdAt = new Date().toISOString();
        const remainingChallenges = withoutPasswordResetChallenges(user.id, pendingChallenges);

        remainingChallenges.unshift({
          id: createAuthId('pwd-reset'),
          userId: user.id,
          codeHash: hashAuthToken(code),
          purpose: 'password-reset',
          createdAt,
          expiresAt: addMinutes(createdAt, PASSWORD_RESET_CHALLENGE_TTL_MINUTES),
          attempts: 0,
        });

        await this.securityDeliveryService.deliverSecurityCode(user, code, 'password-reset');
        this.appendAuditLog(auditLogs, sessions, user.id, 'Demande de reinitialisation du mot de passe', 'success', {
          ip: meta.ip,
          device: ensureAuthDevice(meta.userAgent),
        });

        await Promise.all([
          this.savePendingChallenges(remainingChallenges),
          this.saveAuditLogs(auditLogs),
        ]);
      }

      return {
        message: 'Si un compte existe, un code de reinitialisation sera envoye.',
      };
    });
  }

  async resetPassword(
    payload: { email?: string; code?: string; newPassword?: string },
    request: AuthenticatedRequest,
  ) {
    return this.runSerializedMutation(async () => {
      const email = payload.email?.trim().toLowerCase();
      const code = payload.code?.trim() ?? '';
      const newPassword = payload.newPassword ?? '';

      if (!email || !isBasicEmail(email)) {
        throw new BadRequestException('Adresse email invalide.');
      }
      if (!isSixDigitCode(code)) {
        throw new BadRequestException('Code de verification invalide.');
      }

      const meta = this.getRequestMeta(request);
      const { users, sessions, refreshTokens, pendingChallenges, auditLogs } = await this.loadSnapshot();
      const user = findStoredUserByEmail(email, users);
      if (!user) {
        throw new UnauthorizedException('Code de verification invalide.');
      }

      const challenge = getPasswordResetChallenges(user.id, pendingChallenges)[0];

      if (!challenge || isExpired(challenge.expiresAt)) {
        throw new UnauthorizedException('Code de verification expire.');
      }

      challenge.attempts += 1;
      const codeMatches = challenge.codeHash === hashAuthToken(code);
      if (!codeMatches || challenge.attempts > PASSWORD_RESET_MAX_ATTEMPTS) {
        const shouldInvalidateChallenge = !codeMatches && challenge.attempts >= PASSWORD_RESET_MAX_ATTEMPTS;
        this.appendAuditLog(auditLogs, sessions, user.id, 'Echec de reinitialisation du mot de passe', 'failed', {
          ip: meta.ip,
          device: ensureAuthDevice(meta.userAgent),
        });
        if (shouldInvalidateChallenge) {
          await Promise.all([
            this.savePendingChallenges(withoutPasswordResetChallenges(user.id, pendingChallenges)),
            this.saveAuditLogs(auditLogs),
          ]);
        } else {
          await Promise.all([
            this.savePendingChallenges(pendingChallenges),
            this.saveAuditLogs(auditLogs),
          ]);
        }
        throw new UnauthorizedException('Code de verification invalide.');
      }

      await this.validatePasswordPolicy(newPassword, [user.passwordHash ?? '', ...(user.passwordHistory ?? [])].filter(Boolean));
      const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
      user.passwordHash = passwordHash;
      user.passwordHistory = [passwordHash, ...(user.passwordHistory ?? []).filter(Boolean)].slice(0, 5);
      user.lastPasswordChangeAt = new Date().toISOString();
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      delete user.password;

      const activeSessions = sessions.filter((session) => session.userId === user.id && !session.revokedAt);
      for (const session of activeSessions) {
        await this.revokeSessionChain(session.id, sessions, refreshTokens);
      }

      const remainingChallenges = withoutPasswordResetChallenges(user.id, pendingChallenges);

      this.appendAuditLog(auditLogs, sessions, user.id, 'Reinitialisation du mot de passe', 'success', {
        ip: meta.ip,
        device: ensureAuthDevice(meta.userAgent),
      });

      await Promise.all([
        this.saveUsers(users),
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.savePendingChallenges(remainingChallenges),
        this.saveAuditLogs(auditLogs),
      ]);

      return {
        success: true,
        message: 'Le mot de passe a ete reinitialise. Vous pouvez vous reconnecter.',
      };
    });
  }

  async listAllUsers() {
    const users = await this.loadRows<StoredUser>('auth_users');
    return users.map((user) => publicUser(normalizeStoredUser(user)));
  }

  async getUsers(request: AuthenticatedRequest) {
    await this.requirePermission(request, 'users.read');
    return this.listAllUsers();
  }

  async getUserDirectory(request: AuthenticatedRequest): Promise<DirectoryUser[]> {
    this.getActor(request);
    const users = await this.loadRows<StoredUser>('auth_users');
    return users
      .map((user) => directoryUser(normalizeStoredUser(user)))
      .filter((user) => user.status !== 'suspended');
  }

  async patchUser(
    request: AuthenticatedRequest,
    id: string,
    payload: Partial<Pick<
      AuthUser,
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'phone'
      | 'avatar'
      | 'bio'
      | 'location'
      | 'publicTitle'
      | 'website'
      | 'preferredLanguage'
      | 'languages'
      | 'skills'
      | 'socialLinks'
      | 'certifications'
      | 'portfolioItems'
      | 'introVideo'
      | 'publicProfileEnabled'
      | 'expertVerified'
      | 'paymentSettings'
      | 'role'
      | 'status'
      | 'is2FAEnabled'
    >>,
  ) {
    return this.runSerializedMutation(async () => {
      const actor = await this.requirePermission(request, 'users.manage');
      const { users, sessions, auditLogs } = await this.loadSnapshot();
      const user = findStoredUserById(id, users);
      if (!user) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      const patch = pickStoredUserPatch(payload as Record<string, unknown>, MANAGED_USER_PATCH_KEYS);
      if (patch.email) {
        patch.email = patch.email.trim().toLowerCase();
        const existing = findStoredUserByEmail(patch.email, users);
        if (existing && existing.id !== id) {
          throw new ConflictException('Un compte existe deja avec cette adresse email.');
        }
      }
      this.normalizePhonePatch(patch);

      const roleWillChange = patch.role !== undefined && patch.role !== user.role;
      const statusWillChange = patch.status !== undefined && patch.status !== user.status;
      const twoFactorWillChange = patch.is2FAEnabled !== undefined && patch.is2FAEnabled !== user.is2FAEnabled;
      const touchesPrivilegedAccount = user.role === 'superadmin' || user.role === 'admin' || patch.role === 'superadmin' || patch.role === 'admin';
      const sensitiveAccessChange = roleWillChange || ((statusWillChange || twoFactorWillChange) && touchesPrivilegedAccount);

      if (sensitiveAccessChange) {
        if (actor.id === user.id && (roleWillChange || statusWillChange)) {
          throw new BadRequestException('Un administrateur ne peut pas modifier son propre role ou statut.');
        }

        await this.assertPermissionForActor(actor, 'superadmin.sensitive.write', {
          targetType: 'auth_user',
          targetId: user.id,
          httpMethod: 'PATCH',
          route: `/auth/users/${user.id}`,
          reason: 'privileged_identity_change',
        });
      }

      const disablesSuperadmin = user.role === 'superadmin' && (
        (patch.role !== undefined && patch.role !== 'superadmin')
        || patch.status === 'suspended'
      );
      if (disablesSuperadmin) {
        const activeSuperadmins = users.filter((candidate) => candidate.role === 'superadmin' && candidate.status === 'active');
        if (activeSuperadmins.length <= 1) {
          throw new BadRequestException('Impossible de retirer le dernier superadmin actif.');
        }
      }

      Object.assign(user, patch);
      this.appendAuditLog(auditLogs, sessions, actor.id, `Mise a jour utilisateur (${Object.keys(payload).join(', ') || 'profil'})`, 'success');

      await Promise.all([
        this.saveUsers(users),
        this.saveAuditLogs(auditLogs),
      ]);

      return publicUser(user);
    });
  }

  async getProfile(request: AuthenticatedRequest, id: string) {
    this.requireSelfOrAdmin(request, id);
    const users = await this.loadRows<StoredUser>('auth_users');
    const user = findStoredUserById(id, users);
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }
    return editableProfileUser(normalizeStoredUser(user));
  }

  async exportPersonalData(request: AuthenticatedRequest, id: string) {
    this.requireSelfOrAdmin(request, id);
    const { users, sessions, auditLogs } = await this.loadSnapshot();
    const user = findStoredUserById(id, users);
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }

    return buildPersonalDataExport({
      user: normalizeStoredUser(user),
      sessions: listAccessSessionsForUser(id, sessions),
      auditLogs: listNormalizedAuditLogsForUser(id, auditLogs),
      currentSessionId: request.auth?.sessionId,
    });
  }

  async getPublicInstructorProfile(request: Pick<AuthenticatedRequest, 'auth'> | null, id: string) {
    const users = await this.loadRows<StoredUser>('auth_users');
    const user = findStoredUserById(id, users);
    const actor = request?.auth?.user;
    const canPreviewUnpublished = Boolean(actor && (actor.id === id || isAdminRole(actor)));
    if (!user || user.role !== 'formateur' || (!user.publicProfileEnabled && !canPreviewUnpublished)) {
      throw new BadRequestException('Profil formateur introuvable.');
    }
    return publicInstructorProfile(normalizeStoredUser(user));
  }

  async updateProfile(
    request: AuthenticatedRequest,
    id: string,
    payload: Partial<Pick<
      AuthUser,
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'phone'
      | 'avatar'
      | 'bio'
      | 'location'
      | 'publicTitle'
      | 'website'
      | 'preferredLanguage'
      | 'languages'
      | 'skills'
      | 'introVideo'
      | 'publicProfileEnabled'
      | 'expertVerified'
      | 'userPreferences'
    >> & {
      socialLinks?: SocialLinks;
      certifications?: CertificationItem[];
      portfolioItems?: PortfolioItem[];
      paymentSettings?: PaymentSettings;
    },
  ) {
    return this.runSerializedMutation(async () => {
      const actor = this.requireSelfOrAdmin(request, id);
      const { users, sessions, auditLogs } = await this.loadSnapshot();
      const user = findStoredUserById(id, users);
      if (!user) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      const patch = pickStoredUserPatch(payload as Record<string, unknown>, SELF_PROFILE_PATCH_KEYS);
      if (patch.email) {
        patch.email = patch.email.trim().toLowerCase();
        const existing = findStoredUserByEmail(patch.email, users);
        if (existing && existing.id !== id) {
          throw new ConflictException('Un compte existe deja avec cette adresse email.');
        }
      }
      this.normalizePhonePatch(patch);

      Object.assign(user, patch);
      this.appendAuditLog(auditLogs, sessions, actor.id, 'Modification du profil', 'success');

      await Promise.all([
        this.saveUsers(users),
        this.saveAuditLogs(auditLogs),
      ]);

      return editableProfileUser(user);
    });
  }

  async deleteProfile(request: AuthenticatedRequest, id: string, response: Response) {
    return this.runSerializedMutation(async () => {
      this.requireSelf(request, id);
      const { users, sessions, refreshTokens, pendingChallenges, auditLogs } = await this.loadSnapshot();
      const user = findStoredUserById(id, users);
      if (!user) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      if (user.role === 'superadmin') {
        const activeSuperadmins = users.filter((candidate) => (
          candidate.id !== user.id
          && candidate.role === 'superadmin'
          && candidate.status === 'active'
        ));
        if (activeSuperadmins.length === 0) {
          throw new BadRequestException('Impossible de supprimer le dernier superadmin actif.');
        }
      }

      const nextUsers = users.filter((candidate) => candidate.id !== user.id);
      const nextSessions = sessions.filter((session) => session.userId !== user.id);
      const nextRefreshTokens = refreshTokens.filter((token) => token.userId !== user.id);
      const nextPendingChallenges = pendingChallenges.filter((challenge) => challenge.userId !== user.id);
      const nextAuditLogs = auditLogs.filter((entry) => entry.userId !== user.id);

      await Promise.all([
        this.saveUsers(nextUsers),
        this.saveSessions(nextSessions),
        this.saveRefreshTokens(nextRefreshTokens),
        this.savePendingChallenges(nextPendingChallenges),
        this.saveAuditLogs(nextAuditLogs),
      ]);

      this.clearAuthCookies(response);
      return { success: true };
    });
  }

  async updatePassword(request: AuthenticatedRequest, payload: PasswordChangePayload) {
    return this.runSerializedMutation(async () => {
      const actor = this.requireSelf(request, payload.userId ?? '');
      if (!payload.userId || !payload.currentPassword || !payload.newPassword) {
        throw new BadRequestException('Informations de mot de passe invalides.');
      }

      const { users, sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      const user = findStoredUserById(payload.userId, users);
      if (!user) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      const currentPasswordValid = await this.verifyPassword(user, payload.currentPassword);
      if (!currentPasswordValid) {
        this.appendAuditLog(auditLogs, sessions, actor.id, 'Tentative de changement de mot de passe', 'failed');
        await this.saveAuditLogs(auditLogs);
        throw new UnauthorizedException('Mot de passe actuel incorrect.');
      }

      await this.validatePasswordPolicy(payload.newPassword, [user.passwordHash ?? '', ...(user.passwordHistory ?? [])].filter(Boolean));
      const passwordHash = await argon2.hash(payload.newPassword, { type: argon2.argon2id });
      user.passwordHash = passwordHash;
      user.passwordHistory = [passwordHash, ...(user.passwordHistory ?? []).filter(Boolean)].slice(0, 5);
      user.lastPasswordChangeAt = new Date().toISOString();
      delete user.password;
      const currentSessionId = request.auth?.sessionId ?? null;
      const secondarySessions = sessions.filter((session) => (
        session.userId === user.id
        && !session.revokedAt
        && session.id !== currentSessionId
      ));
      for (const session of secondarySessions) {
        await this.revokeSessionChain(session.id, sessions, refreshTokens);
      }
      this.appendAuditLog(auditLogs, sessions, actor.id, 'Changement de mot de passe', 'success');

      await Promise.all([
        this.saveUsers(users),
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      return { user: publicUser(user) };
    });
  }

  async getSecurity(request: AuthenticatedRequest, userId: string): Promise<SecurityPayload> {
    this.requireSelfOrAdmin(request, userId);
    const { users, sessions, auditLogs } = await this.loadSnapshot();
    const user = findStoredUserById(userId, users);
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }

    return {
      user: publicUser(user),
      sessions: buildPublicSessions(listAccessSessionsForUser(userId, sessions)),
      auditLogs: listNormalizedAuditLogsForUser(userId, auditLogs),
      backupCodes: [],
    };
  }

  async activateTwoFactor(request: AuthenticatedRequest, payload: { userId?: string }) {
    this.requireSelfOrAdmin(request, payload.userId ?? '');
    throw new BadRequestException('La verification forte est reservee a la reinitialisation du mot de passe.');
  }

  async deactivateTwoFactor(request: AuthenticatedRequest, payload: { userId?: string }) {
    this.requireSelfOrAdmin(request, payload.userId ?? '');
    throw new BadRequestException('La verification forte est reservee a la reinitialisation du mot de passe.');
  }

  async deleteSession(request: AuthenticatedRequest, sessionId: string, userId?: string) {
    return this.runSerializedMutation(async () => {
      const actor = this.requireSelfOrAdmin(request, userId ?? '');
      if (!userId) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      const { sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      const session = sessions.find((candidate) => candidate.userId === userId && candidate.id === sessionId && !candidate.current && !candidate.revokedAt);
      if (!session) {
        throw new BadRequestException('Session introuvable.');
      }

      await this.revokeSessionChain(sessionId, sessions, refreshTokens);
      this.appendAuditLog(auditLogs, sessions, actor.id, 'Revocation de session', 'success');

      await Promise.all([
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      return { success: true };
    });
  }

  async deleteOtherSessions(request: AuthenticatedRequest, userId?: string) {
    return this.runSerializedMutation(async () => {
      const actor = this.requireSelfOrAdmin(request, userId ?? '');
      if (!userId) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      const { sessions, refreshTokens, auditLogs } = await this.loadSnapshot();
      const removable = sessions.filter((session) => session.userId === userId && !session.current && !session.revokedAt);
      for (const session of removable) {
        await this.revokeSessionChain(session.id, sessions, refreshTokens);
      }

      if (removable.length > 0) {
        this.appendAuditLog(auditLogs, sessions, actor.id, 'Revocation des autres sessions', 'success');
      }

      await Promise.all([
        this.saveSessions(sessions),
        this.saveRefreshTokens(refreshTokens),
        this.saveAuditLogs(auditLogs),
      ]);

      return { success: true, removed: removable.length };
    });
  }
}
