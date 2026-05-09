import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

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
  constructor(private readonly prisma: PrismaService) {}

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
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const email = payload.email?.trim().toLowerCase();
    const subject = payload.subject?.trim();
    const message = payload.message?.trim();

    if (!firstName || !lastName || !email || !subject || !message) {
      throw new BadRequestException('Formulaire incomplet.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Adresse email invalide.');
    }
    if (message.length < 10 || message.length > 2000) {
      throw new BadRequestException('Le message doit contenir entre 10 et 2000 caracteres.');
    }

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
    return { success: true };
  }

  async listContactSubmissions() {
    const rows = await this.loadRows<ContactSubmission>('public_contact_submissions');
    return rows
      .map((row) => ({
        ...row,
        status: row.status ?? 'new',
        handledAt: row.handledAt ?? null,
      }))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async markContactSubmissionHandled(id: string) {
    const handledAt = new Date().toISOString();

    if (!this.prisma.isConnected) {
      const row = this.fallback.contact.find((entry) => entry.id === id);
      if (!row) {
        throw new BadRequestException('Demande introuvable.');
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

    const updated = {
      ...(this.clone(existing.data as unknown) as ContactSubmission),
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
    const source = payload.source?.trim() || 'public-site';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Adresse email invalide.');
    }

    const row: NewsletterSubscription = {
      id: this.createId('newsletter'),
      email,
      source,
      createdAt: new Date().toISOString(),
    };
    await this.saveRow('public_newsletter_subscriptions', row);
    return { success: true };
  }
}
