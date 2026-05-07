import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { CacheModule } from './cache/cache.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { DataController } from './data/data.controller.js';
import { MonitoringController } from './monitoring/monitoring.controller.js';
import { MonitoringService } from './monitoring/monitoring.service.js';
import { PublicController } from './public/public.controller.js';
import { PublicIntakeService } from './public/public-intake.service.js';
import { PaymentsController } from './payments/payments.controller.js';
import { DexPayService } from './payments/dexpay.service.js';
import { CommunicationsController } from './communications/communications.controller.js';
import { SmsService } from './communications/sms.service.js';
import { UploadsController } from './uploads/uploads.controller.js';
import { UploadsService } from './uploads/uploads.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule, CacheModule, UserModule],
  controllers: [
    AppController,
    AuthController,
    DataController,
    MonitoringController,
    PublicController,
    PaymentsController,
    CommunicationsController,
    UploadsController,
  ],
  providers: [
    AppService,
    AuthService,
    MonitoringService,
    PublicIntakeService,
    DexPayService,
    SmsService,
    UploadsService,
  ],
})
export class AppModule {}
