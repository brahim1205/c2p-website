import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ChargeSubscriptionInput } from './wallet.types.js';
import {
  resolveWalletCurrency,
  walletDate,
  walletJson,
  walletRecord,
} from './wallet.helpers.js';

export async function markEscrowReleased(
  tx: Prisma.TransactionClient,
  escrowId: string,
  operationId: string,
) {
  const escrow = await tx.escrowCase.findUnique({ where: { id: escrowId } });
  if (!escrow) {
    return;
  }

  if (escrow.status === 'released') {
    return;
  }

  const allowedStatuses = ['funded', 'assigned', 'in_progress', 'delivery_review'];
  const updated = await tx.escrowCase.updateMany({
    where: {
      id: escrowId,
      status: { in: allowedStatuses },
    },
    data: {
      status: 'released',
      releasedAt: new Date(),
      metadata: walletJson({
        ...(walletRecord(escrow.metadata)),
        financial_operation_id: operationId,
        operation_kind: 'escrow_release',
      }),
    },
  });

  if (updated.count !== 1) {
    throw new ConflictException('Le sequestre a deja ete traite ou n est plus liberable.');
  }
}

export async function markEscrowRefunded(
  tx: Prisma.TransactionClient,
  escrowId: string,
  operationId: string,
) {
  const escrow = await tx.escrowCase.findUnique({ where: { id: escrowId } });
  if (!escrow) {
    return;
  }

  if (escrow.status === 'refunded') {
    return;
  }

  const allowedStatuses = ['funded', 'assigned', 'in_progress', 'delivery_review'];
  const updated = await tx.escrowCase.updateMany({
    where: {
      id: escrowId,
      status: { in: allowedStatuses },
    },
    data: {
      status: 'refunded',
      refundedAt: new Date(),
      metadata: walletJson({
        ...(walletRecord(escrow.metadata)),
        financial_operation_id: operationId,
        operation_kind: 'refund',
      }),
    },
  });

  if (updated.count !== 1) {
    throw new ConflictException('Le sequestre a deja ete rembourse ou n est plus remboursable.');
  }
}

export async function markPayoutPaid(
  tx: Prisma.TransactionClient,
  payoutRequestId: string,
  operationId: string,
) {
  const request = await tx.payoutRequest.findUnique({ where: { id: payoutRequestId } });
  if (!request) {
    return;
  }

  if (request.status === 'paid') {
    return;
  }

  const updated = await tx.payoutRequest.updateMany({
    where: {
      id: payoutRequestId,
      status: { in: ['approved', 'pending', 'processing'] },
    },
    data: {
      status: 'paid',
      processedAt: new Date(),
      metadata: walletJson({
        ...(walletRecord(request.metadata)),
        financial_operation_id: operationId,
        operation_kind: 'payout',
      }),
    },
  });

  if (updated.count !== 1) {
    throw new ConflictException('La demande de retrait a deja ete traitee ou n est plus payable.');
  }
}

export async function upsertSubscriptionChargeState(
  tx: Prisma.TransactionClient,
  params: ChargeSubscriptionInput,
  operationId: string,
) {
  const existing = await tx.userSubscription.findUnique({
    where: { id: String(params.sourceId) },
  });

  if (!existing) {
    await tx.userSubscription.create({
      data: {
        id: String(params.sourceId),
        userId: params.userId,
        role: String(params.role ?? 'unknown'),
        planId: String(params.planId ?? 'unknown-plan'),
        planName: params.planName,
        status: 'active',
        amount: params.amount,
        currency: resolveWalletCurrency(params.wallet.currency),
        commissionRate: Number(params.commissionRate ?? 0),
        autoRenew: Boolean(params.autoRenew ?? false),
        startedAt: walletDate(params.startedAt),
        renewsAt: walletDate(params.renewsAt),
        lastBilledAt: walletDate(params.lastBilledAt) ?? new Date(),
        source: 'native',
        metadata: walletJson({
          financial_operation_id: operationId,
          operation_kind: 'subscription_charge',
        }),
      },
    });
    return;
  }

  await tx.userSubscription.update({
    where: { id: existing.id },
    data: {
      status: 'active',
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      lastBilledAt: walletDate(params.lastBilledAt) ?? existing.lastBilledAt ?? new Date(),
      renewsAt: walletDate(params.renewsAt) ?? existing.renewsAt,
      metadata: walletJson({
        ...(walletRecord(existing.metadata)),
        financial_operation_id: operationId,
        operation_kind: 'subscription_charge',
      }),
    },
  });
}
