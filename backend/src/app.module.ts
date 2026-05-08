import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { CacheModule } from './cache/cache.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DataModule } from './data/data.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';
import { PublicModule } from './public/public.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { UploadsModule } from './uploads/uploads.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CacheModule,
    UserModule,
    AuthModule,
    DataModule,
    MonitoringModule,
    PublicModule,
    PaymentsModule,
    CommunicationsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
