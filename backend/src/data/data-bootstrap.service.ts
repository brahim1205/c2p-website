import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { syncAppStoreFromDatabase } from './data.controller.js';

@Injectable()
export class DataBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DataBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await syncAppStoreFromDatabase(this.prisma, { force: true });
      this.logger.log('AppRow store hydrated on boot.');
    } catch (error) {
      this.logger.warn(`Unable to hydrate AppRow store on boot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
