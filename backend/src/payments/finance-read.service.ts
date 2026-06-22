import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  FinanceLedgerEntry,
  SubscriptionPlan,
  Wallet,
} from '@prisma/client';
import { listAppRows } from '../data/data-app-store.js';
import type { Row } from '../data/mock-store.js';
import { PrismaService } from '../database/prisma.service.js';
import { isAdminRole } from '../auth/auth.store.js';
import {
  mapCommission,
  mapEscrow,
  mapFinanceLedgerEntry,
  mapInvoice,
  mapLegacyTransaction,
  mapPayoutAccount,
  mapPayoutRequest,
  mapProviderVisibilityOrder,
  mapProviderVisibilityPass,
  mapProviderVisibilityProduct,
  mapSubscriptionPlan,
  mapTransaction,
  mapUserSubscription,
  normalizeFinanceLimit,
  operationRequiresLedger,
  readFinanceMetadata,
  sortFinanceRows,
} from './finance-read.mappers.js';

type FinanceActor = { id: string; role: string };
const PUBLIC_PLAN_ROLE_VALUES = ['prestataire', 'formateur', 'porteur', 'partenaire'] as const;
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
      return row ? mapLegacyTransaction(row) : null;
    }

    const row = await this.prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        ...(isAdminRole(actor) ? {} : { userId: actor.id }),
      },
    });
    return row ? mapTransaction(row) : null;
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

    const metadata = readFinanceMetadata(wallet.metadata);
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
      return sortFinanceRows(this.getFinanceRowsFallback('payment_transactions', actor), 'date', 'desc')
        .map((row) => mapLegacyTransaction(row));
    }

    const rows = await this.prisma.walletTransaction.findMany({
      where: isAdminRole(actor) ? {} : { userId: actor.id },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => mapTransaction(row));
  }

  async getSubscriptionPlans(role?: string) {
    const normalizedRole = this.normalizeSubscriptionPlanRole(role);
    if (!this.prisma.isConnected) {
      const rows = listAppRows('subscription_plans')
        .filter((row) => Boolean(row.active ?? true))
        .filter((row) => !normalizedRole || String(row.role) === normalizedRole);
      return sortFinanceRows(rows, 'price_monthly', 'asc');
    }

    const rows = await this.prisma.subscriptionPlan.findMany({
      where: {
        active: true,
        ...(normalizedRole ? { role: normalizedRole } : {}),
      },
      orderBy: { priceMonthly: 'asc' },
    });
    return rows.map((row) => mapSubscriptionPlan(row));
  }

  async getProviderVisibilityProducts(actor: FinanceActor) {
    if (!new Set(['prestataire', 'admin']).has(actor.role)) {
      return [];
    }

    return sortFinanceRows(
      listAppRows('provider_visibility_products')
        .filter((row) => Boolean(row.active ?? true))
        .filter((row) => isAdminRole(actor) || String(row.role ?? '') === 'prestataire'),
      'price',
      'asc',
    ).map((row) => mapProviderVisibilityProduct(row));
  }

  async getProviderVisibilityOrders(actor: FinanceActor) {
    const rows = isAdminRole(actor)
      ? listAppRows('provider_visibility_orders')
      : listAppRows('provider_visibility_orders').filter((row) => String(row.user_id ?? '') === String(actor.id));

    return sortFinanceRows(rows, 'purchased_at', 'desc').map((row) => mapProviderVisibilityOrder(row));
  }

  async getProviderVisibilityPasses(actor: FinanceActor) {
    const rows = isAdminRole(actor)
      ? listAppRows('provider_visibility_passes')
      : listAppRows('provider_visibility_passes').filter((row) => String(row.user_id ?? '') === String(actor.id));

    return sortFinanceRows(rows, 'issued_at', 'desc').map((row) => mapProviderVisibilityPass(row));
  }

  async getSubscriptions(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return sortFinanceRows(this.getFinanceRowsFallback('user_subscriptions', actor), 'renews_at', 'desc');
    }

    const rows = await this.prisma.userSubscription.findMany({
      where: { userId: actor.id },
      orderBy: [{ renewsAt: 'desc' }, { updatedAt: 'desc' }],
    });
    const planIds = [...new Set(rows.map((row) => row.planId).filter(Boolean))];
    const plans = planIds.length > 0
      ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } } })
      : [];
    const plansById = new Map(plans.map((plan) => [plan.id, mapSubscriptionPlan(plan)]));
    return rows.map((row) => mapUserSubscription(row, plansById.get(row.planId) ?? null));
  }

  async getSubscriptionById(actor: FinanceActor, subscriptionId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('user_subscriptions', actor)
        .find((entry) => String(entry.id) === String(subscriptionId)) ?? null;
    }

    const row = await this.prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        ...(isAdminRole(actor) ? {} : { userId: actor.id }),
      },
    });
    if (!row) return null;

    const plan = row.planId
      ? await this.prisma.subscriptionPlan.findUnique({ where: { id: row.planId } })
      : null;

    return mapUserSubscription(row, plan ? mapSubscriptionPlan(plan) : null);
  }

  async getEscrows(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return sortFinanceRows(this.getFinanceRowsFallback('escrow_cases', actor), 'booking_id', 'desc');
    }

    const where = isAdminRole(actor)
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
    return rows.map((row) => mapEscrow(row));
  }

  async getEscrowById(actor: FinanceActor, escrowId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('escrow_cases', actor)
        .find((entry) => String(entry.id) === String(escrowId)) ?? null;
    }

    const where = isAdminRole(actor)
      ? { id: escrowId }
      : actor.role === 'client'
        ? { id: escrowId, clientId: actor.id }
        : actor.role === 'prestataire'
          ? { id: escrowId, providerUserId: actor.id }
          : { id: '__forbidden__' };

    const row = await this.prisma.escrowCase.findFirst({ where });
    return row ? mapEscrow(row) : null;
  }

  async getCommissions(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return sortFinanceRows(this.getFinanceRowsFallback('commission_ledger', actor), 'recognized_at', 'desc');
    }

    const where = isAdminRole(actor)
      ? {}
      : new Set(['prestataire', 'formateur', 'porteur']).has(actor.role)
        ? { userId: actor.id }
        : { id: { in: [] as string[] } };

    const rows = await this.prisma.commissionLedgerEntry.findMany({
      where,
      orderBy: [{ recognizedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => mapCommission(row));
  }

  async getPayoutAccounts(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return sortFinanceRows(this.getFinanceRowsFallback('payout_accounts', actor), 'updated_at', 'desc');
    }

    const rows = await this.prisma.payoutAccount.findMany({
      where: isAdminRole(actor) ? {} : { userId: actor.id },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => mapPayoutAccount(row));
  }

  async getPayoutRequests(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return sortFinanceRows(this.getFinanceRowsFallback('payout_requests', actor), 'requested_at', 'desc');
    }

    const rows = await this.prisma.payoutRequest.findMany({
      where: isAdminRole(actor) ? {} : { userId: actor.id },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => mapPayoutRequest(row));
  }

  async getPayoutRequestById(actor: FinanceActor, requestId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('payout_requests', actor)
        .find((entry) => String(entry.id) === String(requestId)) ?? null;
    }

    const row = await this.prisma.payoutRequest.findFirst({
      where: {
        id: requestId,
        ...(isAdminRole(actor) ? {} : { userId: actor.id }),
      },
    });
    return row ? mapPayoutRequest(row) : null;
  }

  async getInvoices(actor: FinanceActor) {
    if (!this.prisma.isConnected) {
      return sortFinanceRows(this.getFinanceRowsFallback('invoices', actor), 'issueDate', 'desc');
    }

    const rows = await this.prisma.invoice.findMany({
      where: isAdminRole(actor) ? {} : { userId: actor.id },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => mapInvoice(row));
  }

  async getInvoiceById(actor: FinanceActor, invoiceId: string) {
    if (!this.prisma.isConnected) {
      return this.getFinanceRowsFallback('invoices', actor)
        .find((entry) => String(entry.id) === String(invoiceId)) ?? null;
    }

    const row = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(isAdminRole(actor) ? {} : { userId: actor.id }),
      },
    });
    return row ? mapInvoice(row) : null;
  }

  async getAdminOverview() {
    if (!this.prisma.isConnected) {
      return {
        transactions: sortFinanceRows(listAppRows('payment_transactions'), 'date', 'desc').map((row) => mapLegacyTransaction(row)),
        escrowCases: sortFinanceRows(listAppRows('escrow_cases'), 'booking_id', 'desc'),
        payoutRequests: sortFinanceRows(listAppRows('payout_requests'), 'requested_at', 'desc'),
        subscriptions: sortFinanceRows(listAppRows('user_subscriptions'), 'renews_at', 'desc'),
        commissionEntries: sortFinanceRows(listAppRows('commission_ledger'), 'recognized_at', 'desc'),
        invoices: sortFinanceRows(listAppRows('invoices'), 'issueDate', 'desc'),
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
    const plansById = new Map(plans.map((plan) => [plan.id, mapSubscriptionPlan(plan)]));

    return {
      transactions: transactions.map((row) => mapTransaction(row)),
      escrowCases: escrowCases.map((row) => mapEscrow(row)),
      payoutRequests: payoutRequests.map((row) => mapPayoutRequest(row)),
      subscriptions: subscriptions.map((row) => mapUserSubscription(row, plansById.get(row.planId) ?? null)),
      commissionEntries: commissionEntries.map((row) => mapCommission(row)),
      invoices: invoices.map((row) => mapInvoice(row)),
    };
  }

  async getAdminLedgerEntries(limit = 200) {
    if (!this.prisma.isConnected) {
      return [];
    }

    const rows = await this.prisma.financeLedgerEntry.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: normalizeFinanceLimit(limit, 500),
    });
    return rows.map((row) => mapFinanceLedgerEntry(row));
  }

  async getAdminLedgerReconciliation() {
    if (!this.prisma.isConnected) {
      return {
        ok: false,
        skipped: 'database-disconnected',
        summary: {
          completedOperations: 0,
          ledgerEntries: 0,
          missingLedgerEntries: 0,
          orphanLedgerEntries: 0,
          duplicateLedgerOperations: 0,
          transactionMismatches: 0,
        },
        issues: {
          missingLedgerEntries: [],
          orphanLedgerEntries: [],
          duplicateLedgerOperations: [],
          transactionMismatches: [],
        },
      };
    }

    const [completedOperations, ledgerEntries, transactions] = await Promise.all([
      this.prisma.financialOperation.findMany({
        where: { status: 'completed' },
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.financeLedgerEntry.findMany({ orderBy: [{ createdAt: 'desc' }] }),
      this.prisma.walletTransaction.findMany({ orderBy: [{ occurredAt: 'desc' }] }),
    ]);

    const operationsById = new Map(completedOperations.map((operation) => [operation.id, operation]));
    const transactionsById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
    const ledgerByOperation = new Map<string, FinanceLedgerEntry[]>();
    for (const entry of ledgerEntries) {
      const entries = ledgerByOperation.get(entry.financialOperationId) ?? [];
      entries.push(entry);
      ledgerByOperation.set(entry.financialOperationId, entries);
    }

    const missingLedgerEntries = completedOperations
      .filter((operation) => operationRequiresLedger(operation.amount))
      .filter((operation) => !ledgerByOperation.has(operation.id))
      .slice(0, 50)
      .map((operation) => ({
        financial_operation_id: operation.id,
        kind: operation.kind,
        amount: operation.amount,
        currency: operation.currency,
        completed_at: operation.completedAt?.toISOString() ?? null,
      }));

    const orphanLedgerEntries = ledgerEntries
      .filter((entry) => !operationsById.has(entry.financialOperationId))
      .slice(0, 50)
      .map((entry) => ({
        id: entry.id,
        financial_operation_id: entry.financialOperationId,
        entry_type: entry.entryType,
        amount: entry.amount,
        created_at: entry.createdAt.toISOString(),
      }));

    const duplicateLedgerOperations = [...ledgerByOperation.entries()]
      .filter(([, entries]) => entries.length > 1)
      .slice(0, 50)
      .map(([financialOperationId, entries]) => ({
        financial_operation_id: financialOperationId,
        entry_count: entries.length,
        ledger_entry_ids: entries.map((entry) => entry.id),
      }));

    const transactionMismatches = ledgerEntries
      .filter((entry) => Boolean(entry.transactionId))
      .filter((entry) => {
        const transaction = transactionsById.get(String(entry.transactionId));
        return !transaction || transaction.amount !== entry.amount || transaction.currency !== entry.currency;
      })
      .slice(0, 50)
      .map((entry) => {
        const transaction = entry.transactionId ? transactionsById.get(entry.transactionId) : null;
        return {
          ledger_entry_id: entry.id,
          transaction_id: entry.transactionId,
          ledger_amount: entry.amount,
          ledger_currency: entry.currency,
          transaction_amount: transaction?.amount ?? null,
          transaction_currency: transaction?.currency ?? null,
        };
      });

    const summary = {
      completedOperations: completedOperations.length,
      ledgerEntries: ledgerEntries.length,
      missingLedgerEntries: missingLedgerEntries.length,
      orphanLedgerEntries: orphanLedgerEntries.length,
      duplicateLedgerOperations: duplicateLedgerOperations.length,
      transactionMismatches: transactionMismatches.length,
    };

    return {
      ok: summary.missingLedgerEntries === 0
        && summary.orphanLedgerEntries === 0
        && summary.duplicateLedgerOperations === 0
        && summary.transactionMismatches === 0,
      summary,
      issues: {
        missingLedgerEntries,
        orphanLedgerEntries,
        duplicateLedgerOperations,
        transactionMismatches,
      },
    };
  }

  private getWalletFallback(actor: FinanceActor) {
    return listAppRows('wallet_accounts').find((row) => String(row.user_id) === actor.id) ?? null;
  }

  private getFinanceRowsFallback(table: string, actor: FinanceActor) {
    if (isAdminRole(actor)) {
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

}
