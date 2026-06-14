import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { FinanceReadService } from './finance-read.service.js';
import { SubscriptionPlanAdminService } from './subscription-plan-admin.service.js';
import { PaymentsController } from './payments.controller.js';
import { DexPayService } from './dexpay.service.js';
import { PaymentCommandsService } from './payment-commands.service.js';
import { ProviderArtifactsService } from './provider-artifacts.service.js';
import { ProviderIntegrationService } from './provider-integration.service.js';
import { ProviderIntegrationReadService } from './provider-integration-read.service.js';
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
    SubscriptionPlanAdminService,
    ProviderArtifactsService,
    ProviderIntegrationService,
    ProviderIntegrationReadService,
    FinanceStateMachineService,
  ],
  exports: [FinanceReadService, PaymentCommandsService],
})
export class PaymentsModule {}
