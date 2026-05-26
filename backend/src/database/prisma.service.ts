import { ConflictException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  constructor(private readonly config: ConfigService) {
    super();
    this.$use(async (params, next) => {
      if (
        params.model === 'FinanceLedgerEntry'
        && new Set(['update', 'updateMany', 'upsert', 'delete', 'deleteMany']).has(params.action)
      ) {
        throw new ConflictException('Les écritures du ledger financier sont immuables.');
      }
      return next(params);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      if (this.config.prismaConnectionRequired) {
        throw error;
      }
      console.warn('[PrismaService] Database connection skipped:', error);
    }
  }

  get isConnected() {
    return this.connected;
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // noop
    }
  }
}
