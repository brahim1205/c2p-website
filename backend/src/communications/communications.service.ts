import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import type { AuthUser, Role } from '../auth/auth.store.js';
import { buildNotificationDispatchOutboxEvent } from '../notifications/notification-outbox.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import { buildOutboxEvent } from '../outbox/outbox-contract.js';
import { EmailService } from './email.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { SmsService } from './sms.service.js';
import type { CampaignAudience } from './dto/communications.dto.js';

interface CampaignDispatchPayload {
  title: string;
  type: 'email' | 'sms' | 'push' | 'all';
  target: CampaignAudience;
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
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly outboxService: OutboxService,
  ) {}

  async dispatchCampaign(actor: AuthUser, payload: CampaignDispatchPayload) {
    const users = (await this.authService.listAllUsers()).filter((user) => user.status === 'active');
    const recipients = this.resolveRecipients(payload.target, users);
    const summary = {
      email: this.emptyChannelSummary(this.emailService.getStatus().provider),
      sms: this.emptyChannelSummary(this.smsService.getStatus().provider),
      push: this.emptyChannelSummary('in-app'),
    };
    const queuedEvents: Array<{ id: string; eventType: string }> = [];

    if (payload.type === 'email' || payload.type === 'all') {
      const emailRecipients = recipients.filter((user) => Boolean(user.email));
      summary.email.attempted = emailRecipients.length;
      if (emailRecipients.length > 0) {
        queuedEvents.push(...await this.outboxService.enqueueMany([buildOutboxEvent({
          eventType: 'communications.email.send',
          aggregateId: payload.title,
          actorId: actor.id,
          payload: {
            recipients: emailRecipients.map((user) => ({ userId: user.id, email: user.email })),
            subject: payload.title,
            message: payload.content,
            purpose: `campaign:${payload.title}`,
          },
          metadata: { channel: 'email', recipientCount: emailRecipients.length },
        })]));
      }
    } else {
      summary.email.skipped = recipients.length;
    }

    if (payload.type === 'sms' || payload.type === 'all') {
      const smsRecipients = recipients.filter((user) => Boolean(user.phone));
      summary.sms.attempted = smsRecipients.length;
      if (smsRecipients.length > 0) {
        queuedEvents.push(...await this.outboxService.enqueueMany([buildOutboxEvent({
          eventType: 'communications.sms.send',
          aggregateId: payload.title,
          actorId: actor.id,
          payload: {
            recipients: smsRecipients.map((user) => ({ userId: user.id, phone: user.phone })),
            message: payload.content,
            purpose: `campaign:${payload.title}`,
          },
          metadata: { channel: 'sms', recipientCount: smsRecipients.length },
        })]));
      }
    } else {
      summary.sms.skipped = recipients.length;
    }

    if (payload.type === 'push' || payload.type === 'all') {
      summary.push.attempted = recipients.length;
      queuedEvents.push(...await this.outboxService.enqueueMany([buildNotificationDispatchOutboxEvent({
        eventType: 'communications.notification.dispatch',
        aggregateId: payload.title,
        actorId: actor.id,
        notifications: recipients.map((recipient) => createAppNotificationRow({
          userId: recipient.id,
          title: payload.title,
          message: payload.content,
          type: 'communication',
          link: this.getDefaultNotificationLink(recipient.role),
          metadata: {
            actor_id: actor.id,
            actor_role: actor.role,
            channel: 'in-app',
          },
        })),
        metadata: { channel: 'in-app', recipientCount: recipients.length },
      })]));
    } else {
      summary.push.skipped = recipients.length;
    }

    return {
      recipients: recipients.length,
      queued: queuedEvents.length,
      dispatched: queuedEvents.length,
      failed: 0,
      channels: summary,
      events: queuedEvents,
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

    await this.outboxService.enqueue(buildNotificationDispatchOutboxEvent({
      eventType: 'communications.notification.dispatch',
      aggregateId: title,
      actorId: actor.id,
      notifications: recipients.map((recipient) => createAppNotificationRow({
        userId: recipient.id,
        title,
        message,
        type: overrides.type ?? 'communication',
        link: overrides.link ?? this.getDefaultNotificationLink(recipient.role),
        metadata: {
          actor_id: actor.id,
          actor_role: actor.role,
          channel: 'in-app',
          ...(overrides.metadata ?? {}),
        },
      })),
      metadata: {
        channel: 'in-app',
        recipientCount: recipients.length,
      },
    }));
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

  private resolveRecipients(target: CampaignAudience, users: DirectoryUser[]) {
    const byRole = (role: Role) => users.filter((user) => user.role === role);

    switch (target) {
      case 'all_users':
        return users;
      case 'all_apprenants':
        return byRole('apprenant');
      case 'active_clients':
        return byRole('client');
      case 'project_holders':
        return byRole('porteur');
      case 'verified_providers':
        return byRole('prestataire');
      default:
        throw new BadRequestException('Audience de campagne non prise en charge.');
    }
  }

  private getDefaultNotificationLink(role: Role) {
    if (role === 'admin') return '/admin/communications';
    if (role === 'formateur') return '/dashboard/formateur';
    if (role === 'apprenant') return '/dashboard/apprenant';
    if (role === 'parent') return '/dashboard/parent';
    if (role === 'prestataire') return '/dashboard/prestataire';
    if (role === 'client') return '/dashboard/client';
    if (role === 'porteur') return '/dashboard/porteur';
    if (role === 'partenaire') return '/dashboard/partenaire';
    return '/dashboard';
  }
}
