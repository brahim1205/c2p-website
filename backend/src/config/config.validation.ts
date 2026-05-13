import { z } from 'zod';

const booleanString = z.enum(['true', 'false']);
const sameSiteSchema = z.enum(['strict', 'lax', 'none']);

function normalizeEnvironmentConfig(rawConfig: Record<string, unknown>) {
  const config = { ...rawConfig };

  if (!config.APP_ORIGINS && typeof config.CORS_ORIGIN === 'string') {
    config.APP_ORIGINS = config.CORS_ORIGIN;
  }

  if (!config.REDIS_DISABLED && typeof config.REDIS_HOST === 'string' && config.REDIS_HOST.trim().toLowerCase() === 'disabled') {
    config.REDIS_DISABLED = 'true';
  }

  const normalizedNodeEnv = String(config.NODE_ENV ?? 'development').trim().toLowerCase();
  const metricsEnabled = String(config.ENABLE_METRICS ?? 'true').trim().toLowerCase();
  if (metricsEnabled === 'true' && !config.METRICS_AUTH_TOKEN && normalizedNodeEnv !== 'production') {
    config.METRICS_AUTH_TOKEN = 'local-metrics-token';
  }

  return config;
}

export const configValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().optional(),
  APP_ORIGINS: z.string().default(''),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: booleanString.default('false'),
  TRUST_PROXY: booleanString.default('false'),
  COOKIE_SAMESITE: sameSiteSchema.default('lax'),
  PRISMA_PLATFORM_SYNC_ENABLED: booleanString.default('true'),
  PRISMA_PLATFORM_SYNC_ON_BOOT: booleanString.default('true'),
  ACCESS_TOKEN_TTL_MINUTES: z.string().default('15'),
  REFRESH_TOKEN_TTL_DAYS: z.string().default('14'),
  SESSION_ABSOLUTE_TIMEOUT_HOURS: z.string().default('12'),
  LOGIN_RATE_LIMIT_MAX: z.string().default('30'),
  AUTH_RATE_LIMIT_MAX: z.string().default('45'),
  GLOBAL_RATE_LIMIT_MAX: z.string().default('180'),
  FINANCE_RATE_LIMIT_MAX: z.string().default('90'),
  PROVIDER_WEBHOOK_RATE_LIMIT_MAX: z.string().default('120'),
  CSRF_COOKIE_NAME: z.string().default('c2p_csrf'),
  SESSION_COOKIE_NAME: z.string().default('c2p_at'),
  REFRESH_COOKIE_NAME: z.string().default('c2p_rt'),
  FRONTEND_MONITORING_ENABLED: booleanString.default('true'),
  ENABLE_METRICS: booleanString.default('true'),
  METRICS_AUTH_TOKEN: z.string().optional(),
  REDIS_HOST: z.string().default('redis'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_DISABLED: booleanString.default('false'),
  REDIS_URL: z.string().url().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  REDIS_TLS: booleanString.default('false'),
  SMS_PROVIDER: z.enum(['disabled', 'mock', 'sendtext']).default('mock'),
  SMS_SENDER_ID: z.string().optional(),
  SMS_TEST_RECIPIENT: z.string().optional(),
  SENDTEXT_BASE_URL: z.string().url().optional(),
  SENDTEXT_SEND_PATH: z.string().optional(),
  SENDTEXT_API_KEY: z.string().optional(),
  SENDTEXT_API_SECRET: z.string().optional(),
  SENDTEXT_TIMEOUT_MS: z.string().default('10000'),
  EMAIL_PROVIDER: z.enum(['disabled', 'mock', 'resend']).default('mock'),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  EMAIL_TIMEOUT_MS: z.string().default('10000'),
  RESEND_API_KEY: z.string().optional(),
  LIVE_PROVIDER: z.enum(['jitsi', 'custom']).default('jitsi'),
  LIVE_JITSI_BASE_URL: z.string().url().default('https://meet.jit.si'),
  UPLOAD_STORAGE_ROOT: z.string().default('storage/uploads'),
  UPLOAD_TMP_ROOT: z.string().default('storage/uploads/_tmp'),
  UPLOAD_IMAGE_MAX_MB: z.string().default('8'),
  UPLOAD_RAW_MAX_MB: z.string().default('512'),
  UPLOAD_VIDEO_MAX_MB: z.string().default('5120'),
  UPLOAD_REQUEST_MAX_MB: z.string().default('5120'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('c2p'),
  DEXPAY_ENABLED: z.enum(['true', 'false']).default('false'),
  DEXPAY_BASE_URL: z.string().url().optional(),
  DEXPAY_API_KEY: z.string().optional(),
  DEXPAY_API_SECRET: z.string().optional(),
  DEXPAY_TIMEOUT_MS: z.string().default('12000'),
  DEXPAY_WEBHOOK_SECRET: z.string().optional(),
  DEXPAY_WEBHOOK_SIGNATURE_HEADER: z.string().default('x-dexpay-signature'),
  DEXPAY_DEFAULT_ASSET: z.string().default('DUSD'),
  DEXPAY_DEFAULT_CHAIN: z.string().default('BSC'),
  DEXPAY_ONRAMP_TYPE: z.enum(['BUY', 'SELL']).default('BUY'),
  DEXPAY_OFFRAMP_TYPE: z.enum(['BUY', 'SELL']).default('SELL'),
}).superRefine((config, ctx) => {
  const origins = String(config.APP_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (config.NODE_ENV === 'production') {
    if (config.COOKIE_SECURE !== 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true in production.',
      });
    }

    if (config.TRUST_PROXY !== 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TRUST_PROXY'],
        message: 'TRUST_PROXY must be true in production.',
      });
    }

    if (!config.COOKIE_DOMAIN?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_DOMAIN'],
        message: 'COOKIE_DOMAIN is required in production.',
      });
    }

    if (origins.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_ORIGINS'],
        message: 'APP_ORIGINS or CORS_ORIGIN is required in production.',
      });
    }

    if (origins.some((origin) => /localhost|127\.0\.0\.1/i.test(origin))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_ORIGINS'],
        message: 'Production origins must not include localhost or 127.0.0.1.',
      });
    }
  }

  if (config.SMS_PROVIDER === 'sendtext') {
    for (const key of ['SMS_SENDER_ID', 'SENDTEXT_BASE_URL', 'SENDTEXT_SEND_PATH', 'SENDTEXT_API_KEY', 'SENDTEXT_API_SECRET'] as const) {
      if (!config[key]?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when SMS_PROVIDER=sendtext.`,
        });
      }
    }
  }

  if (config.EMAIL_PROVIDER === 'resend') {
    for (const key of ['EMAIL_FROM', 'RESEND_API_KEY'] as const) {
      if (!config[key]?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when EMAIL_PROVIDER=resend.`,
        });
      }
    }
  }

  if (config.DEXPAY_ENABLED === 'true') {
    for (const key of ['DEXPAY_BASE_URL', 'DEXPAY_API_KEY', 'DEXPAY_API_SECRET'] as const) {
      if (!config[key]?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when DEXPAY_ENABLED=true.`,
        });
      }
    }
  }

  if (config.REDIS_DISABLED !== 'true' && !config.REDIS_URL?.trim() && !config.REDIS_HOST?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_HOST'],
      message: 'REDIS_HOST or REDIS_URL is required when Redis is enabled.',
    });
  }

  if (config.ENABLE_METRICS === 'true' && !config.METRICS_AUTH_TOKEN?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['METRICS_AUTH_TOKEN'],
      message: 'METRICS_AUTH_TOKEN is required when ENABLE_METRICS=true.',
    });
  }
});

export function validateEnvironmentConfig(config: Record<string, unknown>) {
  return configValidationSchema.parse(normalizeEnvironmentConfig(config));
}

export type EnvironmentVariables = z.infer<typeof configValidationSchema>;
