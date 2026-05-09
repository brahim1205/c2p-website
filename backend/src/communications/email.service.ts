import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';

interface EmailSendPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  purpose: string;
  userId?: string;
}

interface EmailProviderStatus {
  provider: 'disabled' | 'mock' | 'resend';
  configured: boolean;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  provider: 'mock' | 'resend';
  accepted: boolean;
  providerMessageId?: string | null;
  raw?: unknown;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  getStatus(): EmailProviderStatus {
    return {
      provider: this.config.emailProvider,
      configured: this.isConfigured(),
      from: this.config.emailFrom,
      replyTo: this.config.emailReplyTo,
    };
  }

  isConfigured() {
    if (this.config.emailProvider === 'disabled') return false;
    if (this.config.emailProvider === 'mock') return true;
    return Boolean(this.config.emailFrom && this.config.resendApiKey);
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    const email = this.normalizeEmail(payload.to);
    if (!email) {
      throw new ServiceUnavailableException('Adresse email invalide pour l envoi.');
    }

    if (this.config.emailProvider === 'disabled') {
      throw new ServiceUnavailableException('Passerelle email desactivee.');
    }

    if (this.config.emailProvider === 'mock') {
      const providerMessageId = `mock-email-${Date.now()}`;
      this.logger.log(JSON.stringify({
        level: 'info',
        provider: 'mock',
        to: this.maskEmail(email),
        subject: payload.subject,
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
      throw new ServiceUnavailableException('Configuration email incomplete.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.emailTimeoutMs);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.resendApiKey!}`,
        },
        body: JSON.stringify({
          from: this.config.emailFrom!,
          to: [email],
          reply_to: this.config.emailReplyTo || undefined,
          subject: payload.subject,
          text: payload.text,
          html: payload.html ?? `<p>${payload.text.replace(/\n/g, '<br/>')}</p>`,
        }),
      });

      const body = await this.safeJson(response);
      if (!response.ok) {
        throw new BadGatewayException('Echec de remise email chez Resend.');
      }

      return {
        provider: 'resend',
        accepted: true,
        providerMessageId: this.extractMessageId(body),
        raw: body,
      };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new BadGatewayException('Passerelle email indisponible.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendBulk(recipients: Array<{ email?: string; userId: string }>, subject: string, message: string, purpose: string) {
    const results: Array<{ userId: string; ok: boolean; providerMessageId?: string | null }> = [];
    for (const recipient of recipients) {
      if (!recipient.email) {
        results.push({ userId: recipient.userId, ok: false });
        continue;
      }
      try {
        const sent = await this.send({
          to: recipient.email,
          subject,
          text: message,
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

  private normalizeEmail(email: string) {
    const normalized = String(email ?? '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';
    const safeName = name.length <= 2 ? `${name[0] ?? '*'}*` : `${name.slice(0, 2)}***`;
    return `${safeName}@${domain}`;
  }

  private extractMessageId(body: unknown) {
    if (!body || typeof body !== 'object') return null;
    const candidate = body as Record<string, unknown>;
    return String(candidate.id ?? candidate.message_id ?? '') || null;
  }

  private async safeJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
