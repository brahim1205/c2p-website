import type { NextFunction, Request, Response } from 'express';
import type { ConfigService } from '../../config/config.service.js';
import type { MonitoringService } from '../../monitoring/monitoring.service.js';

type RateLimitScope = 'global' | 'login' | 'auth' | 'finance' | 'upload' | 'provider_webhook';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitClassification {
  bucket: Map<string, RateLimitEntry>;
  limit: number;
  scope: RateLimitScope;
  windowMs: number;
  keySuffix: string;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function pruneExpired(bucket: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of bucket.entries()) {
    if (entry.resetAt <= now) {
      bucket.delete(key);
    }
  }
}

export function createRateLimitMiddleware(config: ConfigService, monitoring: MonitoringService) {
  const buckets: Record<RateLimitScope, Map<string, RateLimitEntry>> = {
    global: new Map(),
    login: new Map(),
    auth: new Map(),
    finance: new Map(),
    upload: new Map(),
    provider_webhook: new Map(),
  };
  let requestCounter = 0;

  const classify = (path: string, method: string): RateLimitClassification => {
    const normalizedPath = path.toLowerCase();
    const normalizedMethod = method.toUpperCase();

    if (normalizedPath === '/api/auth/login') {
      return {
        bucket: buckets.login,
        limit: config.loginRateLimitMax,
        scope: 'login',
        windowMs: 60_000,
        keySuffix: normalizedPath,
      };
    }

    if (/^\/api\/auth\/(verify-2fa|resend-2fa|forgot-password|reset-password|register|refresh)$/i.test(normalizedPath)) {
      return {
        bucket: buckets.auth,
        limit: config.authRateLimitMax,
        scope: 'auth',
        windowMs: 60_000,
        keySuffix: normalizedPath,
      };
    }

    if (normalizedPath === '/api/payments/providers/dexpay/webhook') {
      return {
        bucket: buckets.provider_webhook,
        limit: config.providerWebhookRateLimitMax,
        scope: 'provider_webhook',
        windowMs: 60_000,
        keySuffix: normalizedPath,
      };
    }

    if (normalizedPath === '/api/uploads/local' && MUTATING_METHODS.has(normalizedMethod)) {
      return {
        bucket: buckets.upload,
        limit: config.uploadRateLimitMax,
        scope: 'upload',
        windowMs: 60_000,
        keySuffix: normalizedPath,
      };
    }

    if (normalizedPath.startsWith('/api/payments/') && MUTATING_METHODS.has(normalizedMethod)) {
      return {
        bucket: buckets.finance,
        limit: config.financeRateLimitMax,
        scope: 'finance',
        windowMs: 60_000,
        keySuffix: normalizedPath,
      };
    }

    return {
      bucket: buckets.global,
      limit: config.globalRateLimitMax,
      scope: 'global',
      windowMs: 60_000,
      keySuffix: normalizedPath,
    };
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    requestCounter += 1;
    if (requestCounter % 1000 === 0) {
      for (const bucket of Object.values(buckets)) {
        pruneExpired(bucket, now);
      }
    }

    const classification = classify(req.path, req.method);
    const key = `${req.ip}:${classification.keySuffix}`;
    const entry = classification.bucket.get(key);

    if (!entry || entry.resetAt <= now) {
      classification.bucket.set(key, { count: 1, resetAt: now + classification.windowMs });
      return next();
    }

    if (entry.count >= classification.limit) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      monitoring.recordRateLimitBlocked(classification.scope, req.path);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ message: 'Trop de requetes. Reessayez plus tard.' });
      return undefined;
    }

    entry.count += 1;
    return next();
  };
}
