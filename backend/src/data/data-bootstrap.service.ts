import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { syncAppStoreFromDatabase } from './data-app-store.js';

@Injectable()
export class DataBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DataBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await syncAppStoreFromDatabase(this.prisma, { force: true });
      this.logger.log('AppRow store hydrated on boot.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.config.prismaConnectionRequired) {
        throw error;
      }
      this.logger.warn(`Unable to hydrate AppRow store on boot: ${message}`);
    }
  }
}
