import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentCommandsService } from './payment-commands.service.js';
import { FinanceReadService } from './finance-read.service.js';
import { ProviderIntegrationService } from './provider-integration.service.js';
import { ProviderIntegrationReadService } from './provider-integration-read.service.js';
import { FinanceStateMachineService } from './finance-state-machine.service.js';
import { ProviderRegistryService } from './provider-registry.service.js';
import {
  buildFinanceCapabilityContractDescriptor,
  resolveFinanceCapabilityContractVersion,
} from './finance-capability-contract.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import { operatorActionSchema, type OperatorActionDto } from '../common/dto/operator-action.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { SubscriptionPlanAdminService } from './subscription-plan-admin.service.js';
import {
  dexpayCheckoutSchema,
  dexpayReconcileSchema,
  dexpaySyncSchema,
  dexpayWebhookSchema,
  type DexPayCheckoutDto,
  type DexPayReconcileDto,
  type DexPaySyncDto,
  type DexPayWebhookDto,
} from './dto/dexpay.dto.js';
import {
  payoutAccountCreateSchema,
  payoutRequestCreateSchema,
  providerVisibilityPurchaseSchema,
  subscriptionActivateSchema,
  adminEscrowStatusSchema,
  adminPayoutStatusSchema,
  adminTransactionStatusSchema,
  walletTopupSchema,
  walletWithdrawSchema,
  type AdminEscrowStatusDto,
  type AdminPayoutStatusDto,
  type AdminTransactionStatusDto,
  type PayoutAccountCreateDto,
  type PayoutRequestCreateDto,
  type ProviderVisibilityPurchaseDto,
  type SubscriptionActivateDto,
  type WalletTopupDto,
  type WalletWithdrawDto,
} from './dto/finance-commands.dto.js';
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private static readonly SUBSCRIPTION_PLAN_ROLES = new Set(['prestataire', 'formateur', 'partenaire']);

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly paymentCommandsService: PaymentCommandsService,
    private readonly financeReadService: FinanceReadService,
    private readonly providerIntegrationService: ProviderIntegrationService,
    private readonly providerIntegrationReadService: ProviderIntegrationReadService,
    private readonly financeStateMachineService: FinanceStateMachineService,
    private readonly subscriptionPlanAdminService: SubscriptionPlanAdminService,
  ) {}

  @Get('dexpay/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.dexpay.read')
  async getDexPayStatus(@Req() request: AuthenticatedRequest) {
    this.getActor(request);
    return this.providerRegistry.getDexPay().getStatus();
  }

  @Get('dexpay/banks')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.dexpay.read')
  async getDexPayBanks(@Req() request: AuthenticatedRequest) {
    this.getActor(request);
    return this.providerRegistry.getDexPay().getBanks();
  }

  @Get('wallet/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyWallet(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getWallet(actor);
  }

  @Get('transactions/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyTransactions(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getTransactions(actor);
  }

  @Get('transactions/:transactionId/capabilities')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getTransactionCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
  ) {
    const actor = this.getActor(request);
    return this.financeStateMachineService.getTransactionCapabilities(actor, transactionId);
  }

  @Get('subscription-plans')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getSubscriptionPlans(
    @Req() request: AuthenticatedRequest,
    @Query('role') role?: string,
  ) {
    const actor = this.getActor(request);
    return this.financeReadService.getSubscriptionPlans(this.resolveSubscriptionPlanRole(role, actor.role));
  }

  @Get('admin/subscription-plans')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.write')
  listAdminSubscriptionPlans(@Req() request: AuthenticatedRequest) {
    this.getActor(request);
    return this.subscriptionPlanAdminService.listAll();
  }

  @Post('admin/subscription-plans')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.write')
  createSubscriptionPlan(@Req() request: AuthenticatedRequest, @Body() payload: Record<string, unknown>) {
    return this.subscriptionPlanAdminService.create(payload, this.getActor(request));
  }

  @Patch('admin/subscription-plans/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.write')
  updateSubscriptionPlan(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.subscriptionPlanAdminService.update(id, payload, this.getActor(request));
  }

  @Delete('admin/subscription-plans/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.write')
  removeSubscriptionPlan(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.subscriptionPlanAdminService.remove(id, this.getActor(request));
  }

  @Get('provider-visibility/products')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getProviderVisibilityProducts(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getProviderVisibilityProducts(actor);
  }

  @Get('provider-visibility/orders/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyProviderVisibilityOrders(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getProviderVisibilityOrders(actor);
  }

  @Get('provider-visibility/passes/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyProviderVisibilityPasses(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getProviderVisibilityPasses(actor);
  }

  @Get('subscriptions/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMySubscriptions(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getSubscriptions(actor);
  }

  @Get('subscriptions/:subscriptionId/capabilities')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getSubscriptionCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    const actor = this.getActor(request);
    return this.financeStateMachineService.getSubscriptionCapabilities(actor, subscriptionId);
  }

  @Get('escrows/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyEscrows(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getEscrows(actor);
  }

  @Get('escrows/:escrowId/capabilities')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getEscrowCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('escrowId') escrowId: string,
  ) {
    const actor = this.getActor(request);
    return this.financeStateMachineService.getEscrowCapabilities(actor, escrowId);
  }

  @Get('commissions/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyCommissions(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getCommissions(actor);
  }

  @Get('payout-accounts/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyPayoutAccounts(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getPayoutAccounts(actor);
  }

  @Get('payouts/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyPayoutRequests(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getPayoutRequests(actor);
  }

  @Get('payouts/:requestId/capabilities')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getPayoutCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    const actor = this.getActor(request);
    return this.financeStateMachineService.getPayoutCapabilities(actor, requestId);
  }

  @Get('invoices/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyInvoices(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getInvoices(actor);
  }

  @Get('invoices/:invoiceId/capabilities')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getInvoiceCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('invoiceId') invoiceId: string,
  ) {
    const actor = this.getActor(request);
    return this.financeStateMachineService.getInvoiceCapabilities(actor, invoiceId);
  }

  @Get('capabilities/contract')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getCapabilitiesContract(
    @Req() request: AuthenticatedRequest,
    @Query('contractVersion') contractVersion?: string,
  ) {
    this.getActor(request);
    resolveFinanceCapabilityContractVersion(contractVersion);
    return buildFinanceCapabilityContractDescriptor();
  }

  @Get('capabilities/:entity/:entityId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getGenericCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('contractVersion') contractVersion?: string,
  ) {
    const actor = this.getActor(request);
    resolveFinanceCapabilityContractVersion(contractVersion);
    return this.financeStateMachineService.getCapabilities(actor, entity as never, entityId);
  }

  @Get('snapshot/me')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.finance.read')
  async getMyFinanceSnapshot(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return {
      wallet: await this.financeReadService.getWallet(actor),
      subscriptions: await this.financeReadService.getSubscriptions(actor),
      plans: await this.financeReadService.getSubscriptionPlans(this.resolveSubscriptionPlanRole(undefined, actor.role)),
      providerVisibilityProducts: await this.financeReadService.getProviderVisibilityProducts(actor),
      providerVisibilityOrders: await this.financeReadService.getProviderVisibilityOrders(actor),
      providerVisibilityPasses: await this.financeReadService.getProviderVisibilityPasses(actor),
      escrowCases: await this.financeReadService.getEscrows(actor),
      commissionEntries: await this.financeReadService.getCommissions(actor),
      payoutAccounts: await this.financeReadService.getPayoutAccounts(actor),
      payoutRequests: await this.financeReadService.getPayoutRequests(actor),
      invoices: await this.financeReadService.getInvoices(actor),
    };
  }

  @Get('admin/transactions')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.read')
  async getAdminTransactions(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getTransactions(actor);
  }

  @Get('admin/overview')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.read')
  async getAdminFinanceOverview(@Req() request: AuthenticatedRequest) {
    this.getActor(request);
    return this.financeReadService.getAdminOverview();
  }

  @Get('admin/invoices')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.read')
  async getAdminInvoices(@Req() request: AuthenticatedRequest) {
    const actor = this.getActor(request);
    return this.financeReadService.getInvoices(actor);
  }

  @Get('admin/ledger')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.read')
  async getAdminLedger(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    this.getActor(request);
    return this.financeReadService.getAdminLedgerEntries(Number(limit ?? 200) || 200);
  }

  @Get('admin/ledger/reconciliation')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.read')
  async getAdminLedgerReconciliation(@Req() request: AuthenticatedRequest) {
    this.getActor(request);
    return this.financeReadService.getAdminLedgerReconciliation();
  }

  @Post('wallet/topup')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance.self_service')
  async topupWallet(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(walletTopupSchema)) payload: WalletTopupDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.topupWallet(actor, payload, request.requestId ?? `req-${Date.now()}`);
  }

  @Post('wallet/withdraw')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance.self_service')
  async withdrawWallet(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(walletWithdrawSchema)) payload: WalletWithdrawDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.withdrawWallet(actor, payload, request.requestId ?? `req-${Date.now()}`);
  }

  @Post('payout-accounts')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance.self_service')
  async createPayoutAccount(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(payoutAccountCreateSchema)) payload: PayoutAccountCreateDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.createPayoutAccount(actor, payload);
  }

  @Post('payout-accounts/:accountId/default')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance.self_service')
  async setDefaultPayoutAccount(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.setDefaultPayoutAccount(actor, accountId);
  }

  @Post('payouts/request')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance.self_service')
  async createPayoutRequest(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(payoutRequestCreateSchema)) payload: PayoutRequestCreateDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.createPayoutRequest(actor, payload, request.requestId ?? `req-${Date.now()}`);
  }

  @Post('subscriptions/activate')
  @UseGuards(PermissionGuard)
  @RequirePermission('subscription.self_service')
  async activateSubscription(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(subscriptionActivateSchema)) payload: SubscriptionActivateDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.activateSubscription(actor, payload, request.requestId ?? `req-${Date.now()}`);
  }

  @Post('provider-visibility/purchase')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance.self_service')
  async purchaseProviderVisibility(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(providerVisibilityPurchaseSchema)) payload: ProviderVisibilityPurchaseDto,
  ) {
    const actor = this.getActor(request);
    const headerKey = request.headers['x-idempotency-key'];
    const idempotencyKey = payload.idempotency_key
      ?? (Array.isArray(headerKey) ? headerKey[0] : headerKey)
      ?? request.requestId
      ?? `req-${Date.now()}`;
    return this.paymentCommandsService.purchaseProviderVisibility(actor, payload, idempotencyKey);
  }

  @Post('admin/escrows/:escrowId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.write')
  async updateAdminEscrowStatus(
    @Req() request: AuthenticatedRequest,
    @Param('escrowId') escrowId: string,
    @Body(new ZodValidationPipe(adminEscrowStatusSchema)) payload: AdminEscrowStatusDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.adminUpdateEscrowStatus(actor, escrowId, payload.status);
  }

  @Post('admin/payouts/:requestId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.write')
  async updateAdminPayoutStatus(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(adminPayoutStatusSchema)) payload: AdminPayoutStatusDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.adminUpdatePayoutStatus(actor, requestId, payload.status);
  }

  @Post('admin/transactions/:transactionId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.write')
  async updateAdminTransactionStatus(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @Body(new ZodValidationPipe(adminTransactionStatusSchema)) payload: AdminTransactionStatusDto,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.adminUpdateTransactionStatus(actor, transactionId, payload.status);
  }

  @Post('admin/transactions/:transactionId/refund')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.admin.write')
  async refundAdminTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
  ) {
    const actor = this.getActor(request);
    return this.paymentCommandsService.adminRefundTransaction(actor, transactionId, request.requestId ?? `req-${Date.now()}`);
  }

  @Post('dexpay/checkout')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.dexpay.write')
  async createDexPayCheckout(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(dexpayCheckoutSchema)) payload: DexPayCheckoutDto,
  ) {
    const actor = this.getActor(request);
    const checkout = await this.providerRegistry.getDexPay().createCheckout(payload);
    const transaction = await this.providerIntegrationService.recordDexPayCheckout({
      actorId: actor.id,
      direction: payload.direction,
      asset: payload.asset,
      chain: payload.chain,
      fiatAmount: payload.fiatAmount,
      quote: checkout.quote,
      order: checkout.order,
    });

    return {
      transaction,
      quote: checkout.quote,
      order: checkout.order,
    };
  }

  @Post('dexpay/orders/:orderId/sync')
  @UseGuards(PermissionGuard)
  @RequirePermission('payments.dexpay.write')
  async syncDexPayOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(dexpaySyncSchema)) payload: DexPaySyncDto,
  ) {
    const actor = this.getActor(request);
    return this.providerIntegrationService.syncDexPayOrderForActor({
      actorId: actor.id,
      providerReference: orderId,
      transactionId: payload.transactionId,
      source: 'user_sync',
      requestId: request.requestId ?? `req-${Date.now()}`,
    });
  }

  @Post('providers/dexpay/webhook')
  async handleDexPayWebhook(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(dexpayWebhookSchema)) payload: DexPayWebhookDto,
  ) {
    return this.providerIntegrationService.receiveDexPayWebhook({
      payload,
      rawBody: request.rawBody,
      headers: request.headers as Record<string, string | string[] | undefined>,
      requestId: request.requestId ?? `req-${Date.now()}`,
      ip: request.ip,
      userAgent: String(request.headers['user-agent'] ?? ''),
    });
  }

  @Post('admin/providers/dexpay/reconcile')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.write')
  async reconcileDexPay(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(dexpayReconcileSchema)) payload: DexPayReconcileDto,
  ) {
    const actor = this.getActor(request);
    return this.providerIntegrationService.runDexPayReconciliation(actor.id, payload);
  }

  @Get('admin/providers/dexpay/reconciliation-jobs')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.read')
  async getDexPayReconciliationJobs(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    this.getActor(request);
    return this.providerIntegrationReadService.listReconciliationJobs(Number(limit ?? 50) || 50);
  }

  @Get('admin/providers/dexpay/webhook-receipts')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.read')
  async getDexPayWebhookReceipts(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    this.getActor(request);
    return this.providerIntegrationReadService.listWebhookReceipts(Number(limit ?? 50) || 50, status?.trim() || undefined);
  }

  @Get('admin/providers/dexpay/transactions')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.read')
  async getDexPayProviderTransactions(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    this.getActor(request);
    return this.providerIntegrationReadService.listProviderTransactions(Number(limit ?? 50) || 50, status?.trim() || undefined);
  }

  @Get('admin/providers/dexpay/transactions/:providerReference/capabilities')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.read')
  async getDexPayProviderTransactionCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('providerReference') providerReference: string,
  ) {
    const actor = this.getActor(request);
    return this.financeStateMachineService.getProviderTransactionCapabilities(actor, providerReference);
  }

  @Get('admin/providers/dexpay/intents')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.read')
  async getDexPayPaymentIntents(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    this.getActor(request);
    return this.providerIntegrationReadService.listPaymentIntents(Number(limit ?? 50) || 50, status?.trim() || undefined);
  }

  @Get('admin/providers/dexpay/intents/:intentId/capabilities')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.read')
  async getDexPayPaymentIntentCapabilities(
    @Req() request: AuthenticatedRequest,
    @Param('intentId') intentId: string,
  ) {
    const actor = this.getActor(request);
    return this.financeStateMachineService.getPaymentIntentCapabilities(actor, intentId);
  }

  @Post('admin/providers/dexpay/webhook-receipts/:receiptId/reprocess')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.write')
  async reprocessDexPayWebhookReceipt(
    @Req() request: AuthenticatedRequest,
    @Param('receiptId') receiptId: string,
    @Body(new ZodValidationPipe(operatorActionSchema)) payload: OperatorActionDto,
  ) {
    const actor = this.getActor(request);
    return this.providerIntegrationService.reprocessDexPayWebhookReceipt({
      actorId: actor.id,
      receiptId,
      requestId: request.requestId ?? `req-${Date.now()}`,
      reason: payload.reason,
    });
  }

  @Post('admin/providers/dexpay/transactions/:providerReference/force-sync')
  @UseGuards(PermissionGuard)
  @RequirePermission('superadmin.sensitive.write')
  async forceSyncDexPayProviderTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('providerReference') providerReference: string,
    @Body(new ZodValidationPipe(operatorActionSchema)) payload: OperatorActionDto,
  ) {
    const actor = this.getActor(request);
    return this.providerIntegrationService.forceSyncDexPayProviderTransaction({
      actorId: actor.id,
      providerReference,
      requestId: request.requestId ?? `req-${Date.now()}`,
      reason: payload.reason,
    });
  }

  private getActor(request: AuthenticatedRequest) {
    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentification requise.');
    }
    return request.auth.user;
  }

  private resolveSubscriptionPlanRole(role: string | undefined, actorRole: string) {
    const explicitRole = role?.trim();
    if (explicitRole) {
      return explicitRole;
    }
    return PaymentsController.SUBSCRIPTION_PLAN_ROLES.has(actorRole) ? actorRole : undefined;
  }

}
