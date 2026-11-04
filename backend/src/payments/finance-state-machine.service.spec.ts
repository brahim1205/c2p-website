import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { FinanceStateMachineService } from './finance-state-machine.service.js';
import type { FinanceReadService } from './finance-read.service.js';
import type { PrismaService } from '../database/prisma.service.js';

function buildService(rows: {
  transaction?: Record<string, unknown>;
  escrow?: Record<string, unknown>;
  payout?: Record<string, unknown>;
  paymentIntent?: Record<string, unknown>;
}) {
  const financeRead = {
    getTransactionById: async () => rows.transaction ?? null,
    getEscrowById: async () => rows.escrow ?? null,
    getPayoutRequestById: async () => rows.payout ?? null,
    getSubscriptionById: async () => null,
    getInvoiceById: async () => null,
  } as unknown as FinanceReadService;
  const prisma = {
    isConnected: true,
    paymentIntent: { findUnique: async () => rows.paymentIntent ?? null },
    providerTransaction: { findFirst: async () => null },
  } as unknown as PrismaService;
  return new FinanceStateMachineService(financeRead, prisma);
}

const owner = { id: 'u-owner', role: 'client' };
const stranger = { id: 'u-other', role: 'client' };

describe('FinanceStateMachineService', () => {
  it('lets admin-like roles, including superadmin, refund a confirmed transaction', async () => {
    const service = buildService({ transaction: { id: 't1', user_id: owner.id, type: 'payment', status: 'completed' } });
    for (const role of ['admin', 'superadmin', 'finance_admin']) {
      const snapshot = await service.getCapabilities({ id: 'staff', role }, 'transaction', 't1');
      assert.equal(snapshot.actorScope, 'admin', role);
      assert.ok(snapshot.allowedActions.includes('refund_transaction'), role);
    }
  });

  it('gives the owner self scope without admin actions', async () => {
    const service = buildService({ transaction: { id: 't1', user_id: owner.id, type: 'payment', status: 'completed' } });
    const snapshot = await service.getCapabilities(owner, 'transaction', 't1');
    assert.equal(snapshot.actorScope, 'self');
    assert.ok(!snapshot.allowedActions.includes('refund_transaction'));
  });

  it('offers provider sync to the owner of a pending provider transaction', async () => {
    const service = buildService({ transaction: { id: 't1', user_id: owner.id, status: 'pending', provider_reference: 'DX-1' } });
    const snapshot = await service.getCapabilities(owner, 'transaction', 't1');
    assert.ok(snapshot.allowedActions.includes('sync_provider'));
    assert.ok(!snapshot.allowedActions.includes('force_sync_provider'));
  });

  it('never offers a refund on a negated provider status (regression)', async () => {
    const service = buildService({ transaction: { id: 't1', user_id: owner.id, status: 'pending', provider_status: 'UNCONFIRMED' } });
    const snapshot = await service.getCapabilities({ id: 'staff', role: 'admin' }, 'transaction', 't1');
    assert.notEqual(snapshot.currentState, 'confirmed');
    assert.ok(!snapshot.allowedActions.includes('refund_transaction'));
  });

  it('gives external scope to other users', async () => {
    const service = buildService({ escrow: { id: 'e1', client_id: owner.id, status: 'funded' } });
    const snapshot = await service.getCapabilities(stranger, 'escrow', 'e1');
    assert.equal(snapshot.actorScope, 'external');
    assert.deepEqual(snapshot.allowedActions, ['view', 'open_financial_context']);
  });

  it('only lets admins release or refund an escrow, and never a terminal one', async () => {
    const funded = buildService({ escrow: { id: 'e1', client_id: owner.id, status: 'funded' } });
    const adminSnapshot = await funded.getCapabilities({ id: 'staff', role: 'superadmin' }, 'escrow', 'e1');
    assert.ok(adminSnapshot.allowedActions.includes('release_escrow'));
    assert.ok(adminSnapshot.allowedActions.includes('refund_escrow'));

    const released = buildService({ escrow: { id: 'e1', client_id: owner.id, status: 'released' } });
    const terminal = await released.getCapabilities({ id: 'staff', role: 'admin' }, 'escrow', 'e1');
    assert.equal(terminal.finality, 'terminal');
    assert.ok(!terminal.allowedActions.includes('release_escrow'));
    assert.ok(!terminal.allowedActions.includes('refund_escrow'));
  });

  it('exposes payout actions according to the payout state', async () => {
    const pending = buildService({ payout: { id: 'p1', user_id: owner.id, status: 'pending' } });
    const pendingSnapshot = await pending.getCapabilities({ id: 'staff', role: 'admin' }, 'payout', 'p1');
    assert.ok(pendingSnapshot.allowedActions.includes('approve_payout'));
    assert.ok(!pendingSnapshot.allowedActions.includes('mark_payout_paid'));

    const approved = buildService({ payout: { id: 'p1', user_id: owner.id, status: 'approved' } });
    const approvedSnapshot = await approved.getCapabilities({ id: 'staff', role: 'admin' }, 'payout', 'p1');
    assert.ok(approvedSnapshot.allowedActions.includes('mark_payout_paid'));
  });

  it('restricts payment intent capabilities to admin-like roles, including superadmin', async () => {
    const service = buildService({ paymentIntent: { id: 'pi1', status: 'pending', provider: 'dexpay', userId: owner.id } });
    await assert.rejects(service.getCapabilities(owner, 'payment_intent', 'pi1'), NotFoundException);
    const snapshot = await service.getCapabilities({ id: 'staff', role: 'superadmin' }, 'payment_intent', 'pi1');
    assert.equal(snapshot.currentState, 'pending_provider');
    assert.ok(snapshot.allowedActions.includes('force_sync_provider'));
  });

  it('returns 404 for a missing entity', async () => {
    const service = buildService({});
    await assert.rejects(service.getCapabilities(owner, 'transaction', 'missing'), NotFoundException);
  });
});
