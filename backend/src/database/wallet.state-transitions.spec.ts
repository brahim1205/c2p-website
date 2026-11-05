import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  markEscrowRefunded,
  markEscrowReleased,
  markPayoutPaid,
} from './wallet.state-transitions.js';
import {
  assertPositiveWalletAmount,
  resolveWalletCurrency,
  resolveWalletLedgerDirection,
  walletAmount,
  walletDate,
  walletNullableInt,
  walletRecord,
} from './wallet.helpers.js';

type Row = { id: string; status: string; metadata?: unknown };

/**
 * Minimal in-memory stand-in for the Prisma transaction client.
 * `updateMany` honours the `status: { in: [...] }` guard like Postgres would,
 * which is what protects against double release / double payout.
 */
function fakeTx(table: 'escrowCase' | 'payoutRequest', rows: Row[]) {
  const store = new Map(rows.map((row) => [row.id, { ...row }]));
  const updates: Array<Record<string, unknown>> = [];
  const delegate = {
    findUnique: async ({ where }: { where: { id: string } }) => store.get(where.id) ?? null,
    updateMany: async ({ where, data }: { where: { id: string; status: { in: string[] } }; data: Record<string, unknown> }) => {
      const row = store.get(where.id);
      if (!row || !where.status.in.includes(row.status)) {
        return { count: 0 };
      }
      Object.assign(row, data);
      updates.push(data);
      return { count: 1 };
    },
  };
  return { tx: { [table]: delegate } as unknown as Prisma.TransactionClient, store, updates };
}

describe('markEscrowReleased', () => {
  it('releases a funded escrow and records the operation id', async () => {
    const { tx, store } = fakeTx('escrowCase', [{ id: 'e1', status: 'funded', metadata: { note: 'keep' } }]);
    await markEscrowReleased(tx, 'e1', 'op-1');
    const row = store.get('e1') as Row & { metadata: Record<string, unknown> };
    assert.equal(row.status, 'released');
    assert.deepEqual(row.metadata, { note: 'keep', financial_operation_id: 'op-1', operation_kind: 'escrow_release' });
  });

  it('is idempotent on an already released escrow', async () => {
    const { tx, updates } = fakeTx('escrowCase', [{ id: 'e1', status: 'released' }]);
    await markEscrowReleased(tx, 'e1', 'op-2');
    assert.equal(updates.length, 0);
  });

  it('refuses to release a refunded escrow', async () => {
    const { tx } = fakeTx('escrowCase', [{ id: 'e1', status: 'refunded' }]);
    await assert.rejects(markEscrowReleased(tx, 'e1', 'op-3'), ConflictException);
  });

  it('ignores a missing escrow', async () => {
    const { tx, updates } = fakeTx('escrowCase', []);
    await markEscrowReleased(tx, 'missing', 'op-4');
    assert.equal(updates.length, 0);
  });
});

describe('markEscrowRefunded', () => {
  it('refunds an escrow in progress', async () => {
    const { tx, store } = fakeTx('escrowCase', [{ id: 'e1', status: 'in_progress' }]);
    await markEscrowRefunded(tx, 'e1', 'op-1');
    assert.equal(store.get('e1')?.status, 'refunded');
  });

  it('refuses to refund a released escrow', async () => {
    const { tx } = fakeTx('escrowCase', [{ id: 'e1', status: 'released' }]);
    await assert.rejects(markEscrowRefunded(tx, 'e1', 'op-1'), ConflictException);
  });
});

describe('markPayoutPaid', () => {
  it('pays an approved payout', async () => {
    const { tx, store } = fakeTx('payoutRequest', [{ id: 'p1', status: 'approved' }]);
    await markPayoutPaid(tx, 'p1', 'op-1');
    assert.equal(store.get('p1')?.status, 'paid');
  });

  it('is idempotent on an already paid payout', async () => {
    const { tx, updates } = fakeTx('payoutRequest', [{ id: 'p1', status: 'paid' }]);
    await markPayoutPaid(tx, 'p1', 'op-1');
    assert.equal(updates.length, 0);
  });

  it('refuses to pay a rejected payout', async () => {
    const { tx } = fakeTx('payoutRequest', [{ id: 'p1', status: 'rejected' }]);
    await assert.rejects(markPayoutPaid(tx, 'p1', 'op-1'), ConflictException);
  });
});

describe('wallet helpers', () => {
  it('reject non positive or non finite amounts', () => {
    for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => assertPositiveWalletAmount(amount), BadRequestException);
    }
    assert.doesNotThrow(() => assertPositiveWalletAmount(1));
  });

  it('round amounts and default invalid ones to zero', () => {
    assert.equal(walletAmount('1500.6'), 1501);
    assert.equal(walletAmount('abc'), 0);
    assert.equal(walletNullableInt(''), undefined);
    assert.equal(walletNullableInt('12'), 12);
  });

  it('classify ledger directions', () => {
    for (const kind of ['wallet_topup', 'refund', 'escrow_release']) {
      assert.equal(resolveWalletLedgerDirection(kind), 'credit', kind);
    }
    for (const kind of ['payout', 'subscription_charge', 'escrow_funding']) {
      assert.equal(resolveWalletLedgerDirection(kind), 'debit', kind);
    }
  });

  it('default the currency to XAF', () => {
    assert.equal(resolveWalletCurrency(undefined), 'XAF');
    assert.equal(resolveWalletCurrency('  '), 'XAF');
    assert.equal(resolveWalletCurrency('XOF'), 'XOF');
  });

  it('parse dates defensively', () => {
    assert.equal(walletDate(undefined), undefined);
    assert.equal(walletDate('not a date'), undefined);
    assert.equal(walletDate('2026-01-02T00:00:00.000Z')?.toISOString(), '2026-01-02T00:00:00.000Z');
  });

  it('return a detached copy of metadata objects', () => {
    const source = { nested: { a: 1 } };
    const copy = walletRecord(source) as { nested: { a: number } };
    copy.nested.a = 2;
    assert.equal(source.nested.a, 1);
    assert.deepEqual(walletRecord(['array']), {});
    assert.deepEqual(walletRecord(null), {});
  });
});
