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
    };
    await this.saveRow('public_contact_submissions', row);
    return { success: true };
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
