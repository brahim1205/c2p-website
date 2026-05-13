import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './config.validation.js';

@Injectable()
export class ConfigService {
  constructor(private readonly configService: NestConfigService<EnvironmentVariables>) {}

  get nodeEnv(): string {
    return String(this.configService.get('NODE_ENV') ?? 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get<T extends keyof EnvironmentVariables>(key: T) {
    return this.configService.get(key);
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL')!;
  }

  get redisUrl(): string | undefined {
    const value = this.configService.get('REDIS_URL');
    return value ? String(value) : undefined;
  }

  get redisHost(): string {
    return this.configService.get('REDIS_HOST')!;
  }

  get redisPort(): number {
    return Number(this.configService.get('REDIS_PORT'));
  }

  get redisUsername(): string | undefined {
    const value = this.configService.get('REDIS_USERNAME');
    return value ? String(value) : undefined;
  }

  get redisPassword(): string | undefined {
    const value = this.configService.get('REDIS_PASSWORD');
    return value ? String(value) : undefined;
  }

  get redisDb(): number {
    return Number(this.configService.get('REDIS_DB') ?? '0');
  }

  get redisTls(): boolean {
    return this.configService.get('REDIS_TLS') === 'true';
  }

  get redisDisabled(): boolean {
    return this.configService.get('REDIS_DISABLED') === 'true';
  }

  get port(): number {
    return Number(this.configService.get('PORT'));
  }

  get appOrigins(): string[] {
    const configuredOrigins = String(this.configService.get('APP_ORIGINS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (configuredOrigins.length > 0) {
      return configuredOrigins;
    }

    if (this.isProduction) {
      return [];
    }

    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3003',
      'http://localhost:3004',
      'http://127.0.0.1:3004',
      'http://localhost:3005',
      'http://127.0.0.1:3005',
      'http://localhost:3006',
      'http://127.0.0.1:3006',
    ];
  }

  get cookieDomain(): string | undefined {
    const value = this.configService.get('COOKIE_DOMAIN');
    return value ? String(value) : undefined;
  }

  get cookieSecure(): boolean {
    return this.configService.get('COOKIE_SECURE') === 'true';
  }

  get cookieSameSite(): 'strict' | 'lax' | 'none' {
    return (this.configService.get('COOKIE_SAMESITE') ?? 'lax') as 'strict' | 'lax' | 'none';
  }

  get prismaPlatformSyncEnabled(): boolean {
    return this.configService.get('PRISMA_PLATFORM_SYNC_ENABLED') !== 'false';
  }

  get prismaPlatformSyncOnBoot(): boolean {
    return this.configService.get('PRISMA_PLATFORM_SYNC_ON_BOOT') !== 'false';
  }

  get trustProxy(): boolean {
    return this.configService.get('TRUST_PROXY') === 'true';
  }

  get accessTokenTtlMinutes(): number {
    return Number(this.configService.get('ACCESS_TOKEN_TTL_MINUTES') ?? '15');
  }

  get refreshTokenTtlDays(): number {
    return Number(this.configService.get('REFRESH_TOKEN_TTL_DAYS') ?? '14');
  }

  get sessionAbsoluteTimeoutHours(): number {
    return Number(this.configService.get('SESSION_ABSOLUTE_TIMEOUT_HOURS') ?? '12');
  }

  get loginRateLimitMax(): number {
    return Number(this.configService.get('LOGIN_RATE_LIMIT_MAX') ?? '30');
  }

  get authRateLimitMax(): number {
    return Number(this.configService.get('AUTH_RATE_LIMIT_MAX') ?? '45');
  }

  get globalRateLimitMax(): number {
    return Number(this.configService.get('GLOBAL_RATE_LIMIT_MAX') ?? '180');
  }

  get financeRateLimitMax(): number {
    return Number(this.configService.get('FINANCE_RATE_LIMIT_MAX') ?? '90');
  }

  get providerWebhookRateLimitMax(): number {
    return Number(this.configService.get('PROVIDER_WEBHOOK_RATE_LIMIT_MAX') ?? '120');
  }

  get csrfCookieName(): string {
    return String(this.configService.get('CSRF_COOKIE_NAME') ?? 'c2p_csrf');
  }

  get sessionCookieName(): string {
    return String(this.configService.get('SESSION_COOKIE_NAME') ?? 'c2p_at');
  }

  get refreshCookieName(): string {
    return String(this.configService.get('REFRESH_COOKIE_NAME') ?? 'c2p_rt');
  }

  get frontendMonitoringEnabled(): boolean {
    return this.configService.get('FRONTEND_MONITORING_ENABLED') === 'true';
  }

  get metricsEnabled(): boolean {
    return this.configService.get('ENABLE_METRICS') !== 'false';
  }

  get metricsAuthToken(): string {
    return String(this.configService.get('METRICS_AUTH_TOKEN') ?? '');
  }

  get smsProvider(): 'disabled' | 'mock' | 'sendtext' {
    return (this.configService.get('SMS_PROVIDER') ?? 'mock') as 'disabled' | 'mock' | 'sendtext';
  }

  get smsSenderId(): string | undefined {
    const value = this.configService.get('SMS_SENDER_ID');
    return value ? String(value) : undefined;
  }

  get smsTestRecipient(): string | undefined {
    const value = this.configService.get('SMS_TEST_RECIPIENT');
    return value ? String(value) : undefined;
  }

  get sendTextBaseUrl(): string | undefined {
    const value = this.configService.get('SENDTEXT_BASE_URL');
    return value ? String(value).replace(/\/$/, '') : undefined;
  }

  get sendTextSendPath(): string | undefined {
    const value = this.configService.get('SENDTEXT_SEND_PATH');
    if (!value) return undefined;
    const normalized = String(value).trim();
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  get sendTextApiKey(): string | undefined {
    const value = this.configService.get('SENDTEXT_API_KEY');
    return value ? String(value) : undefined;
  }

  get sendTextApiSecret(): string | undefined {
    const value = this.configService.get('SENDTEXT_API_SECRET');
    return value ? String(value) : undefined;
  }

  get sendTextTimeoutMs(): number {
    return Number(this.configService.get('SENDTEXT_TIMEOUT_MS') ?? '10000');
  }

  get emailProvider(): 'disabled' | 'mock' | 'resend' {
    return (this.configService.get('EMAIL_PROVIDER') ?? 'mock') as 'disabled' | 'mock' | 'resend';
  }

  get emailFrom(): string | undefined {
    const value = this.configService.get('EMAIL_FROM');
    return value ? String(value) : undefined;
  }

  get emailReplyTo(): string | undefined {
    const value = this.configService.get('EMAIL_REPLY_TO');
    return value ? String(value) : undefined;
  }

  get emailTimeoutMs(): number {
    return Number(this.configService.get('EMAIL_TIMEOUT_MS') ?? '10000');
  }

  get resendApiKey(): string | undefined {
    const value = this.configService.get('RESEND_API_KEY');
    return value ? String(value) : undefined;
  }

  get defaultLiveProvider(): 'jitsi' | 'custom' {
    return (this.configService.get('LIVE_PROVIDER') ?? 'jitsi') as 'jitsi' | 'custom';
  }

  get liveJitsiBaseUrl(): string {
    return String(this.configService.get('LIVE_JITSI_BASE_URL') ?? 'https://meet.jit.si').replace(/\/$/, '');
  }

  get uploadStorageRoot(): string {
    return String(this.configService.get('UPLOAD_STORAGE_ROOT') ?? 'storage/uploads');
  }

  get uploadTmpRoot(): string {
    return String(this.configService.get('UPLOAD_TMP_ROOT') ?? 'storage/uploads/_tmp');
  }

  get uploadImageMaxBytes(): number {
    return Number(this.configService.get('UPLOAD_IMAGE_MAX_MB') ?? '8') * 1024 * 1024;
  }

  get uploadRawMaxBytes(): number {
    return Number(this.configService.get('UPLOAD_RAW_MAX_MB') ?? '512') * 1024 * 1024;
  }

  get uploadVideoMaxBytes(): number {
    return Number(this.configService.get('UPLOAD_VIDEO_MAX_MB') ?? '5120') * 1024 * 1024;
  }

  get uploadRequestMaxBytes(): number {
    return Number(this.configService.get('UPLOAD_REQUEST_MAX_MB') ?? '5120') * 1024 * 1024;
  }

  get cloudinaryCloudName(): string | undefined {
    const value = this.configService.get('CLOUDINARY_CLOUD_NAME');
    return value ? String(value) : undefined;
  }

  get cloudinaryApiKey(): string | undefined {
    const value = this.configService.get('CLOUDINARY_API_KEY');
    return value ? String(value) : undefined;
  }

  get cloudinaryApiSecret(): string | undefined {
    const value = this.configService.get('CLOUDINARY_API_SECRET');
    return value ? String(value) : undefined;
  }

  get cloudinaryUploadFolder(): string {
    return String(this.configService.get('CLOUDINARY_UPLOAD_FOLDER') ?? 'c2p');
  }

  get dexPayEnabled(): boolean {
    return this.configService.get('DEXPAY_ENABLED') === 'true';
  }

  get dexPayBaseUrl(): string | undefined {
    const value = this.configService.get('DEXPAY_BASE_URL');
    return value ? String(value).replace(/\/$/, '') : undefined;
  }

  get dexPayApiKey(): string | undefined {
    const value = this.configService.get('DEXPAY_API_KEY');
    return value ? String(value) : undefined;
  }

  get dexPayApiSecret(): string | undefined {
    const value = this.configService.get('DEXPAY_API_SECRET');
    return value ? String(value) : undefined;
  }

  get dexPayTimeoutMs(): number {
    return Number(this.configService.get('DEXPAY_TIMEOUT_MS') ?? '12000');
  }

  get dexPayWebhookSecret(): string | undefined {
    const value = this.configService.get('DEXPAY_WEBHOOK_SECRET');
    return value ? String(value) : undefined;
  }

  get dexPayWebhookSignatureHeader(): string {
    return String(this.configService.get('DEXPAY_WEBHOOK_SIGNATURE_HEADER') ?? 'x-dexpay-signature').toLowerCase();
  }

  get dexPayDefaultAsset(): string {
    return String(this.configService.get('DEXPAY_DEFAULT_ASSET') ?? 'DUSD');
  }

  get dexPayDefaultChain(): string {
    return String(this.configService.get('DEXPAY_DEFAULT_CHAIN') ?? 'BSC');
  }

  get dexPayOnRampType(): 'BUY' | 'SELL' {
    return (this.configService.get('DEXPAY_ONRAMP_TYPE') ?? 'BUY') as 'BUY' | 'SELL';
  }

  get dexPayOffRampType(): 'BUY' | 'SELL' {
    return (this.configService.get('DEXPAY_OFFRAMP_TYPE') ?? 'SELL') as 'BUY' | 'SELL';
  }
}
