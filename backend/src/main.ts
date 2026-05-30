import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, static as serveStatic, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';
import { AuthService } from './auth/auth.service.js';
import type { AuthenticatedRequest } from './common/http/request-context.js';
import { createRateLimitMiddleware } from './common/http/rate-limit.js';
import { MonitoringService } from './monitoring/monitoring.service.js';
import { PrismaService } from './database/prisma.service.js';

const SENSITIVE_QUERY_KEYS = new Set([
  'api_key',
  'apikey',
  'code',
  'password',
  'secret',
  'signature',
  'token',
]);

function isSensitiveQueryKey(key: string) {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_QUERY_KEYS.has(key.toLowerCase())
    || normalized.includes('apikey')
    || normalized.includes('password')
    || normalized.includes('secret')
    || normalized.includes('signature')
    || normalized.includes('token');
}

function redactRequestUrl(value: string) {
  try {
    const url = new URL(value, 'http://localhost');
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveQueryKey(key)) {
        url.searchParams.set(key, '[redacted]');
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return value.split('?')[0] ?? value;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const authService = app.get(AuthService);
  const monitoringService = app.get(MonitoringService);
  const prismaService = app.get(PrismaService);
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
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
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
  if (configService.uploadStorageDriver === 'local-disk') {
    expressApp.use('/uploads', serveStatic(resolve(process.cwd(), configService.uploadStorageRoot), {
      fallthrough: false,
      index: false,
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }));
  }

  app.use(createRateLimitMiddleware(configService, monitoringService));

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
        path: redactRequestUrl(req.originalUrl),
        status: res.statusCode,
        durationMs,
        ip: req.ip,
        userId: actor?.id ?? null,
        role: actor?.role ?? null,
      }));
    });

    next();
  });

  let maintenanceCache: { enabled: boolean; expiresAt: number } | null = null;
  const isMaintenanceModeEnabled = async () => {
    if (maintenanceCache && maintenanceCache.expiresAt > Date.now()) {
      return maintenanceCache.enabled;
    }

    if (!prismaService.isConnected) {
      maintenanceCache = { enabled: false, expiresAt: Date.now() + 5_000 };
      return false;
    }

    try {
      const row = await prismaService.appRow.findUnique({
        where: { key: 'admin_feature_flags::maintenance_mode' },
        select: { data: true },
      });
      const data = row?.data;
      const enabled = Boolean(data && typeof data === 'object' && 'enabled' in data && (data as { enabled?: unknown }).enabled);
      maintenanceCache = { enabled, expiresAt: Date.now() + 5_000 };
      return enabled;
    } catch {
      maintenanceCache = { enabled: false, expiresAt: Date.now() + 5_000 };
      return false;
    }
  };

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method.toUpperCase() === 'OPTIONS') {
      return next();
    }

    const path = req.path;
    const actor = (req as AuthenticatedRequest).auth?.user;
    const isSwaggerRoute = path === '/api/docs'
      || path === '/api/docs-json'
      || path === '/api/docs-yaml'
      || path.startsWith('/api/docs/');
    const exempt = [
      '/api/healthz',
      '/api/public/platform-status',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/auth/refresh',
      '/api/auth/verify-2fa',
      '/api/auth/resend-2fa',
      '/api/monitoring/frontend-errors',
      '/api/monitoring/web-vitals',
    ];

    if (isSwaggerRoute || exempt.includes(path) || actor?.role === 'superadmin') {
      return next();
    }

    if (await isMaintenanceModeEnabled()) {
      res.status(503).json({
        message: 'La plateforme est temporairement en maintenance.',
        code: 'MAINTENANCE_MODE',
      });
      return;
    }

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

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('C2P API')
      .setDescription('Documentation OpenAPI des endpoints publics, metier, financiers, monitoring et administration C2P.')
      .setVersion('2.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Jeton Bearer pour les clients API.',
        },
        'bearer',
      )
      .addCookieAuth(configService.sessionCookieName, {
        type: 'apiKey',
        in: 'cookie',
        name: configService.sessionCookieName,
        description: 'Cookie de session utilise par le frontend C2P.',
      }, 'session')
      .addApiKey({
        type: 'apiKey',
        in: 'header',
        name: 'x-csrf-token',
        description: 'Jeton CSRF requis pour les mutations authentifiees.',
      }, 'csrf')
      .build(),
    { deepScanRoutes: true },
  );
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    customSiteTitle: 'C2P API Docs',
    jsonDocumentUrl: '/api/docs-json',
    yamlDocumentUrl: '/api/docs-yaml',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

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
