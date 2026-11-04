import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  FINANCE_TRANSITION_GRAPHS,
  assertFinanceTransition,
  assertPositivePayoutInvariant,
  assertRefundAmountInvariant,
  canReachFinanceState,
  getFinanceTerminalStates,
  isTerminalFinanceState,
  mapLifecycleStatusToTransactionStatus,
  normalizePaymentIntentState,
  resolveMonotonicFinanceTransition,
  resolveProviderLifecycleState,
} from './finance-domain-guards.js';

describe('finance transition graphs', () => {
  it('only point to states declared in the same graph', () => {
    for (const [kind, graph] of Object.entries(FINANCE_TRANSITION_GRAPHS)) {
      for (const [state, targets] of Object.entries(graph)) {
        for (const target of targets) {
          assert.ok(target in graph, `${kind}: ${state} -> ${target} targets an unknown state`);
        }
      }
    }
  });

  it('expose terminal states with no outgoing transition', () => {
    assert.deepEqual(getFinanceTerminalStates('payout').sort(), ['cancelled', 'paid', 'rejected']);
    assert.deepEqual(getFinanceTerminalStates('escrow').sort(), ['refunded', 'released']);
    assert.ok(isTerminalFinanceState('transaction', 'REFUNDED'));
    assert.ok(!isTerminalFinanceState('transaction', 'confirmed'));
  });

  it('compute reachability through intermediate states', () => {
    assert.ok(canReachFinanceState('transaction', 'initiated', 'reconciled'));
    assert.ok(!canReachFinanceState('transaction', 'reconciled', 'initiated'));
    assert.ok(!canReachFinanceState('transaction', 'initiated', 'does_not_exist'));
  });
});

describe('assertFinanceTransition', () => {
  it('accepts declared transitions and self transitions', () => {
    assert.doesNotThrow(() => assertFinanceTransition('payout', 'pending', 'approved'));
    assert.doesNotThrow(() => assertFinanceTransition('payout', 'APPROVED', ' paid '));
    assert.doesNotThrow(() => assertFinanceTransition('payout', 'paid', 'paid'));
  });

  it('rejects forbidden transitions with a conflict', () => {
    assert.throws(() => assertFinanceTransition('payout', 'paid', 'pending'), ConflictException);
    assert.throws(() => assertFinanceTransition('escrow', 'released', 'refunded'), ConflictException);
    assert.throws(() => assertFinanceTransition('payout', 'pending', 'paid'), ConflictException);
  });

  it('rejects unknown states as bad requests', () => {
    assert.throws(() => assertFinanceTransition('payout', 'ghost', 'paid'), BadRequestException);
    assert.throws(() => assertFinanceTransition('payout', 'pending', 'ghost'), BadRequestException);
  });
});

describe('resolveMonotonicFinanceTransition', () => {
  it('bootstraps from an unknown current state', () => {
    const result = resolveMonotonicFinanceTransition('transaction', undefined, 'pending_provider');
    assert.equal(result.decision, 'bootstrap');
    assert.equal(result.nextState, 'pending_provider');
  });

  it('is a noop when the state does not change', () => {
    const result = resolveMonotonicFinanceTransition('transaction', 'confirmed', 'CONFIRMED');
    assert.equal(result.decision, 'noop');
    assert.equal(result.changed, false);
  });

  it('advances directly and through reachable states', () => {
    assert.equal(resolveMonotonicFinanceTransition('transaction', 'initiated', 'pending_provider').decision, 'advance');
    const jump = resolveMonotonicFinanceTransition('transaction', 'initiated', 'reconciled');
    assert.equal(jump.decision, 'advance_reachable');
    assert.equal(jump.nextState, 'reconciled');
  });

  it('never leaves a terminal state when a late webhook arrives', () => {
    const result = resolveMonotonicFinanceTransition('transaction', 'refunded', 'pending_provider');
    assert.equal(result.decision, 'preserve_terminal');
    assert.equal(result.nextState, 'refunded');
    assert.equal(result.changed, false);
  });

  it('flags two different terminal states as a conflict', () => {
    const result = resolveMonotonicFinanceTransition('escrow', 'released', 'refunded');
    assert.equal(result.decision, 'preserve_terminal');
    assert.equal(result.conflict, true);
  });

  it('preserves the current state on regression', () => {
    const result = resolveMonotonicFinanceTransition('transaction', 'confirmed', 'processing');
    assert.equal(result.decision, 'preserve_regression');
    assert.equal(result.nextState, 'confirmed');
  });

  it('treats a retry loop (failed -> pending_provider) as a conflict, not a silent advance', () => {
    const result = resolveMonotonicFinanceTransition('transaction', 'processing', 'pending_provider');
    assert.equal(result.decision, 'preserve_conflict');
    assert.equal(result.nextState, 'processing');
  });

  it('rejects an unknown target state', () => {
    assert.throws(() => resolveMonotonicFinanceTransition('transaction', 'initiated', 'ghost'), BadRequestException);
  });
});

describe('assertRefundAmountInvariant', () => {
  it('accepts a refund within the settled amount', () => {
    assert.doesNotThrow(() => assertRefundAmountInvariant({ requestedAmount: 500, settledAmount: 1000, alreadyRefundedAmount: 500 }));
  });

  it('rejects a refund above the settled amount, including previous refunds', () => {
    assert.throws(() => assertRefundAmountInvariant({ requestedAmount: 1001, settledAmount: 1000 }), ConflictException);
    assert.throws(() => assertRefundAmountInvariant({ requestedAmount: 600, settledAmount: 1000, alreadyRefundedAmount: 500 }), ConflictException);
  });

  it('rejects invalid amounts', () => {
    for (const requestedAmount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => assertRefundAmountInvariant({ requestedAmount, settledAmount: 1000 }), BadRequestException);
    }
    assert.throws(() => assertRefundAmountInvariant({ requestedAmount: 10, settledAmount: 0 }), ConflictException);
  });
});

describe('assertPositivePayoutInvariant', () => {
  it('requires a positive amount and a legal transition', () => {
    assert.doesNotThrow(() => assertPositivePayoutInvariant({ amount: 100, currentStatus: 'approved', targetStatus: 'paid' }));
    assert.throws(() => assertPositivePayoutInvariant({ amount: 0, currentStatus: 'approved', targetStatus: 'paid' }), BadRequestException);
    assert.throws(() => assertPositivePayoutInvariant({ amount: 100, currentStatus: 'rejected', targetStatus: 'paid' }), ConflictException);
  });
});

describe('status normalizers', () => {
  it('normalize payment intent states', () => {
    assert.equal(normalizePaymentIntentState('COMPLETED'), 'confirmed');
    assert.equal(normalizePaymentIntentState('settled'), 'confirmed');
    assert.equal(normalizePaymentIntentState('pending'), 'pending_provider');
    assert.equal(normalizePaymentIntentState('expired'), 'expired');
    assert.equal(normalizePaymentIntentState('garbage'), 'initiated');
  });

  it('prefer an explicit lifecycle status over the provider status', () => {
    assert.equal(resolveProviderLifecycleState({ status: 'processing', providerStatus: 'failed' }), 'processing');
    assert.equal(resolveProviderLifecycleState({ status: 'unknown', providerStatus: 'SETTLED' }), 'confirmed');
  });

  it('map lifecycle states back to stored transaction statuses', () => {
    assert.equal(mapLifecycleStatusToTransactionStatus('processing'), 'pending');
    assert.equal(mapLifecycleStatusToTransactionStatus('reconciled'), 'completed');
    assert.equal(mapLifecycleStatusToTransactionStatus('failed'), 'failed');
    assert.equal(mapLifecycleStatusToTransactionStatus('whatever'), 'pending');
  });
});
