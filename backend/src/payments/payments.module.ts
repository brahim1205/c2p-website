import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { FinanceReadService } from './finance-read.service.js';
import { PaymentsController } from './payments.controller.js';
import { DexPayService } from './dexpay.service.js';
import { PaymentCommandsService } from './payment-commands.service.js';
import { ProviderIntegrationService } from './provider-integration.service.js';
import { FinanceStateMachineService } from './finance-state-machine.service.js';
import { ProviderRegistryService } from './provider-registry.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PaymentsController],
  providers: [
    DexPayService,
    ProviderRegistryService,
    PaymentCommandsService,
    FinanceReadService,
    ProviderIntegrationService,
    FinanceStateMachineService,
  ],
  exports: [FinanceReadService],
})
export class PaymentsModule {}
