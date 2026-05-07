import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
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

@Injectable()
export class DexPayService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.config.dexPayEnabled
      && this.config.dexPayBaseUrl
      && this.config.dexPayApiKey
      && this.config.dexPayApiSecret,
    );
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return {
        enabled: false,
        configured: false,
      };
    }

    try {
      const business = await this.getBusinessInfo();
      return {
        enabled: true,
        configured: true,
        reachable: true,
        business,
      };
    } catch {
      return {
        enabled: true,
        configured: true,
        reachable: false,
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
    const response = await this.request<DexPayBank[]>('/banks', { method: 'GET' });
    return Array.isArray(response.data) ? response.data : [];
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

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Integration DexPay indisponible ou incomplete.');
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

  private async safeJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
}
