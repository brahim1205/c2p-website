import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { buildNotificationDispatchOutboxEvent } from '../notifications/notification-outbox.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import { OutboxService } from '../outbox/outbox.service.js';

type PublicTableName = 'public_contact_submissions' | 'public_newsletter_subscriptions';

interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'handled';
  handledAt: string | null;
}

interface NewsletterSubscription {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

@Injectable()
export class PublicIntakeService {
  private readonly logger = new Logger(PublicIntakeService.name);
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  private readonly fallback = {
    contact: [] as ContactSubmission[],
    newsletter: [] as NewsletterSubscription[],
  };

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private rowKey(table: PublicTableName, rowId: string) {
    return `${table}:${rowId}`;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return this.clone(value) as Prisma.InputJsonValue;
  }

  private createId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private normalizeText(value?: string) {
    return value?.trim().replace(/\s+/g, ' ');
  }

  private assertLength(value: string, label: string, minimum: number, maximum: number) {
    if (value.length < minimum || value.length > maximum) {
      throw new BadRequestException(`${label} doit contenir entre ${minimum} et ${maximum} caracteres.`);
    }
  }

  private parseLimit(raw?: string, fallback = 100) {
    const parsed = Number(raw ?? fallback);
    return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, 1), 200);
  }

  private async saveRow(table: PublicTableName, row: ContactSubmission | NewsletterSubscription) {
    if (!this.prisma.isConnected) {
      if (table === 'public_contact_submissions') {
        this.fallback.contact.unshift(this.clone(row) as ContactSubmission);
      } else {
        this.fallback.newsletter.unshift(this.clone(row) as NewsletterSubscription);
      }
      return;
    }

    await this.prisma.appRow.upsert({
      where: { key: this.rowKey(table, row.id) },
      update: {
        data: this.toJson(row),
      },
      create: {
        key: this.rowKey(table, row.id),
        table,
        rowId: row.id,
        data: this.toJson(row),
      },
    });
  }

  private async loadRows<T extends ContactSubmission | NewsletterSubscription>(table: PublicTableName): Promise<T[]> {
    if (!this.prisma.isConnected) {
      const source = table === 'public_contact_submissions'
        ? this.fallback.contact
        : this.fallback.newsletter;
      return this.clone(source) as T[];
    }

    const rows = await this.prisma.appRow.findMany({
      where: { table },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.clone(row.data as unknown) as T);
  }

  async submitContact(payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    subject?: string;
    message?: string;
  }) {
    const firstName = this.normalizeText(payload.firstName);
    const lastName = this.normalizeText(payload.lastName);
    const email = payload.email?.trim().toLowerCase();
    const subject = this.normalizeText(payload.subject);
    const message = this.normalizeText(payload.message);

    if (!firstName || !lastName || !email || !subject || !message) {
      throw new BadRequestException('Formulaire incomplet.');
    }
    if (!PublicIntakeService.EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('Adresse email invalide.');
    }
    this.assertLength(email, "L'adresse email", 6, 254);
    this.assertLength(firstName, 'Le prenom', 2, 80);
    this.assertLength(lastName, 'Le nom', 2, 80);
    this.assertLength(subject, 'Le sujet', 4, 160);
    this.assertLength(message, 'Le message', 10, 2000);

    const row: ContactSubmission = {
      id: this.createId('contact'),
      firstName,
      lastName,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      status: 'new',
      handledAt: null,
    };
    await this.saveRow('public_contact_submissions', row);
    try {
      await this.outboxService.enqueue(buildNotificationDispatchOutboxEvent({
        eventType: 'support.contact_submitted',
        aggregateId: row.id,
        actorId: null,
        notifications: [createAppNotificationRow({
          id: `notif-contact-${row.id}`,
          userId: 'usr-admin',
          title: 'Nouveau message public',
          message: `${row.firstName} ${row.lastName} a envoye une demande de contact.`,
          type: 'support',
          link: '/admin/messages',
          metadata: {
            submission_id: row.id,
            channel: 'public-contact',
            email: row.email,
            subject: row.subject,
          },
        })],
        metadata: {
          email: row.email,
          subject: row.subject,
        },
      }));
    } catch (err) {
      this.logger.error(`Impossible d'enregistrer l'evenement outbox pour la demande publique ${row.id}.`, err instanceof Error ? err.stack : undefined);
    }
    return { success: true };
  }

  async listContactSubmissions(limit?: string) {
    const take = this.parseLimit(limit);
    const rows = await this.loadRows<ContactSubmission>('public_contact_submissions');
    return rows
      .map((row) => ({
        ...row,
        status: row.status ?? 'new',
        handledAt: row.handledAt ?? null,
      }))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, take);
  }

  async markContactSubmissionHandled(id: string) {
    const handledAt = new Date().toISOString();

    if (!this.prisma.isConnected) {
      const row = this.fallback.contact.find((entry) => entry.id === id);
      if (!row) {
        throw new BadRequestException('Demande introuvable.');
      }
      if (row.status === 'handled') {
        return this.clone(row);
      }
      row.status = 'handled';
      row.handledAt = handledAt;
      return this.clone(row);
    }

    const existing = await this.prisma.appRow.findUnique({
      where: { key: this.rowKey('public_contact_submissions', id) },
    });

    if (!existing) {
      throw new BadRequestException('Demande introuvable.');
    }

    const current = this.clone(existing.data as unknown) as ContactSubmission;
    if (current.status === 'handled') {
      return current;
    }

    const updated = {
      ...current,
      status: 'handled' as const,
      handledAt,
    };

    await this.prisma.appRow.update({
      where: { key: existing.key },
      data: {
        data: this.toJson(updated),
      },
    });

    return updated;
  }

  async subscribeNewsletter(payload: { email?: string; source?: string }) {
    const email = payload.email?.trim().toLowerCase();
    const source = this.normalizeText(payload.source) || 'public-site';
    if (!email || !PublicIntakeService.EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('Adresse email invalide.');
    }
    this.assertLength(email, "L'adresse email", 6, 254);
    this.assertLength(source, 'La source', 2, 80);

    const existingSubscriptions = await this.loadRows<NewsletterSubscription>('public_newsletter_subscriptions');
    const alreadySubscribed = existingSubscriptions.some((entry) => entry.email === email);
    if (alreadySubscribed) {
      return { success: true, alreadySubscribed: true };
    }

    const row: NewsletterSubscription = {
      id: this.createId('newsletter'),
      email,
      source,
      createdAt: new Date().toISOString(),
    };
    await this.saveRow('public_newsletter_subscriptions', row);
    return { success: true, alreadySubscribed: false };
  }
}
