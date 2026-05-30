import { configValidationSchema, validateEnvironmentConfig } from '../config/config.validation.js';
import { ConfigService } from '../config/config.service.js';
import { EmailService } from './email.service.js';
import { normalizeSmsRecipientPhone, normalizeUserPhoneForStorage } from './phone-normalization.js';
import { SmsService } from './sms.service.js';

type FetchCall = {
  url: string;
  init: RequestInit;
};

function buildConfig(overrides: Record<string, string>) {
  const parsed = validateEnvironmentConfig({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/c2p?schema=public',
    METRICS_AUTH_TOKEN: 'local-metrics-token',
    EMAIL_PROVIDER: 'brevo',
    EMAIL_FROM: 'no-reply@c2p.sn',
    SMS_PROVIDER: 'brevo',
    SMS_SENDER_ID: 'C2P',
    BREVO_API_KEY: 'test-brevo-key',
    BREVO_BASE_URL: 'https://api.brevo.com',
    UPLOAD_STORAGE_DRIVER: 'local-disk',
    ...overrides,
  });

  return new ConfigService({
    get: (key: keyof typeof parsed) => parsed[key],
  } as never);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function runPhoneNormalizationContract() {
  assert(normalizeSmsRecipientPhone('766178284') === '221766178284', 'Expected local Senegal phone normalization.');
  assert(normalizeSmsRecipientPhone('0766178284') === '221766178284', 'Expected leading-zero Senegal phone normalization.');
  assert(normalizeSmsRecipientPhone('+221 76 617 82 84') === '221766178284', 'Expected international Senegal phone normalization.');
  assert(normalizeUserPhoneForStorage('766178284') === '+221766178284', 'Expected canonical stored Senegal phone.');
  assert(normalizeSmsRecipientPhone('7661768284') === null, 'Expected invalid Senegal phone rejection.');
}

async function runBrevoProviderContract() {
  const calls: FetchCall[] = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ messageId: 'brevo-message-1' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const service = new EmailService(buildConfig({}));
    const status = service.getStatus();
    assert(status.provider === 'brevo', 'Expected Brevo provider status.');
    assert(status.configured === true, 'Expected Brevo provider to be configured.');

    const result = await service.send({
      to: 'USER@C2P.SN',
      subject: 'Verification Brevo',
      text: 'Message de validation production.',
      html: '<p>Message de validation production.</p>',
      purpose: 'provider-check',
      userId: 'user-check-1',
    });

    assert(result.provider === 'brevo', 'Expected Brevo send result.');
    assert(result.accepted === true, 'Expected accepted Brevo result.');
    assert(result.providerMessageId === 'brevo-message-1', 'Expected Brevo message id extraction.');
    assert(calls.length === 1, 'Expected one Brevo fetch call.');

    const call = calls[0]!;
    assert(call.url === 'https://api.brevo.com/v3/smtp/email', 'Expected Brevo SMTP endpoint.');
    assert(call.init.method === 'POST', 'Expected Brevo POST request.');
    assert((call.init.headers as Record<string, string>)['api-key'] === 'test-brevo-key', 'Expected Brevo api-key header.');

    const body = JSON.parse(String(call.init.body));
    assert(body.sender?.email === 'no-reply@c2p.sn', 'Expected Brevo sender email.');
    assert(body.to?.[0]?.email === 'user@c2p.sn', 'Expected normalized recipient email.');
    assert(body.htmlContent === '<p>Message de validation production.</p>', 'Expected Brevo htmlContent.');
    assert(body.headers?.['X-C2P-User-Id'] === 'user-check-1', 'Expected user correlation header.');
  } finally {
    globalThis.fetch = previousFetch;
  }
}

async function runBrevoSmsProviderContract() {
  const calls: FetchCall[] = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ messageId: 1511882900100020 }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const service = new SmsService(buildConfig({}));
    const status = service.getStatus();
    assert(status.provider === 'brevo', 'Expected Brevo SMS provider status.');
    assert(status.configured === true, 'Expected Brevo SMS provider to be configured.');
    assert(status.baseUrl === 'https://api.brevo.com', 'Expected Brevo SMS base URL.');
    assert(status.sendPath === '/v3/transactionalSMS/send', 'Expected Brevo SMS send path.');

    const result = await service.send({
      phone: '+221 77 123 45 67',
      message: 'Code C2P: 123456',
      purpose: 'provider-check',
      userId: 'user-check-1',
    });

    assert(result.provider === 'brevo', 'Expected Brevo SMS send result.');
    assert(result.accepted === true, 'Expected accepted Brevo SMS result.');
    assert(result.providerMessageId === '1511882900100020', 'Expected Brevo SMS message id extraction.');
    assert(calls.length === 1, 'Expected one Brevo SMS fetch call.');

    const call = calls[0]!;
    assert(call.url === 'https://api.brevo.com/v3/transactionalSMS/send', 'Expected Brevo SMS endpoint.');
    assert(call.init.method === 'POST', 'Expected Brevo SMS POST request.');
    assert((call.init.headers as Record<string, string>)['api-key'] === 'test-brevo-key', 'Expected Brevo SMS api-key header.');

    const body = JSON.parse(String(call.init.body));
    assert(body.sender === 'C2P', 'Expected Brevo SMS sender.');
    assert(body.recipient === '221771234567', 'Expected normalized SMS recipient.');
    assert(body.content === 'Code C2P: 123456', 'Expected Brevo SMS content.');
    assert(body.type === 'transactional', 'Expected transactional Brevo SMS type.');
    assert(body.tag === 'provider-check', 'Expected Brevo SMS tag.');
    assert(body.unicodeEnabled === true, 'Expected unicode Brevo SMS flag.');
  } finally {
    globalThis.fetch = previousFetch;
  }
}

function runProductionConfigContract() {
  const validProduction = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://postgres:postgres@db:5432/c2p?schema=public',
    APP_ORIGINS: 'https://c2p.sn,https://www.c2p.sn',
    COOKIE_SECURE: 'true',
    TRUST_PROXY: 'true',
    COOKIE_DOMAIN: '.c2p.sn',
    PRISMA_CONNECTION_REQUIRED: 'true',
    DATA_LEGACY_API_MODE: 'read-only',
    METRICS_AUTH_TOKEN: 'production-metrics-token',
    EMAIL_PROVIDER: 'brevo',
    EMAIL_FROM: 'no-reply@c2p.sn',
    SMS_PROVIDER: 'brevo',
    SMS_SENDER_ID: 'C2P',
    BREVO_API_KEY: 'production-brevo-key',
    BREVO_BASE_URL: 'https://api.brevo.com',
    UPLOAD_STORAGE_DRIVER: 's3',
    UPLOAD_PUBLIC_BASE_URL: 'https://assets.c2p.sn',
    UPLOAD_S3_ENDPOINT: 'https://example-account.r2.cloudflarestorage.com',
    UPLOAD_S3_REGION: 'auto',
    UPLOAD_S3_BUCKET: 'c2p-prod',
    UPLOAD_S3_ACCESS_KEY_ID: 'r2-access-key',
    UPLOAD_S3_SECRET_ACCESS_KEY: 'r2-secret-key',
  };

  validateEnvironmentConfig(validProduction);

  const invalidEmailProvider = {
    ...validProduction,
    EMAIL_PROVIDER: 'mock',
  };
  const invalidEmail = configValidationSchema.safeParse(invalidEmailProvider);
  assert(!invalidEmail.success, 'Production config must reject EMAIL_PROVIDER=mock.');

  const invalidSmsProvider = {
    ...validProduction,
    SMS_PROVIDER: 'mock',
  };
  const invalidSms = configValidationSchema.safeParse(invalidSmsProvider);
  assert(!invalidSms.success, 'Production config must reject SMS_PROVIDER=mock.');

  const invalidBrevoSms = {
    ...validProduction,
    SMS_PROVIDER: 'brevo',
    SMS_SENDER_ID: '',
  };
  const invalidBrevoSmsConfig = configValidationSchema.safeParse(invalidBrevoSms);
  assert(!invalidBrevoSmsConfig.success, 'Brevo SMS config must require SMS_SENDER_ID.');

  const invalidStorage = {
    ...validProduction,
    UPLOAD_S3_ENDPOINT: ['http', '://minio:9000'].join(''),
    UPLOAD_S3_REGION: 'us-east-1',
  };
  const invalidR2 = configValidationSchema.safeParse(invalidStorage);
  assert(!invalidR2.success, 'Production config must reject non-R2 upload endpoint.');

  const invalidLegacyMode = {
    ...validProduction,
    DATA_LEGACY_API_MODE: 'compat',
  };
  const invalidLegacy = configValidationSchema.safeParse(invalidLegacyMode);
  assert(!invalidLegacy.success, 'Production config must reject DATA_LEGACY_API_MODE=compat.');
}

async function main() {
  runPhoneNormalizationContract();
  await runBrevoProviderContract();
  await runBrevoSmsProviderContract();
  runProductionConfigContract();
  console.log(JSON.stringify({
    ok: true,
    provider: 'brevo',
    smsProvider: 'brevo',
    productionEmailProvider: 'brevo',
    productionSmsProvider: 'brevo',
    productionStorage: 'cloudflare-r2',
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
