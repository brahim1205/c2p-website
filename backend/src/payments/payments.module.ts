import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PaymentsController } from './payments.controller.js';
import { DexPayService } from './dexpay.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [DexPayService],
})
export class PaymentsModule {}
