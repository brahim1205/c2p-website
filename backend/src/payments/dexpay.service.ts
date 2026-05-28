import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '../config/config.service.js';
import type { DexPayCheckoutDto } from './dto/dexpay.dto.js';

interface DexPayEnvelope<T> {
  data?: T;
  message?: string;
  error?: unknown;
  statusCode?: number;
}

export interface DexPayBusinessInfo {
  name?: string;
  emailaddress?: string;
  walletAddresses?: Array<{ _id?: string; address?: string; chain?: string }>;
}

export interface DexPayBank {
  name?: string;
  code?: string;
  currency?: string;
}

export interface DexPayOrder {
  id: string;
  status?: string;
  fiatAmount?: number;
  tokenAmount?: number;
  price?: number;
  fee?: number;
  createdAt?: string;
  type?: string;
  address?: string;
  paymentAccount?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  };
}

export interface DexPayCheckoutResult {
  quote: DexPayOrder;
  order: DexPayOrder;
}

export interface DexPayStatusSnapshot {
  provider: 'dexpay';
  mode: 'live' | 'disabled';
  enabled: boolean;
  configured: boolean;
  apiConfigured: boolean;
  reachable?: boolean;
  webhookSecretConfigured: boolean;
  webhookVerification: 'strict' | 'skipped_no_secret';
  baseUrlHost?: string | null;
  business?: DexPayBusinessInfo;
  lastCheckedAt: string;
  errorCode?: string | null;
}

@Injectable()
export class DexPayService {
  constructor(private readonly config: ConfigService) {}

  readonly provider = 'dexpay' as const;

  isConfigured() {
    return Boolean(
      this.config.dexPayEnabled
      && this.config.dexPayBaseUrl
      && this.config.dexPayApiKey
      && this.config.dexPayApiSecret,
    );
  }

  async getStatus() {
    const lastCheckedAt = new Date().toISOString();
    const apiConfigured = Boolean(
      this.config.dexPayBaseUrl
      && this.config.dexPayApiKey
      && this.config.dexPayApiSecret,
    );
    const snapshot: DexPayStatusSnapshot = {
      provider: 'dexpay',
      mode: this.isConfigured() ? 'live' : 'disabled',
      enabled: this.config.dexPayEnabled,
      configured: this.isConfigured(),
      apiConfigured,
      webhookSecretConfigured: Boolean(this.config.dexPayWebhookSecret),
      webhookVerification: this.config.dexPayWebhookSecret ? 'strict' : 'skipped_no_secret',
      baseUrlHost: this.resolveBaseUrlHost(),
      lastCheckedAt,
      errorCode: null,
    };

    if (!this.isConfigured()) {
      return snapshot;
    }

    try {
      const business = await this.getBusinessInfo();
      return {
        ...snapshot,
        reachable: true,
        business,
      };
    } catch {
      if (await this.pingHealth()) {
        return {
          ...snapshot,
          reachable: true,
          errorCode: 'provider_business_info_unavailable',
        };
      }
      return {
        ...snapshot,
        reachable: false,
        errorCode: 'provider_unreachable',
      };
    }
  }

  async getBusinessInfo() {
    this.assertConfigured();
    const response = await this.request<DexPayBusinessInfo>('/info', { method: 'GET' });
    return response.data ?? {};
  }

  async getBanks() {
    if (!this.isConfigured()) {
      return [];
    }
    try {
      const response = await this.request<DexPayBank[]>('/banks', { method: 'GET' });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async getOrder(orderId: string) {
    this.assertConfigured();
    const response = await this.request<DexPayOrder>(`/order/${encodeURIComponent(orderId)}`, { method: 'GET' });
    if (!response.data?.id) {
      throw new BadGatewayException('Reponse DexPay incomplete.');
    }
    return response.data;
  }

  async createCheckout(payload: DexPayCheckoutDto): Promise<DexPayCheckoutResult> {
    this.assertConfigured();

    const asset = payload.asset || this.config.dexPayDefaultAsset;
    const chain = payload.chain || this.config.dexPayDefaultChain;
    const type = payload.direction === 'onramp'
      ? this.config.dexPayOnRampType
      : this.config.dexPayOffRampType;

    const quoteBody = {
      ...(payload.fiatAmount ? { fiatAmount: payload.fiatAmount } : {}),
      ...(payload.tokenAmount ? { tokenAmount: payload.tokenAmount } : {}),
      asset,
      chain,
      type,
      ...(payload.bankCode ? { bankCode: payload.bankCode } : {}),
      ...(payload.accountName ? { accountName: payload.accountName } : {}),
      ...(payload.accountNumber ? { accountNumber: payload.accountNumber } : {}),
    };

    const quoteResponse = await this.request<DexPayOrder>('/quote', {
      method: 'POST',
      body: JSON.stringify(quoteBody),
    });

    if (!quoteResponse.data?.id) {
      throw new BadGatewayException('Reponse de devis DexPay incomplete.');
    }

    const orderPayload = payload.direction === 'onramp'
      ? { recipientWallet: payload.recipientWallet }
      : {
          bankCode: payload.bankCode,
          accountName: payload.accountName,
          accountNumber: payload.accountNumber,
        };

    const orderResponse = await this.request<DexPayOrder>(`/quote/${encodeURIComponent(quoteResponse.data.id)}`, {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.data?.id) {
      throw new BadGatewayException('Reponse de commande DexPay incomplete.');
    }

    return {
      quote: quoteResponse.data,
      order: orderResponse.data,
    };
  }

  verifyWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = this.config.dexPayWebhookSecret;
    if (!secret) {
      return { valid: true, reason: 'skipped_no_secret' as const };
    }
    if (!rawBody?.length || !signature?.trim()) {
      return { valid: false, reason: 'missing_signature' as const };
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = signature.trim().toLowerCase().replace(/^sha256=/, '');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const providedBuffer = Buffer.from(provided, 'utf8');
    if (expectedBuffer.length !== providedBuffer.length) {
      return { valid: false, reason: 'signature_mismatch' as const };
    }

    const valid = timingSafeEqual(expectedBuffer, providedBuffer);
    return {
      valid,
      reason: valid ? 'verified' as const : 'signature_mismatch' as const,
    };
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Integration DexPay indisponible ou incomplete.');
    }
  }

  private resolveBaseUrlHost() {
    try {
      return this.config.dexPayBaseUrl ? new URL(this.config.dexPayBaseUrl).host : null;
    } catch {
      return null;
    }
  }

  private async request<T>(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.dexPayTimeoutMs);

    try {
      const response = await fetch(`${this.config.dexPayBaseUrl!}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          'X-API-KEY': this.config.dexPayApiKey!,
          'X-API-SECRET': this.config.dexPayApiSecret!,
          ...(init.headers ?? {}),
        },
      });

      const body = await this.safeJson(response) as DexPayEnvelope<T>;
      if (!response.ok) {
        throw new BadGatewayException('DexPay a refuse la requete.');
      }
      return body;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new BadGatewayException('Passerelle DexPay indisponible.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pingHealth() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.dexPayTimeoutMs);
    try {
      const response = await fetch(`${this.config.dexPayBaseUrl!}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.config.dexPayApiKey!,
          'X-API-SECRET': this.config.dexPayApiSecret!,
        },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async safeJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
}
