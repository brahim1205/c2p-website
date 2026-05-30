import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { resolveProviderLifecycleState } from './finance-domain-guards.js';
import { readProviderRecord } from './provider-integration.helpers.js';

@Injectable()
export class ProviderIntegrationReadService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  listWebhookReceipts(limit = 50, status?: string) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.webhookReceipt.findMany({
      where: {
        provider: 'dexpay',
        ...(status ? { status } : {}),
      },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.resolveLimit(limit),
    });
  }

  listReconciliationJobs(limit = 50) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.reconciliationJob.findMany({
      where: { provider: 'dexpay' },
      orderBy: [{ createdAt: 'desc' }],
      take: this.resolveLimit(limit),
    });
  }

  listProviderTransactions(limit = 50, status?: string) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.providerTransaction.findMany({
      where: {
        provider: 'dexpay',
        ...(status ? { providerStatus: status } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.resolveLimit(limit),
    }).then((rows) => rows.map((row) => ({
      ...row,
      lifecycleStatus: resolveProviderLifecycleState({
        status: row.providerStatus,
        providerStatus: row.providerStatus,
        settledToWallet: Boolean(readProviderRecord(row.metadata)?.settled_to_wallet),
      }),
    })));
  }

  listPaymentIntents(limit = 50, status?: string) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.paymentIntent.findMany({
      where: {
        provider: 'dexpay',
        ...(status ? { status } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.resolveLimit(limit),
    });
  }

  private resolveLimit(limit: number) {
    return Math.min(Math.max(limit, 1), 200);
  }
}
