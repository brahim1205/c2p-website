import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CommissionLedgerEntry,
  EscrowCase,
  Invoice,
  PayoutAccount,
  PayoutRequest,
  SubscriptionPlan,
  UserSubscription,
  Wallet,
  WalletTransaction,
} from '@prisma/client';
import { listAppRows } from '../data/data.controller.js';
import type { Row } from '../data/mock-store.js';
import { PrismaService } from '../database/prisma.service.js';
import { resolvePaymentLifecycleStatus } from './payment-status.resolver.js';

type FinanceActor = { id: string; role: string };
const PUBLIC_PLAN_ROLE_VALUES = ['prestataire', 'formateur', 'porteur'] as const;
type PublicPlanRole = typeof PUBLIC_PLAN_ROLE_VALUES[number];

@Injectable()
export class FinanceReadService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeSubscriptionPlanRole(role?: string): PublicPlanRole | undefined {
    const normalized = role?.trim();
    if (!normalized) {
      return undefined;
    }
    if (PUBLIC_PLAN_ROLE_VALUES.includes(normalized as PublicPlanRole)) {
      return normalized as PublicPlanRole;
    }
    throw new BadRequestException('Role de plan invalide.');
  }

  async getTransactionById(actor: FinanceActor, transactionId: string) {
    if (!this.prisma.isConnected) {
      const row = this.getFinanceRowsFallback('payment_transactions', actor)
        .find((entry) => String(entry.id) === String(transactionId));
      return row ? this.mapLegacyTransaction(row) : null;
    }

    const row = await this.prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        ...(actor.role === 'admin' ? {} : { userId: actor.id }),
      },
    });
    return row ? this.mapTransaction(row) : null;
  }

  async getWallet(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.getWalletFallback(actor);
    }

    const [wallet, subscription] = await Promise.all([
      this.prisma.wallet.findFirst({ where: { userId: actor.id } }),
      this.prisma.userSubscription.findFirst({
        where: {
          userId: actor.id,
          status: { in: ['active', 'trialing', 'past_due'] },
        },
        orderBy: [{ renewsAt: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    if (!wallet) {
      return null;
    }

    const metadata = this.readMetadata(wallet.metadata);
    return {
      ...metadata,
      id: wallet.id,
      user_id: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
      available_balance: wallet.availableBalance,
      held_balance: wallet.heldBalance,
      pending_release_balance: wallet.pendingReleaseBalance,
      pending_payout_amount: wallet.pendingPayoutAmount,
      subscription_status: subscription?.status ?? metadata.subscription_status ?? null,
      subscription_plan_name: subscription?.planName ?? metadata.subscription_plan_name ?? null,
      created_at: metadata.created_at ?? wallet.createdAt.toISOString(),
      updated_at: metadata.updated_at ?? wallet.updatedAt.toISOString(),
    };
  }

  async getTransactions(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.sortRows(this.getFinanceRowsFallback('payment_transactions', actor), 'date', 'desc')
        .map((row) => this.mapLegacyTransaction(row));
    }

    const rows = await this.prisma.walletTransaction.findMany({
      where: actor.role === 'admin' ? {} : { userId: actor.id },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.mapTransaction(row));
  }

  async getSubscriptionPlans(role?: string) {
    const normalizedRole = this.normalizeSubscriptionPlanRole(role);
    if (!this.prisma.isConnected) {
      const rows = listAppRows('subscription_plans')
        .filter((row) => Boolean(row.active ?? true))
        .filter((row) => !normalizedRole || String(row.role) === normalizedRole);
      return this.sortRows(rows, 'price_monthly', 'asc');
    }

    const rows = await this.prisma.subscriptionPlan.findMany({
      where: {
        active: true,
        ...(normalizedRole ? { role: normalizedRole } : {}),
      },
      orderBy: { priceMonthly: 'asc' },
    });
    return rows.map((row) => this.mapSubscriptionPlan(row));
  }

  async getProviderVisibilityProducts(actor: FinanceActor) {
    if (!new Set(['prestataire', 'admin']).has(actor.role)) {
      return [];
    }

    return this.sortRows(
      listAppRows('provider_visibility_products')
        .filter((row) => Boolean(row.active ?? true))
        .filter((row) => actor.role === 'admin' || String(row.role ?? '') === 'prestataire'),
      'price',
      'asc',
    ).map((row) => this.mapProviderVisibilityProduct(row));
  }

  async getProviderVisibilityOrders(actor: FinanceActor) {
    const rows = actor.role === 'admin'
      ? listAppRows('provider_visibility_orders')
      : listAppRows('provider_visibility_orders').filter((row) => String(row.user_id ?? '') === String(actor.id));

    return this.sortRows(rows, 'purchased_at', 'desc').map((row) => this.mapProviderVisibilityOrder(row));
  }

  async getProviderVisibilityPasses(actor: FinanceActor) {
    const rows = actor.role === 'admin'
      ? listAppRows('provider_visibility_passes')
      : listAppRows('provider_visibility_passes').filter((row) => String(row.user_id ?? '') === String(actor.id));

    return this.sortRows(rows, 'issued_at', 'desc').map((row) => this.mapProviderVisibilityPass(row));
  }

  async getSubscriptions(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.sortRows(this.getFinanceRowsFallback('user_subscriptions', actor), 'renews_at', 'desc');
    }

    const rows = await this.prisma.userSubscription.findMany({
      where: { userId: actor.id },
      orderBy: [{ renewsAt: 'desc' }, { updatedAt: 'desc' }],
    });
    const planIds = [...new Set(rows.map((row) => row.planId).filter(Boolean))];
    const plans = planIds.length > 0
      ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } } })
      : [];
    const plansById = new Map(plans.map((plan) => [plan.id, this.mapSubscriptionPlan(plan)]));
    return rows.map((row) => this.mapUserSubscription(row, plansById.get(row.planId) ?? null));
  }

  async getSubscriptionById(actor: FinanceActor, subscriptionId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('user_subscriptions', actor)
        .find((entry) => String(entry.id) === String(subscriptionId)) ?? null;
    }

    const row = await this.prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        ...(actor.role === 'admin' ? {} : { userId: actor.id }),
      },
    });
    if (!row) return null;

    const plan = row.planId
      ? await this.prisma.subscriptionPlan.findUnique({ where: { id: row.planId } })
      : null;

    return this.mapUserSubscription(row, plan ? this.mapSubscriptionPlan(plan) : null);
  }

  async getEscrows(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.sortRows(this.getFinanceRowsFallback('escrow_cases', actor), 'booking_id', 'desc');
    }

    const where = actor.role === 'admin'
      ? {}
      : actor.role === 'client'
        ? { clientId: actor.id }
        : actor.role === 'prestataire'
          ? { providerUserId: actor.id }
          : { id: { in: [] as string[] } };

    const rows = await this.prisma.escrowCase.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { bookingId: 'desc' }],
    });
    return rows.map((row) => this.mapEscrow(row));
  }

  async getEscrowById(actor: FinanceActor, escrowId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('escrow_cases', actor)
        .find((entry) => String(entry.id) === String(escrowId)) ?? null;
    }

    const where = actor.role === 'admin'
      ? { id: escrowId }
      : actor.role === 'client'
        ? { id: escrowId, clientId: actor.id }
        : actor.role === 'prestataire'
          ? { id: escrowId, providerUserId: actor.id }
          : { id: '__forbidden__' };

    const row = await this.prisma.escrowCase.findFirst({ where });
    return row ? this.mapEscrow(row) : null;
  }

  async getCommissions(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.sortRows(this.getFinanceRowsFallback('commission_ledger', actor), 'recognized_at', 'desc');
    }

    const where = actor.role === 'admin'
      ? {}
      : new Set(['prestataire', 'formateur', 'porteur']).has(actor.role)
        ? { userId: actor.id }
        : { id: { in: [] as string[] } };

    const rows = await this.prisma.commissionLedgerEntry.findMany({
      where,
      orderBy: [{ recognizedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.mapCommission(row));
  }

  async getPayoutAccounts(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.sortRows(this.getFinanceRowsFallback('payout_accounts', actor), 'updated_at', 'desc');
    }

    const rows = await this.prisma.payoutAccount.findMany({
      where: actor.role === 'admin' ? {} : { userId: actor.id },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.mapPayoutAccount(row));
  }

  async getPayoutRequests(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.sortRows(this.getFinanceRowsFallback('payout_requests', actor), 'requested_at', 'desc');
    }

    const rows = await this.prisma.payoutRequest.findMany({
      where: actor.role === 'admin' ? {} : { userId: actor.id },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.mapPayoutRequest(row));
  }

  async getPayoutRequestById(actor: FinanceActor, requestId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('payout_requests', actor)
        .find((entry) => String(entry.id) === String(requestId)) ?? null;
    }

    const row = await this.prisma.payoutRequest.findFirst({
      where: {
        id: requestId,
        ...(actor.role === 'admin' ? {} : { userId: actor.id }),
      },
    });
    return row ? this.mapPayoutRequest(row) : null;
  }

  async getInvoices(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return this.sortRows(this.getFinanceRowsFallback('invoices', actor), 'issueDate', 'desc');
    }

    const rows = await this.prisma.invoice.findMany({
      where: actor.role === 'admin' ? {} : { userId: actor.id },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.mapInvoice(row));
  }

  async getInvoiceById(actor: FinanceActor, invoiceId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('invoices', actor)
        .find((entry) => String(entry.id) === String(invoiceId)) ?? null;
    }

    const row = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(actor.role === 'admin' ? {} : { userId: actor.id }),
      },
    });
    return row ? this.mapInvoice(row) : null;
  }

  async getAdminOverview() {
    if (!this.prisma.isConnected) {
      return {
        transactions: this.sortRows(listAppRows('payment_transactions'), 'date', 'desc').map((row) => this.mapLegacyTransaction(row)),
        escrowCases: this.sortRows(listAppRows('escrow_cases'), 'booking_id', 'desc'),
        payoutRequests: this.sortRows(listAppRows('payout_requests'), 'requested_at', 'desc'),
        subscriptions: this.sortRows(listAppRows('user_subscriptions'), 'renews_at', 'desc'),
        commissionEntries: this.sortRows(listAppRows('commission_ledger'), 'recognized_at', 'desc'),
        invoices: this.sortRows(listAppRows('invoices'), 'issueDate', 'desc'),
      };
    }

    const [transactions, escrowCases, payoutRequests, subscriptions, commissionEntries, invoices] = await Promise.all([
      this.prisma.walletTransaction.findMany({ orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.escrowCase.findMany({ orderBy: [{ createdAt: 'desc' }, { bookingId: 'desc' }] }),
      this.prisma.payoutRequest.findMany({ orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.userSubscription.findMany({ orderBy: [{ renewsAt: 'desc' }, { updatedAt: 'desc' }] }),
      this.prisma.commissionLedgerEntry.findMany({ orderBy: [{ recognizedAt: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.invoice.findMany({ orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }] }),
    ]);

    const planIds = [...new Set(subscriptions.map((row) => row.planId).filter(Boolean))];
    const plans = planIds.length > 0
      ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } } })
      : [];
    const plansById = new Map(plans.map((plan) => [plan.id, this.mapSubscriptionPlan(plan)]));

    return {
      transactions: transactions.map((row) => this.mapTransaction(row)),
      escrowCases: escrowCases.map((row) => this.mapEscrow(row)),
      payoutRequests: payoutRequests.map((row) => this.mapPayoutRequest(row)),
      subscriptions: subscriptions.map((row) => this.mapUserSubscription(row, plansById.get(row.planId) ?? null)),
      commissionEntries: commissionEntries.map((row) => this.mapCommission(row)),
      invoices: invoices.map((row) => this.mapInvoice(row)),
    };
  }

  private getWalletFallback(actor: FinanceActor) {
    return listAppRows('wallet_accounts').find((row) => String(row.user_id) === actor.id) ?? null;
  }

  private getFinanceRowsFallback(table: string, actor: FinanceActor) {
    if (actor.role === 'admin') {
      return listAppRows(table);
    }

    switch (table) {
      case 'payment_transactions':
      case 'wallet_accounts':
      case 'invoices':
      case 'payout_accounts':
      case 'payout_requests':
      case 'user_subscriptions':
        return listAppRows(table).filter((row) => String(row.user_id) === actor.id);
      case 'subscription_plans':
        return listAppRows(table).filter((row) => Boolean(row.active ?? true));
      case 'escrow_cases':
        if (actor.role === 'client') return listAppRows(table).filter((row) => String(row.client_id) === actor.id);
        if (actor.role === 'prestataire') return listAppRows(table).filter((row) => String(row.provider_user_id) === actor.id);
        return [];
      case 'commission_ledger':
        if (new Set(['prestataire', 'formateur', 'porteur']).has(actor.role)) {
          return listAppRows(table).filter((row) => String(row.user_id) === actor.id);
        }
        return [];
      default:
        return [];
    }
  }

  private mapTransaction(row: WalletTransaction) {
    const metadata = this.readMetadata(row.metadata);
    const lifecycleStatus = resolvePaymentLifecycleStatus({
      type: row.type,
      status: row.status,
      providerStatus: metadata.provider_status,
      settledToWallet: Boolean(metadata.settled_to_wallet),
    });
    return {
      ...metadata,
      id: row.id,
      user_id: row.userId ?? metadata.user_id ?? undefined,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      method: row.method ?? metadata.method ?? 'wallet',
      status: row.status,
      description: row.description ?? metadata.description ?? '',
      date: metadata.date ?? row.occurredAt.toISOString(),
      reference: row.reference ?? metadata.reference ?? row.id,
      lifecycle_status: lifecycleStatus,
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
    };
  }

  private mapLegacyTransaction(row: Row) {
    return {
      ...row,
      lifecycle_status: resolvePaymentLifecycleStatus({
        type: typeof row.type === 'string' ? row.type : null,
        status: typeof row.status === 'string' ? row.status : null,
        providerStatus: typeof row.provider_status === 'string' ? row.provider_status : null,
        settledToWallet: Boolean(row.settled_to_wallet),
      }),
    };
  }

  private mapSubscriptionPlan(row: SubscriptionPlan) {
    const metadata = this.readMetadata(row.metadata);
    return {
      ...metadata,
      id: row.id,
      role: row.role,
      name: row.name,
      slug: row.slug,
      price_monthly: row.priceMonthly,
      currency: row.currency,
      commission_rate: row.commissionRate,
      priority_matching: metadata.priority_matching ?? row.priorityMatching,
      analytics_level: row.analyticsLevel ?? metadata.analytics_level ?? null,
      support_level: row.supportLevel ?? metadata.support_level ?? null,
      verified_badge: row.verifiedBadge,
      features: Array.isArray(metadata.features) ? metadata.features : [],
      active: row.active,
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
      updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
    };
  }

  private mapProviderVisibilityProduct(row: Row) {
    return {
      ...row,
      id: String(row.id),
      role: String(row.role ?? 'prestataire'),
      name: String(row.name ?? 'Billet SenPresta'),
      slug: String(row.slug ?? ''),
      tier: String(row.tier ?? 'standard'),
      price: Number(row.price ?? 0),
      currency: String(row.currency ?? 'XAF'),
      duration_days: Number(row.duration_days ?? 30),
      matching_priority: String(row.matching_priority ?? 'low'),
      alerts_enabled: Boolean(row.alerts_enabled),
      verification_eligible: Boolean(row.verification_eligible),
      description: row.description ? String(row.description) : null,
      features: Array.isArray(row.features) ? row.features.map((item) => String(item)) : [],
      active: Boolean(row.active ?? true),
    };
  }

  private mapProviderVisibilityPass(row: Row) {
    const product = listAppRows('provider_visibility_products')
      .find((entry) => String(entry.id) === String(row.product_id ?? row.plan_id ?? ''));
    return {
      ...row,
      id: String(row.id),
      provider_id: row.provider_id ?? null,
      user_id: String(row.user_id ?? ''),
      product_id: row.product_id ? String(row.product_id) : null,
      product_name: row.product_name ? String(row.product_name) : product?.name ? String(product.name) : null,
      plan_id: row.plan_id ? String(row.plan_id) : null,
      plan_name: row.plan_name ? String(row.plan_name) : null,
      pass_tier: String(row.pass_tier ?? 'standard'),
      pass_label: String(row.pass_label ?? 'Billet standard'),
      code: String(row.code ?? ''),
      status: String(row.status ?? 'active'),
      issued_at: String(row.issued_at ?? ''),
      expires_at: row.expires_at ? String(row.expires_at) : null,
      alerts_enabled: Boolean(row.alerts_enabled),
      verification_eligible: Boolean(row.verification_eligible),
      matching_priority: String(row.matching_priority ?? 'low'),
      source_type: row.source_type ? String(row.source_type) : null,
      source_id: row.source_id ? String(row.source_id) : null,
    };
  }

  private mapProviderVisibilityOrder(row: Row) {
    const product = listAppRows('provider_visibility_products')
      .find((entry) => String(entry.id) === String(row.product_id ?? ''));
    const pass = listAppRows('provider_visibility_passes')
      .find((entry) => String(entry.id) === String(row.pass_id ?? ''));
    return {
      ...row,
      id: String(row.id),
      provider_id: row.provider_id ?? null,
      user_id: String(row.user_id ?? ''),
      product_id: row.product_id ? String(row.product_id) : null,
      product_name: row.product_name ? String(row.product_name) : product?.name ? String(product.name) : null,
      amount: Number(row.amount ?? product?.price ?? 0),
      currency: String(row.currency ?? product?.currency ?? 'XAF'),
      status: String(row.status ?? 'completed'),
      purchased_at: String(row.purchased_at ?? row.created_at ?? ''),
      financial_operation_id: row.financial_operation_id ? String(row.financial_operation_id) : null,
      transaction_id: row.transaction_id ? String(row.transaction_id) : null,
      pass_id: row.pass_id ? String(row.pass_id) : pass?.id ? String(pass.id) : null,
      pass_tier: String(row.pass_tier ?? pass?.pass_tier ?? product?.tier ?? 'standard'),
      pass_label: row.pass_label ? String(row.pass_label) : pass?.pass_label ? String(pass.pass_label) : null,
      pass_code: row.pass_code ? String(row.pass_code) : pass?.code ? String(pass.code) : null,
      expires_at: row.expires_at ? String(row.expires_at) : pass?.expires_at ? String(pass.expires_at) : null,
    };
  }

  private mapUserSubscription(row: UserSubscription, plan: Record<string, unknown> | null) {
    const metadata = this.readMetadata(row.metadata);
    const renewsAt = row.renewsAt ?? this.asDate(metadata.renews_at);
    const now = Date.now();
    const daysRemaining = renewsAt ? Math.ceil((renewsAt.getTime() - now) / (24 * 60 * 60 * 1000)) : null;
    return {
      ...metadata,
      id: row.id,
      user_id: row.userId,
      role: row.role,
      plan_id: row.planId,
      plan_name: row.planName,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      commission_rate: row.commissionRate,
      auto_renew: row.autoRenew,
      started_at: row.startedAt?.toISOString() ?? metadata.started_at ?? null,
      renews_at: renewsAt?.toISOString() ?? null,
      last_billed_at: row.lastBilledAt?.toISOString() ?? metadata.last_billed_at ?? null,
      days_remaining: daysRemaining,
      is_expiring_soon: daysRemaining !== null ? daysRemaining <= 7 : false,
      plan,
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
      updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
    };
  }

  private mapEscrow(row: EscrowCase) {
    const metadata = this.readMetadata(row.metadata);
    return {
      ...metadata,
      id: row.id,
      booking_id: row.bookingId ?? metadata.booking_id ?? null,
      client_id: row.clientId ?? metadata.client_id ?? null,
      provider_id: row.providerId ?? metadata.provider_id ?? null,
      provider_user_id: row.providerUserId ?? metadata.provider_user_id ?? null,
      requested_provider_id: row.requestedProviderId ?? metadata.requested_provider_id ?? null,
      service: row.service ?? metadata.service ?? null,
      amount_total: row.amountTotal,
      currency: row.currency,
      platform_fee_amount: row.platformFeeAmount,
      provider_amount: row.providerAmount,
      status: row.status,
      funded_at: row.fundedAt?.toISOString() ?? metadata.funded_at ?? null,
      released_at: row.releasedAt?.toISOString() ?? metadata.released_at ?? null,
      refunded_at: row.refundedAt?.toISOString() ?? metadata.refunded_at ?? null,
      note: row.note ?? metadata.note ?? null,
      payment_transaction_id: row.paymentTransactionId ?? metadata.payment_transaction_id ?? null,
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
      updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
    };
  }

  private mapCommission(row: CommissionLedgerEntry) {
    const metadata = this.readMetadata(row.metadata);
    return {
      ...metadata,
      id: row.id,
      source_type: row.sourceType ?? metadata.source_type ?? null,
      source_id: row.sourceId ?? metadata.source_id ?? null,
      user_id: row.userId ?? metadata.user_id ?? null,
      beneficiary_user_id: row.beneficiaryUserId ?? metadata.beneficiary_user_id ?? null,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      description: row.description ?? metadata.description ?? '',
      recognized_at: row.recognizedAt?.toISOString() ?? metadata.recognized_at ?? null,
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
    };
  }

  private mapPayoutAccount(row: PayoutAccount) {
    const metadata = this.readMetadata(row.metadata);
    return {
      ...metadata,
      id: row.id,
      user_id: row.userId,
      method: row.method,
      account_name: row.accountName ?? metadata.account_name ?? '',
      account_identifier: row.accountIdentifier ?? metadata.account_identifier ?? '',
      label: row.label ?? metadata.label ?? '',
      is_default: row.isDefault,
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
      updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
    };
  }

  private mapPayoutRequest(row: PayoutRequest) {
    const metadata = this.readMetadata(row.metadata);
    return {
      ...metadata,
      id: row.id,
      user_id: row.userId,
      amount: row.amount,
      currency: row.currency,
      method: row.method,
      account_id: row.accountId ?? metadata.account_id ?? null,
      status: row.status,
      note: row.note ?? metadata.note ?? null,
      requested_at: row.requestedAt?.toISOString() ?? metadata.requested_at ?? row.createdAt.toISOString(),
      processed_at: row.processedAt?.toISOString() ?? metadata.processed_at ?? null,
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
      updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
    };
  }

  private mapInvoice(row: Invoice) {
    const metadata = this.readMetadata(row.metadata);
    return {
      ...metadata,
      id: row.id,
      user_id: row.userId ?? metadata.user_id ?? null,
      number: row.number ?? metadata.number ?? row.id,
      type: row.type ?? metadata.type ?? 'prestation',
      description: row.description ?? metadata.description ?? '',
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      issueDate: row.issueDate?.toISOString() ?? metadata.issueDate ?? metadata.issue_date ?? row.createdAt.toISOString(),
      dueDate: row.dueDate?.toISOString() ?? metadata.dueDate ?? metadata.due_date ?? row.createdAt.toISOString(),
      paidDate: row.paidDate?.toISOString() ?? metadata.paidDate ?? metadata.paid_date ?? null,
      recipient: metadata.recipient ?? row.recipient ?? { name: '', email: '' },
      items: Array.isArray(metadata.items) ? metadata.items : (Array.isArray(row.items) ? row.items : []),
      created_at: metadata.created_at ?? row.createdAt.toISOString(),
      updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
    };
  }

  private readMetadata(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, any>;
    }
    return value as Record<string, any>;
  }

  private asDate(value: unknown) {
    if (typeof value !== 'string') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private sortRows(rows: Row[], key: string, direction: 'asc' | 'desc' = 'asc') {
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];
      if (leftValue === rightValue) return 0;
      if (leftValue === undefined || leftValue === null) return 1;
      if (rightValue === undefined || rightValue === null) return -1;
      const leftDate = this.asDate(leftValue);
      const rightDate = this.asDate(rightValue);
      if (leftDate && rightDate) return (leftDate.getTime() - rightDate.getTime()) * multiplier;
      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return (leftNumber - rightNumber) * multiplier;
      }
      return String(leftValue).localeCompare(String(rightValue)) * multiplier;
    });
  }
}
