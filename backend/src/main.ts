import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
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
  app.use(json({ limit: '256kb' }));
  app.use(urlencoded({ extended: true, limit: '256kb' }));

  const globalRateLimit = new Map<string, { count: number; resetAt: number }>();
  const loginRateLimit = new Map<string, { count: number; resetAt: number }>();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const isLogin = req.path === '/api/auth/login';
    const bucket = isLogin ? loginRateLimit : globalRateLimit;
    const windowMs = isLogin ? 60_000 : 60_000;
    const limit = isLogin ? configService.loginRateLimitMax : configService.globalRateLimitMax;
    const entry = bucket.get(key);

    if (!entry || entry.resetAt <= now) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
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
      '/api/auth/verify-2fa',
      '/api/auth/refresh',
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
