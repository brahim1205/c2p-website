import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePaymentLifecycleStatus } from './payment-status.resolver.js';

describe('resolvePaymentLifecycleStatus', () => {
  it('returns initiated when nothing is known', () => {
    assert.equal(resolvePaymentLifecycleStatus({}), 'initiated');
  });

  it('maps a local pending status to pending_provider', () => {
    assert.equal(resolvePaymentLifecycleStatus({ status: 'pending' }), 'pending_provider');
  });

  it('marks completed refunds as refunded', () => {
    assert.equal(resolvePaymentLifecycleStatus({ type: 'refund', status: 'completed' }), 'refunded');
    assert.equal(resolvePaymentLifecycleStatus({ type: 'REFUND', providerStatus: 'REFUNDED' }), 'refunded');
  });

  it('marks completed transactions settled to wallet as reconciled', () => {
    assert.equal(resolvePaymentLifecycleStatus({ status: 'completed', settledToWallet: true }), 'reconciled');
  });

  it('does not reconcile a transaction that is not completed', () => {
    assert.equal(resolvePaymentLifecycleStatus({ status: 'pending', settledToWallet: true }), 'pending_provider');
  });

  it('treats failure markers as failed, before success markers', () => {
    for (const providerStatus of ['FAILED', 'error', 'REJECTED', 'cancelled', 'CANCELED', 'expired', 'PAYMENT_FAILED']) {
      assert.equal(resolvePaymentLifecycleStatus({ providerStatus }), 'failed', providerStatus);
    }
    assert.equal(resolvePaymentLifecycleStatus({ status: 'completed', providerStatus: 'FAILED' }), 'failed');
    assert.equal(resolvePaymentLifecycleStatus({ status: 'cancelled' }), 'failed');
  });

  it('treats success markers as confirmed', () => {
    for (const providerStatus of ['SUCCESS', 'completed', 'CONFIRMED', 'settled', 'PAYMENT_SUCCESS', 'successful', 'succeeded']) {
      assert.equal(resolvePaymentLifecycleStatus({ providerStatus }), 'confirmed', providerStatus);
    }
  });

  it('treats in-flight markers as processing', () => {
    for (const providerStatus of ['PROCESSING', 'in_progress', 'in progress', 'IN-PROGRESS', 'validating', 'confirming']) {
      assert.equal(resolvePaymentLifecycleStatus({ providerStatus }), 'processing', providerStatus);
    }
  });

  it('never confirms a negated or partial status (regression: substring matching)', () => {
    for (const providerStatus of ['UNCONFIRMED', 'unsettled', 'NOT_COMPLETED', 'incompleted', 'unsuccessful']) {
      assert.notEqual(resolvePaymentLifecycleStatus({ providerStatus }), 'confirmed', providerStatus);
    }
  });

  it('falls back to pending_provider for unknown provider statuses', () => {
    assert.equal(resolvePaymentLifecycleStatus({ providerStatus: 'CREATED' }), 'pending_provider');
  });
});
