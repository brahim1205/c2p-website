import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
    } catch (error) {
      this.connected = false;
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
