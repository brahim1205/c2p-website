import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '../config/config.module.js';
import { DatabaseModule } from './database.module.js';
import { PlatformSnapshotSyncService } from './platform-snapshot-sync.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule],
})
class PlatformSnapshotSyncCliModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(PlatformSnapshotSyncCliModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(PlatformSnapshotSyncService);
    const summary = await service.syncNow({ reason: 'cli' });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await app.close();
  }
}

void main();
