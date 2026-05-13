import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { AuditLogService } from './audit-log.service.js';
import { PlatformPersistenceService } from './platform-persistence.service.js';
import { PlatformSnapshotSyncService } from './platform-snapshot-sync.service.js';
import { PrismaService } from './prisma.service.js';
import { WalletService } from './wallet.service.js';

@Module({
  imports: [ConfigModule],
  providers: [PrismaService, AuditLogService, WalletService, PlatformPersistenceService, PlatformSnapshotSyncService],
  exports: [PrismaService, AuditLogService, WalletService, PlatformPersistenceService, PlatformSnapshotSyncService],
})
export class DatabaseModule {}
