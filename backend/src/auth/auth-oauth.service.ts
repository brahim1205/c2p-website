import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '../config/config.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import type { Role, StoredUser } from './auth.store.js';
import { isBasicEmail } from './auth.service-helpers.js';

export type OAuthProvider = 'google' | 'facebook';

type OAuthStatePayload = {
  role: Role;
  returnTo: string;
  createdAt: number;
};

export type OAuthProviderProfile = {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
};

type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
};

@Injectable()
export class AuthOAuthService {
  constructor(private readonly config: ConfigService) {}

  normalizeProvider(provider: string): OAuthProvider {
    if (provider === 'google' || provider === 'facebook') return provider;
    throw new BadRequestException('Provider OAuth non supporte.');
  }

  start(
    rawProvider: string,
    payload: { role?: Role; returnTo?: string },
    request: AuthenticatedRequest,
    response: Response,
  ) {
    const provider = this.normalizeProvider(rawProvider);
    const providerConfig = this.getProviderConfig(provider);
    const callbackUrl = this.getCallbackUrl(provider, request);
    const state = this.encodeState({
      role: this.normalizeRole(payload.role),
      returnTo: this.normalizeReturnTo(payload.returnTo),
      createdAt: Date.now(),
    });

    const authorizationUrl = new URL(providerConfig.authorizationUrl);
    authorizationUrl.searchParams.set('client_id', providerConfig.clientId);
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', providerConfig.scope);
    authorizationUrl.searchParams.set('state', state);
    if (provider === 'google') {
      authorizationUrl.searchParams.set('prompt', 'select_account');
    }

    return response.redirect(authorizationUrl.toString());
  }

  async complete(
    rawProvider: string,
    payload: { code?: string; state?: string },
    request: AuthenticatedRequest,
  ) {
    const provider = this.normalizeProvider(rawProvider);
    if (!payload.code) throw new BadRequestException('Code OAuth manquant.');
    const state = this.decodeState(payload.state);
    const callbackUrl = this.getCallbackUrl(provider, request);
    const token = await this.exchangeCode(provider, payload.code, callbackUrl);
    if (!token.access_token) throw new UnauthorizedException('Token OAuth manquant.');
    const profile = await this.fetchProfile(provider, token.access_token);
    return { provider, profile, state };
  }

  getFrontendUrl(path: string, request: AuthenticatedRequest) {
    const safePath = this.normalizeReturnTo(path);
    const baseUrl = this.config.appOrigins[0] ?? this.getRequestOrigin(request);
    return `${baseUrl.replace(/\/$/, '')}${safePath}`;
  }

  userNeedsProfileOnboarding(user: StoredUser) {
    if (user.role === 'prestataire') return !user.publicTitle?.trim() || !user.location?.trim() || !(user.skills ?? []).length;
    if (user.role === 'formateur') return !user.publicTitle?.trim() || !(user.skills ?? []).length;
    if (user.role === 'partenaire') {
      const skills = (user.skills ?? []).join(' ').toLowerCase();
      return !user.publicTitle?.trim() || !(user.skills ?? []).length || (!skills.includes('partenaire technique') && !skills.includes('partenaire financier'));
    }
    return false;
  }

  private getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
    const config = provider === 'google'
      ? {
          clientId: this.config.googleOAuthClientId,
          clientSecret: this.config.googleOAuthClientSecret,
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
          scope: 'openid email profile',
        }
      : {
          clientId: this.config.facebookOAuthClientId,
          clientSecret: this.config.facebookOAuthClientSecret,
          authorizationUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
          tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
          userInfoUrl: 'https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture.type(large)',
          scope: 'email,public_profile',
        };

    if (!config.clientId || !config.clientSecret || !this.config.oauthStateSecret) {
      throw new ServiceUnavailableException('Connexion sociale non configuree.');
    }

    return {
      ...config,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    };
  }

  private getRequestOrigin(request: AuthenticatedRequest) {
    const forwardedProto = String(request.headers['x-forwarded-proto'] ?? '').split(',')[0]?.trim();
    const forwardedHost = String(request.headers['x-forwarded-host'] ?? '').split(',')[0]?.trim();
    const proto = forwardedProto || request.protocol || 'http';
    const host = forwardedHost || request.headers.host || 'localhost:3000';
    return `${proto}://${host}`;
  }

  private getCallbackUrl(provider: OAuthProvider, request: AuthenticatedRequest) {
    const baseUrl = this.config.oauthCallbackBaseUrl ?? `${this.getRequestOrigin(request)}/api`;
    return `${baseUrl}/auth/oauth/${provider}/callback`;
  }

  private normalizeReturnTo(returnTo?: string) {
    const fallback = '/dashboard';
    if (!returnTo) return fallback;
    const trimmed = returnTo.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) return fallback;
    return trimmed;
  }

  private normalizeRole(role?: Role): Role {
    const allowedRoles: Role[] = ['client', 'prestataire', 'formateur', 'apprenant', 'parent', 'porteur', 'partenaire'];
    return role && allowedRoles.includes(role) ? role : 'client';
  }

  private encodeState(payload: OAuthStatePayload) {
    const secret = this.config.oauthStateSecret;
    if (!secret) throw new ServiceUnavailableException('Connexion sociale non configuree.');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  private decodeState(value?: string): OAuthStatePayload {
    const secret = this.config.oauthStateSecret;
    if (!secret || !value) throw new BadRequestException('Etat OAuth invalide.');
    const [body, signature] = value.split('.');
    if (!body || !signature) throw new BadRequestException('Etat OAuth invalide.');
    const expected = createHmac('sha256', secret).update(body).digest('base64url');
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new BadRequestException('Etat OAuth invalide.');
    }
    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
    } catch {
      throw new BadRequestException('Etat OAuth invalide.');
    }
    if (!payload.createdAt || Date.now() - payload.createdAt > 10 * 60_000) {
      throw new BadRequestException('Session OAuth expiree.');
    }
    return {
      role: this.normalizeRole(payload.role),
      returnTo: this.normalizeReturnTo(payload.returnTo),
      createdAt: payload.createdAt,
    };
  }

  private async exchangeCode(provider: OAuthProvider, code: string, callbackUrl: string) {
    const providerConfig = this.getProviderConfig(provider);
    const body = new URLSearchParams({
      code,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    });
    const response = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    if (!response.ok) {
      throw new UnauthorizedException('Connexion sociale refusee.');
    }
    return response.json() as Promise<{ access_token?: string }>;
  }

  private async fetchProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProviderProfile> {
    const providerConfig = this.getProviderConfig(provider);
    const userInfoUrl = provider === 'facebook'
      ? `${providerConfig.userInfoUrl}&access_token=${encodeURIComponent(accessToken)}`
      : providerConfig.userInfoUrl;
    const response = await fetch(userInfoUrl, {
      headers: provider === 'google' ? { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } : { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Profil social inaccessible.');
    }
    const profile = await response.json() as {
      email?: string;
      given_name?: string;
      family_name?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      picture?: string | { data?: { url?: string } };
    };
    const email = profile.email?.trim().toLowerCase();
    if (!email || !isBasicEmail(email)) {
      throw new BadRequestException('Le provider social ne fournit pas d email verifie.');
    }
    const fallbackName = String(profile.name ?? email.split('@')[0] ?? 'Utilisateur').trim();
    const firstName = String(profile.given_name ?? profile.first_name ?? fallbackName.split(' ')[0] ?? 'Utilisateur').trim();
    const lastName = String(profile.family_name ?? profile.last_name ?? fallbackName.split(' ').slice(1).join(' ') ?? 'C2P').trim() || 'C2P';
    const avatar = typeof profile.picture === 'string' ? profile.picture : profile.picture?.data?.url;
    return { email, firstName, lastName, avatar };
  }
}
