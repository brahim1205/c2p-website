import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, static as serveStatic, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';
import { AuthService } from './auth/auth.service.js';
import type { AuthenticatedRequest } from './common/http/request-context.js';
import { MonitoringService } from './monitoring/monitoring.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const authService = app.get(AuthService);
  const monitoringService = app.get(MonitoringService);
  const expressApp = app.getHttpAdapter().getInstance();

  if (configService.trustProxy) {
    expressApp.set('trust proxy', 1);
  }

  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
  }));
  app.use(cookieParser());
  app.use(json({
    limit: '256kb',
    verify: (req, _res, buffer) => {
      (req as AuthenticatedRequest).rawBody = Buffer.from(buffer);
    },
  }));
  app.use(urlencoded({ extended: true, limit: '256kb' }));
  expressApp.use('/uploads', serveStatic(resolve(process.cwd(), configService.uploadStorageRoot), {
    fallthrough: false,
    index: false,
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));

  const rateLimits = {
    global: new Map<string, { count: number; resetAt: number }>(),
    login: new Map<string, { count: number; resetAt: number }>(),
    auth: new Map<string, { count: number; resetAt: number }>(),
    finance: new Map<string, { count: number; resetAt: number }>(),
    providerWebhook: new Map<string, { count: number; resetAt: number }>(),
  } as const;

  const resolveRateLimitBucket = (path: string, method: string) => {
    const normalizedPath = path.toLowerCase();
    const normalizedMethod = method.toUpperCase();

    if (normalizedPath === '/api/auth/login') {
      return {
        bucket: rateLimits.login,
        limit: configService.loginRateLimitMax,
        windowMs: 60_000,
        keySuffix: () => normalizedPath,
      };
    }

    if (/^\/api\/auth\/(verify-2fa|resend-2fa|forgot-password|reset-password|register|refresh)$/i.test(normalizedPath)) {
      return {
        bucket: rateLimits.auth,
        limit: configService.authRateLimitMax,
        windowMs: 60_000,
        keySuffix: () => normalizedPath,
      };
    }

    if (normalizedPath === '/api/payments/providers/dexpay/webhook') {
      return {
        bucket: rateLimits.providerWebhook,
        limit: configService.providerWebhookRateLimitMax,
        windowMs: 60_000,
        keySuffix: () => normalizedPath,
      };
    }

    if (normalizedPath.startsWith('/api/payments/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
      return {
        bucket: rateLimits.finance,
        limit: configService.financeRateLimitMax,
        windowMs: 60_000,
        keySuffix: () => normalizedPath,
      };
    }

    return {
      bucket: rateLimits.global,
      limit: configService.globalRateLimitMax,
      windowMs: 60_000,
      keySuffix: () => normalizedPath,
    };
  };

  app.use((req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const classification = resolveRateLimitBucket(req.path, req.method);
    const key = `${req.ip}:${classification.keySuffix()}`;
    const entry = classification.bucket.get(key);

    if (!entry || entry.resetAt <= now) {
      classification.bucket.set(key, { count: 1, resetAt: now + classification.windowMs });
      return next();
    }

    if (entry.count >= classification.limit) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ message: 'Trop de requetes. Reessayez plus tard.' });
      return;
    }

    entry.count += 1;
    next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const requestId = String(req.headers['x-request-id'] ?? randomUUID());
    (req as AuthenticatedRequest).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    const startedAt = Date.now();
    try {
      await authService.attachAuthToRequest(req as AuthenticatedRequest);
    } catch {
      (req as AuthenticatedRequest).auth = undefined;
    }

    res.on('finish', () => {
      const actor = (req as AuthenticatedRequest).auth?.user;
      const durationMs = Date.now() - startedAt;
      monitoringService.observeHttpRequest(req.method, req.path, res.statusCode, durationMs);
      console.log(JSON.stringify({
        level: 'info',
        ts: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        ip: req.ip,
        userId: actor?.id ?? null,
        role: actor?.role ?? null,
      }));
    });

    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next();
    }

    const request = req as AuthenticatedRequest;
    if (!request.auth) {
      return next();
    }

    const path = req.path;
    const exempt = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-2fa',
      '/api/auth/refresh',
      '/api/payments/providers/dexpay/webhook',
      '/api/monitoring/frontend-errors',
      '/api/monitoring/web-vitals',
    ];
    if (exempt.includes(path)) {
      return next();
    }

    const csrfHeader = String(req.headers['x-csrf-token'] ?? '');
    const csrfCookie = String(req.cookies?.[configService.csrfCookieName] ?? '');
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie || csrfHeader !== request.auth.csrfToken) {
      res.status(403).json({ message: 'Jeton CSRF invalide.' });
      return;
    }
    next();
  });

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (!configService.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        callback(null, true);
        return;
      }
      if (configService.appOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin non autorisee'));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  const port = configService.port || 3000;
  await app.listen(port);
  console.log(JSON.stringify({
    level: 'info',
    ts: new Date().toISOString(),
    message: 'Backend started',
    port,
    path: '/api',
  }));
}

bootstrap();
