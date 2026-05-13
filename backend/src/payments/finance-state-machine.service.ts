import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentIntent, ProviderTransaction } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { FinanceReadService } from './finance-read.service.js';
import {
  FINANCE_CAPABILITY_CONTRACT_VERSION,
  FINANCE_CAPABILITY_MACHINE_VERSION,
  type FinanceCapabilityEntityRoute,
  validateFinanceCapabilitySnapshot,
} from './finance-capability-contract.js';
import {
  ESCROW_STATE_GRAPH,
  INVOICE_STATE_GRAPH,
  PAYMENT_INTENT_STATE_GRAPH,
  PAYOUT_STATE_GRAPH,
  SUBSCRIPTION_STATE_GRAPH,
  TRANSACTION_STATE_GRAPH,
  getFinanceTerminalStates,
  isTerminalFinanceState,
  normalizePaymentIntentState,
  resolveProviderLifecycleState,
} from './finance-domain-guards.js';
import {
  resolvePaymentLifecycleStatus,
} from './payment-status.resolver.js';

type FinanceActor = { id: string; role: string };
type ActorScope = 'admin' | 'self' | 'external';
type FinanceMachineKind =
  | 'transaction'
  | 'escrow'
  | 'payout'
  | 'subscription'
  | 'invoice'
  | 'provider_transaction'
  | 'payment_intent';

type FinanceRecord = Record<string, any>;

export interface FinanceStateMachineSnapshot {
  contractVersion: 1;
  machineVersion: 1;
  kind: FinanceMachineKind;
  id: string;
  actorScope: ActorScope;
  currentState: string;
  finality: 'mutable' | 'terminal';
  terminalStates: string[];
  allowedTransitions: string[];
  allowedActions: string[];
  transitionGraph: Record<string, string[]>;
  correlation: {
    financialOperationId?: string | null;
    providerReference?: string | null;
    paymentIntentId?: string | null;
    paymentTransactionId?: string | null;
    sourceType?: string | null;
    sourceId?: string | number | null;
    bookingId?: string | number | null;
    accountId?: string | null;
    invoiceNumber?: string | null;
  };
  metadata: Record<string, unknown>;
}

const ADMIN_ROLES = new Set(['admin', 'finance_admin', 'operator']);

@Injectable()
export class FinanceStateMachineService {
  constructor(
    private readonly financeReadService: FinanceReadService,
    private readonly prisma: PrismaService,
  ) {}

  async getTransactionCapabilities(actor: FinanceActor, transactionId: string) {
    const transaction = await this.financeReadService.getTransactionById(actor, transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction introuvable.');
    }
    return this.buildTransactionSnapshot(actor, transaction as FinanceRecord);
  }

  async getEscrowCapabilities(actor: FinanceActor, escrowId: string) {
    const escrow = await this.financeReadService.getEscrowById(actor, escrowId);
    if (!escrow) {
      throw new NotFoundException('Séquestre introuvable.');
    }
    return this.buildEscrowSnapshot(actor, escrow as FinanceRecord);
  }

  async getPayoutCapabilities(actor: FinanceActor, requestId: string) {
    const payout = await this.financeReadService.getPayoutRequestById(actor, requestId);
    if (!payout) {
      throw new NotFoundException('Retrait introuvable.');
    }
    return this.buildPayoutSnapshot(actor, payout as FinanceRecord);
  }

  async getSubscriptionCapabilities(actor: FinanceActor, subscriptionId: string) {
    const subscription = await this.financeReadService.getSubscriptionById(actor, subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Souscription introuvable.');
    }
    return this.buildSubscriptionSnapshot(actor, subscription as FinanceRecord);
  }

  async getInvoiceCapabilities(actor: FinanceActor, invoiceId: string) {
    const invoice = await this.financeReadService.getInvoiceById(actor, invoiceId);
    if (!invoice) {
      throw new NotFoundException('Facture introuvable.');
    }
    return this.buildInvoiceSnapshot(actor, invoice as FinanceRecord);
  }

  async getProviderTransactionCapabilities(actor: FinanceActor, providerReference: string) {
    this.assertAdminLike(actor);
    if (!this.prisma.isConnected) {
      throw new NotFoundException('Capabilities provider indisponibles sans Prisma.');
    }

    const row = await this.prisma.providerTransaction.findFirst({
      where: { providerReference },
    });
    if (!row) {
      throw new NotFoundException('Transaction provider introuvable.');
    }

    return this.buildProviderTransactionSnapshot(actor, row);
  }

  async getPaymentIntentCapabilities(actor: FinanceActor, paymentIntentId: string) {
    this.assertAdminLike(actor);
    if (!this.prisma.isConnected) {
      throw new NotFoundException('Capabilities payment intent indisponibles sans Prisma.');
    }

    const row = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });
    if (!row) {
      throw new NotFoundException('Payment intent introuvable.');
    }

    return this.buildPaymentIntentSnapshot(actor, row);
  }

  async getCapabilities(actor: FinanceActor, entity: FinanceCapabilityEntityRoute, entityId: string) {
    switch (entity) {
      case 'transaction':
        return this.getTransactionCapabilities(actor, entityId);
      case 'escrow':
        return this.getEscrowCapabilities(actor, entityId);
      case 'payout':
        return this.getPayoutCapabilities(actor, entityId);
      case 'subscription':
        return this.getSubscriptionCapabilities(actor, entityId);
      case 'invoice':
        return this.getInvoiceCapabilities(actor, entityId);
      case 'provider_transaction':
      case 'provider-transaction':
        return this.getProviderTransactionCapabilities(actor, entityId);
      case 'payment_intent':
      case 'payment-intent':
        return this.getPaymentIntentCapabilities(actor, entityId);
      default:
        throw new NotFoundException('Type de capability introuvable.');
    }
  }

  private buildTransactionSnapshot(actor: FinanceActor, transaction: FinanceRecord): FinanceStateMachineSnapshot {
    const state = resolvePaymentLifecycleStatus({
      type: transaction.type,
      status: transaction.status,
      providerStatus: transaction.provider_status,
      settledToWallet: Boolean(transaction.settled_to_wallet),
    });
    const providerBacked = Boolean(transaction.provider_reference || transaction.provider_order_id || transaction.provider_status);
    const actorScope = this.resolveActorScope(actor, typeof transaction.user_id === 'string' ? transaction.user_id : null);

    const allowedActions = [
      'view',
      'open_financial_context',
      'open_linked_invoices',
      ...(providerBacked && ['initiated', 'pending_provider', 'failed'].includes(state) && actorScope === 'self' ? ['sync_provider'] : []),
      ...(providerBacked && ['initiated', 'pending_provider', 'failed'].includes(state) && actorScope === 'admin' ? ['force_sync_provider'] : []),
      ...(actorScope === 'admin' && state === 'failed' ? ['retry_transaction'] : []),
      ...(actorScope === 'admin' && state === 'confirmed' && String(transaction.type || '').toLowerCase() !== 'refund' ? ['refund_transaction'] : []),
    ];

    return this.buildSnapshot({
      kind: 'transaction',
      id: String(transaction.id),
      actorScope,
      currentState: state,
      transitionGraph: TRANSACTION_STATE_GRAPH,
      allowedActions,
      correlation: {
        financialOperationId: this.stringOrNull(transaction.financial_operation_id),
        providerReference: this.stringOrNull(transaction.provider_reference ?? transaction.provider_order_id ?? transaction.reference),
        paymentIntentId: this.stringOrNull(transaction.payment_intent_id),
      },
      metadata: {
        providerBacked,
        transactionType: this.stringOrNull(transaction.type),
        rawStatus: this.stringOrNull(transaction.status),
        providerStatus: this.stringOrNull(transaction.provider_status),
      },
    });
  }

  private buildEscrowSnapshot(actor: FinanceActor, escrow: FinanceRecord): FinanceStateMachineSnapshot {
    const state = this.normalizeState(escrow.status, 'funded');
    const actorScope = this.resolveActorScope(
      actor,
      typeof escrow.client_id === 'string'
        ? escrow.client_id
        : typeof escrow.provider_user_id === 'string'
          ? escrow.provider_user_id
          : null,
    );

    const mutable = !isTerminalFinanceState(ESCROW_STATE_GRAPH, state);
    const allowedActions = [
      'view',
      'open_financial_context',
      ...(actorScope === 'admin' && mutable ? ['refund_escrow'] : []),
      ...(actorScope === 'admin' && ['funded', 'assigned', 'in_progress', 'delivery_review'].includes(state) ? ['release_escrow'] : []),
    ];

    return this.buildSnapshot({
      kind: 'escrow',
      id: String(escrow.id),
      actorScope,
      currentState: state,
      transitionGraph: ESCROW_STATE_GRAPH,
      allowedActions,
      correlation: {
        financialOperationId: this.stringOrNull(escrow.financial_operation_id),
        paymentTransactionId: this.stringOrNull(escrow.payment_transaction_id),
        bookingId: escrow.booking_id ?? null,
      },
      metadata: {
        rawStatus: this.stringOrNull(escrow.status),
      },
    });
  }

  private buildPayoutSnapshot(actor: FinanceActor, payout: FinanceRecord): FinanceStateMachineSnapshot {
    const state = this.normalizeState(payout.status, 'pending');
    const actorScope = this.resolveActorScope(actor, typeof payout.user_id === 'string' ? payout.user_id : null);
    const allowedActions = [
      'view',
      'open_financial_context',
      ...(actorScope === 'admin' && state === 'pending' ? ['approve_payout', 'reject_payout', 'cancel_payout'] : []),
      ...(actorScope === 'admin' && state === 'approved' ? ['mark_payout_paid', 'reject_payout'] : []),
    ];

    return this.buildSnapshot({
      kind: 'payout',
      id: String(payout.id),
      actorScope,
      currentState: state,
      transitionGraph: PAYOUT_STATE_GRAPH,
      allowedActions,
      correlation: {
        financialOperationId: this.stringOrNull(payout.financial_operation_id),
        accountId: this.stringOrNull(payout.account_id),
      },
      metadata: {
        method: this.stringOrNull(payout.method),
      },
    });
  }

  private buildSubscriptionSnapshot(actor: FinanceActor, subscription: FinanceRecord): FinanceStateMachineSnapshot {
    const state = this.normalizeState(subscription.status, 'trialing');
    const actorScope = this.resolveActorScope(actor, typeof subscription.user_id === 'string' ? subscription.user_id : null);
    const allowedActions = [
      'view',
      'open_financial_context',
      ...(actorScope !== 'external' && ['active', 'past_due', 'expired'].includes(state) ? ['renew_subscription'] : []),
      ...(actorScope !== 'external' && ['trialing', 'active', 'past_due'].includes(state) ? ['cancel_subscription'] : []),
    ];

    return this.buildSnapshot({
      kind: 'subscription',
      id: String(subscription.id),
      actorScope,
      currentState: state,
      transitionGraph: SUBSCRIPTION_STATE_GRAPH,
      allowedActions,
      correlation: {
        financialOperationId: this.stringOrNull(subscription.financial_operation_id),
        sourceId: this.stringOrNull(subscription.plan_id),
      },
      metadata: {
        autoRenew: Boolean(subscription.auto_renew),
        planName: this.stringOrNull(subscription.plan_name),
      },
    });
  }

  private buildInvoiceSnapshot(actor: FinanceActor, invoice: FinanceRecord): FinanceStateMachineSnapshot {
    const state = this.normalizeState(invoice.status, 'pending');
    const actorScope = this.resolveActorScope(actor, typeof invoice.user_id === 'string' ? invoice.user_id : null);
    const allowedActions = [
      'view',
      'download_invoice',
      'open_financial_context',
      'open_linked_transactions',
      ...(actorScope === 'admin' && state === 'pending' ? ['mark_invoice_paid', 'mark_invoice_cancelled'] : []),
      ...(actorScope === 'admin' && state === 'overdue' ? ['mark_invoice_paid', 'mark_invoice_cancelled'] : []),
    ];

    return this.buildSnapshot({
      kind: 'invoice',
      id: String(invoice.id),
      actorScope,
      currentState: state,
      transitionGraph: INVOICE_STATE_GRAPH,
      allowedActions,
      correlation: {
        financialOperationId: this.stringOrNull(invoice.financial_operation_id),
        sourceType: this.stringOrNull(invoice.source_type),
        sourceId: invoice.source_id ?? null,
        paymentTransactionId: this.stringOrNull(invoice.payment_transaction_id),
        invoiceNumber: this.stringOrNull(invoice.number),
      },
      metadata: {
        invoiceType: this.stringOrNull(invoice.type),
      },
    });
  }

  private buildProviderTransactionSnapshot(actor: FinanceActor, row: ProviderTransaction): FinanceStateMachineSnapshot {
    const metadata = this.readMetadata(row.metadata);
    const state = resolveProviderLifecycleState({
      status: row.providerStatus,
      providerStatus: row.providerStatus,
      settledToWallet: Boolean(metadata.settled_to_wallet),
    });

    return this.buildSnapshot({
      kind: 'provider_transaction',
      id: row.id,
      actorScope: this.resolveActorScope(actor, null),
      currentState: state,
      transitionGraph: TRANSACTION_STATE_GRAPH,
      allowedActions: [
        'view',
        'open_financial_context',
        ...(this.isAdminLike(actor) && ['initiated', 'pending_provider', 'failed'].includes(state) ? ['force_sync_provider'] : []),
      ],
      correlation: {
        providerReference: row.providerReference,
        paymentIntentId: row.paymentIntentId ?? null,
        financialOperationId: this.stringOrNull(metadata.financial_operation_id),
      },
      metadata: {
        provider: row.provider,
        providerStatus: row.providerStatus,
        direction: row.direction ?? null,
      },
    });
  }

  private buildPaymentIntentSnapshot(actor: FinanceActor, row: PaymentIntent): FinanceStateMachineSnapshot {
    const state = normalizePaymentIntentState(row.status);
    return this.buildSnapshot({
      kind: 'payment_intent',
      id: row.id,
      actorScope: this.resolveActorScope(actor, row.userId ?? null),
      currentState: state,
      transitionGraph: PAYMENT_INTENT_STATE_GRAPH,
      allowedActions: [
        'view',
        'open_financial_context',
        ...(this.isAdminLike(actor) && ['initiated', 'pending_provider', 'processing'].includes(state) ? ['force_sync_provider'] : []),
      ],
      correlation: {
        financialOperationId: row.financialOperationId ?? null,
        providerReference: row.providerIntentRef ?? null,
        sourceType: row.contextType ?? null,
        sourceId: row.contextId ?? null,
      },
      metadata: {
        provider: row.provider,
      },
    });
  }

  private buildSnapshot(args: {
    kind: FinanceMachineKind;
    id: string;
    actorScope: ActorScope;
    currentState: string;
    transitionGraph: Record<string, string[]>;
    allowedActions: string[];
    correlation: FinanceStateMachineSnapshot['correlation'];
    metadata: Record<string, unknown>;
  }): FinanceStateMachineSnapshot {
    const terminalStates = getFinanceTerminalStates(args.transitionGraph);
    const allowedTransitions = args.transitionGraph[args.currentState] ?? [];
    return validateFinanceCapabilitySnapshot({
      contractVersion: FINANCE_CAPABILITY_CONTRACT_VERSION,
      machineVersion: FINANCE_CAPABILITY_MACHINE_VERSION,
      kind: args.kind,
      id: args.id,
      actorScope: args.actorScope,
      currentState: args.currentState,
      finality: terminalStates.includes(args.currentState) ? 'terminal' : 'mutable',
      terminalStates,
      allowedTransitions,
      allowedActions: [...new Set(args.allowedActions)],
      transitionGraph: args.transitionGraph,
      correlation: args.correlation,
      metadata: args.metadata,
    }) as FinanceStateMachineSnapshot;
  }

  private resolveActorScope(actor: FinanceActor, ownerId: string | null): ActorScope {
    if (this.isAdminLike(actor)) {
      return 'admin';
    }
    if (ownerId && ownerId === actor.id) {
      return 'self';
    }
    return 'external';
  }

  private isAdminLike(actor: FinanceActor) {
    return ADMIN_ROLES.has(actor.role);
  }

  private assertAdminLike(actor: FinanceActor) {
    if (!this.isAdminLike(actor)) {
      throw new NotFoundException('Ressource réservée aux opérateurs C2P.');
    }
  }

  private normalizeState(value: unknown, fallback: string) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized.length > 0 ? normalized : fallback;
  }

  private readMetadata(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, any>;
    }
    return value as Record<string, any>;
  }

  private stringOrNull(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : null;
  }
}
