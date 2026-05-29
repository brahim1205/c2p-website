import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { MarketplaceController } from './marketplace.controller.js';
import { MarketplacePrismaReadService } from './marketplace-prisma-read.service.js';
import { MarketplaceService } from './marketplace.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplacePrismaReadService],
})
export class MarketplaceModule {}
