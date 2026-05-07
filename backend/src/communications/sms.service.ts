import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';

interface SmsSendPayload {
  phone: string;
  message: string;
  purpose: string;
  userId?: string;
}

interface SmsProviderStatus {
  provider: 'disabled' | 'mock' | 'sendtext';
  configured: boolean;
  baseUrl?: string;
  sendPath?: string;
  senderId?: string;
}

export interface SmsSendResult {
  provider: 'mock' | 'sendtext';
  accepted: boolean;
  providerMessageId?: string | null;
  raw?: unknown;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  getStatus(): SmsProviderStatus {
    return {
      provider: this.config.smsProvider,
      configured: this.isConfigured(),
      baseUrl: this.config.sendTextBaseUrl,
      sendPath: this.config.sendTextSendPath,
      senderId: this.config.smsSenderId,
    };
  }

  isConfigured() {
    if (this.config.smsProvider === 'disabled') return false;
    if (this.config.smsProvider === 'mock') return true;
    return Boolean(
      this.config.sendTextBaseUrl
      && this.config.sendTextSendPath
      && this.config.sendTextApiKey
      && this.config.sendTextApiSecret
      && this.config.smsSenderId,
    );
  }

  async send(payload: SmsSendPayload): Promise<SmsSendResult> {
    const phone = this.normalizePhone(payload.phone);
    if (!phone) {
      throw new ServiceUnavailableException('Numero de telephone invalide pour l envoi SMS.');
    }

    if (this.config.smsProvider === 'disabled') {
      throw new ServiceUnavailableException('Passerelle SMS desactivee.');
    }

    if (this.config.smsProvider === 'mock') {
      const providerMessageId = `mock-${Date.now()}`;
      this.logger.log(JSON.stringify({
        level: 'info',
        provider: 'mock',
        phone,
        purpose: payload.purpose,
        userId: payload.userId ?? null,
        providerMessageId,
      }));
      return {
        provider: 'mock',
        accepted: true,
        providerMessageId,
      };
    }

    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Configuration SendText incomplete.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.sendTextTimeoutMs);
    const url = `${this.config.sendTextBaseUrl!}${this.config.sendTextSendPath!}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.config.sendTextApiKey!,
          'api-secret': this.config.sendTextApiSecret!,
        },
        body: JSON.stringify({
          recipient_phone: phone,
          content: payload.message,
          sender_name: this.config.smsSenderId,
        }),
      });

      const body = await this.safeJson(response);
      if (!response.ok) {
        throw new BadGatewayException('Echec de remise SMS chez SendText.');
      }

      return {
        provider: 'sendtext',
        accepted: true,
        providerMessageId: this.extractMessageId(body),
        raw: body,
      };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new BadGatewayException('Passerelle SMS indisponible.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendBulk(recipients: Array<{ phone?: string; userId: string }>, message: string, purpose: string) {
    const results: Array<{ userId: string; ok: boolean; providerMessageId?: string | null }> = [];
    for (const recipient of recipients) {
      if (!recipient.phone) {
        results.push({ userId: recipient.userId, ok: false });
        continue;
      }
      try {
        const sent = await this.send({
          phone: recipient.phone,
          message,
          purpose,
          userId: recipient.userId,
        });
        results.push({
          userId: recipient.userId,
          ok: sent.accepted,
          providerMessageId: sent.providerMessageId,
        });
      } catch {
        results.push({ userId: recipient.userId, ok: false });
      }
    }
    return results;
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/[^\d+]/g, '').trim();
    if (!digits) return null;
    if (digits.startsWith('+221')) return `221${digits.slice(4)}`;
    if (digits.startsWith('00221')) return `221${digits.slice(5)}`;
    if (digits.startsWith('221')) return digits;
    if (/^\d{9}$/.test(digits)) return `221${digits}`;
    return /^\d{12}$/.test(digits) ? digits : null;
  }

  private extractMessageId(body: unknown) {
    if (!body || typeof body !== 'object') return null;
    const candidate = body as Record<string, unknown>;
    return String(
      candidate.message_id
      ?? candidate.id
      ?? candidate.uuid
      ?? candidate.reference
      ?? '',
    ) || null;
  }

  private async safeJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
