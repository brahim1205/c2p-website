import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import type { AuthUser, Role } from '../auth/auth.store.js';
import { appendAppRows, persistAppStoreToDatabase, syncAppStoreFromDatabase } from '../data/data.controller.js';
import { EmailService } from './email.service.js';
import { SmsService } from './sms.service.js';

interface CampaignDispatchPayload {
  title: string;
  type: 'email' | 'sms' | 'push' | 'all';
  target: string;
  content: string;
}

interface CampaignChannelSummary {
  attempted: number;
  delivered: number;
  failed: number;
  skipped: number;
  provider: string;
}

type DirectoryUser = Awaited<ReturnType<AuthService['listAllUsers']>>[number];

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  async dispatchCampaign(actor: AuthUser, payload: CampaignDispatchPayload) {
    const users = (await this.authService.listAllUsers()).filter((user) => user.status === 'active');
    const recipients = this.resolveRecipients(payload.target, users);
    const summary = {
      email: this.emptyChannelSummary(this.emailService.getStatus().provider),
      sms: this.emptyChannelSummary(this.smsService.getStatus().provider),
      push: this.emptyChannelSummary('in-app'),
    };

    if (payload.type === 'email' || payload.type === 'all') {
      const emailRecipients = recipients.filter((user) => Boolean(user.email));
      summary.email.attempted = emailRecipients.length;
      if (emailRecipients.length > 0) {
        const results = await this.emailService.sendBulk(
          emailRecipients.map((user) => ({ userId: user.id, email: user.email })),
          payload.title,
          payload.content,
          `campaign:${payload.title}`,
        );
        summary.email.delivered = results.filter((result) => result.ok).length;
        summary.email.failed = results.filter((result) => !result.ok).length;
      }
    } else {
      summary.email.skipped = recipients.length;
    }

    if (payload.type === 'sms' || payload.type === 'all') {
      const smsRecipients = recipients.filter((user) => Boolean(user.phone));
      summary.sms.attempted = smsRecipients.length;
      if (smsRecipients.length > 0) {
        const results = await this.smsService.sendBulk(
          smsRecipients.map((user) => ({ userId: user.id, phone: user.phone })),
          payload.content,
          `campaign:${payload.title}`,
        );
        summary.sms.delivered = results.filter((result) => result.ok).length;
        summary.sms.failed = results.filter((result) => !result.ok).length;
      }
    } else {
      summary.sms.skipped = recipients.length;
    }

    if (payload.type === 'push' || payload.type === 'all') {
      summary.push.attempted = recipients.length;
      const delivered = await this.createInAppNotifications(actor, recipients, payload.title, payload.content);
      summary.push.delivered = delivered;
      summary.push.failed = Math.max(recipients.length - delivered, 0);
    } else {
      summary.push.skipped = recipients.length;
    }

    return {
      recipients: recipients.length,
      dispatched:
        summary.email.delivered
        + summary.sms.delivered
        + summary.push.delivered,
      failed:
        summary.email.failed
        + summary.sms.failed
        + summary.push.failed,
      channels: summary,
    };
  }

  async createInAppNotifications(
    actor: Pick<AuthUser, 'id' | 'role'>,
    recipients: Array<Pick<AuthUser, 'id' | 'role'>>,
    title: string,
    message: string,
    overrides: { type?: string; link?: string; metadata?: Record<string, unknown> } = {},
  ) {
    if (recipients.length === 0) {
      return 0;
    }

    await syncAppStoreFromDatabase(this.prisma);
    appendAppRows('notifications', recipients.map((recipient) => ({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${recipient.id}`,
      user_id: recipient.id,
      title,
      message,
      type: overrides.type ?? 'communication',
      is_read: false,
      link: overrides.link ?? this.getDefaultNotificationLink(recipient.role),
      metadata: {
        actor_id: actor.id,
        actor_role: actor.role,
        channel: 'in-app',
        ...(overrides.metadata ?? {}),
      },
      created_at: new Date().toISOString(),
    })));
    await persistAppStoreToDatabase(this.prisma);
    return recipients.length;
  }

  private emptyChannelSummary(provider: string): CampaignChannelSummary {
    return {
      attempted: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
      provider,
    };
  }

  private resolveRecipients(target: string, users: DirectoryUser[]) {
    const normalized = target.trim().toLowerCase();
    const byRole = (role: Role) => users.filter((user) => user.role === role);

    if (normalized.includes('apprenant')) return byRole('apprenant');
    if (normalized.includes('client')) return byRole('client');
    if (normalized.includes('porteur')) return byRole('porteur');
    if (normalized.includes('prestataire')) return byRole('prestataire');
    if (normalized.includes('partenaire')) return byRole('partenaire');
    if (normalized.includes('formateur')) return byRole('formateur');
    return users;
  }

  private getDefaultNotificationLink(role: Role) {
    if (role === 'admin') return '/admin/communications';
    if (role === 'formateur') return '/dashboard/formateur';
    if (role === 'apprenant') return '/dashboard/apprenant';
    if (role === 'prestataire') return '/dashboard/prestataire';
    if (role === 'client') return '/dashboard/client';
    if (role === 'porteur') return '/dashboard/porteur';
    if (role === 'partenaire') return '/dashboard/partenaire';
    return '/dashboard';
  }
}
