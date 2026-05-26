import assert from 'node:assert/strict';
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
  resolveProviderLifecycleState,
  resolveMonotonicFinanceTransition,
} from './finance-domain-guards.js';
import { resolvePaymentLifecycleStatus } from './payment-status.resolver.js';

function replayState(kind: Parameters<typeof resolveMonotonicFinanceTransition>[0], initialState: string, attempts: string[]) {
  let state = initialState;
  const decisions: string[] = [];
  for (const attempted of attempts) {
    const resolution = resolveMonotonicFinanceTransition(kind, state, attempted);
    state = resolution.nextState;
    decisions.push(resolution.decision);
  }
  return { state, decisions };
}

function main() {
  for (const [kind, graph] of Object.entries(FINANCE_TRANSITION_GRAPHS)) {
    for (const [state, transitions] of Object.entries(graph)) {
      assert.ok(state.length > 0, `${kind} must not contain empty state names`);
      assert.equal(new Set(transitions).size, transitions.length, `${kind}.${state} must not contain duplicate transitions`);
      for (const targetState of transitions) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(graph, targetState),
          `${kind}.${state} references unknown target ${targetState}`,
        );
        assert.ok(canReachFinanceState(graph, state, targetState), `${kind}.${state} must reach ${targetState}`);
      }
    }

    const terminalStates = getFinanceTerminalStates(graph);
    assert.ok(terminalStates.length > 0, `${kind} must expose at least one terminal state`);
    for (const terminalState of terminalStates) {
      assert.equal(isTerminalFinanceState(graph, terminalState), true, `${kind}.${terminalState} must be terminal`);
    }
  }

  const transactionReplay = replayState('transaction', 'pending_provider', [
    'processing',
    'confirmed',
    ...new Array(20).fill('confirmed'),
    'pending_provider',
    'failed',
    'reconciled',
    'confirmed',
  ]);
  assert.equal(transactionReplay.state, 'reconciled');
  assert.equal(transactionReplay.decisions.at(-1), 'preserve_terminal');

  const escrowReplay = replayState('escrow', 'funded', [
    'released',
    'released',
    'refunded',
  ]);
  assert.equal(escrowReplay.state, 'released');
  assert.equal(escrowReplay.decisions[1], 'noop');
  assert.equal(escrowReplay.decisions[2], 'preserve_terminal');

  const payoutReplay = replayState('payout', 'pending', [
    'approved',
    'paid',
    'approved',
    'rejected',
  ]);
  assert.equal(payoutReplay.state, 'paid');
  assert.equal(payoutReplay.decisions[2], 'preserve_terminal');

  const paymentIntentReplay = replayState('payment_intent', 'pending_provider', [
    'processing',
    'confirmed',
    'pending_provider',
  ]);
  assert.equal(paymentIntentReplay.state, 'confirmed');
  assert.equal(paymentIntentReplay.decisions[2], 'preserve_terminal');

  assert.doesNotThrow(() => assertFinanceTransition('transaction', 'pending_provider', 'processing'));
  assert.throws(() => assertFinanceTransition('transaction', 'confirmed', 'processing'));
  assert.throws(() => resolveMonotonicFinanceTransition('transaction', 'confirmed', 'unknown_state'));

  assert.doesNotThrow(() => assertRefundAmountInvariant({
    requestedAmount: 2500,
    settledAmount: 2500,
    alreadyRefundedAmount: 0,
  }));
  assert.throws(
    () => assertRefundAmountInvariant({
      requestedAmount: 2501,
      settledAmount: 2500,
      alreadyRefundedAmount: 0,
    }),
  );
  assert.doesNotThrow(() => assertRefundAmountInvariant({
    requestedAmount: 500,
    settledAmount: 2500,
    alreadyRefundedAmount: 2000,
  }));
  assert.throws(
    () => assertRefundAmountInvariant({
      requestedAmount: 501,
      settledAmount: 2500,
      alreadyRefundedAmount: 2000,
    }),
  );
  assert.throws(
    () => assertRefundAmountInvariant({
      requestedAmount: 0,
      settledAmount: 2500,
      alreadyRefundedAmount: 0,
    }),
  );

  assert.doesNotThrow(() => assertPositivePayoutInvariant({
    amount: 1000,
    currentStatus: 'pending',
    targetStatus: 'approved',
  }));
  assert.throws(() => assertPositivePayoutInvariant({
    amount: 0,
    currentStatus: 'pending',
    targetStatus: 'approved',
  }));
  assert.throws(() => assertPositivePayoutInvariant({
    amount: 1000,
    currentStatus: 'paid',
    targetStatus: 'approved',
  }));

  assert.equal(resolvePaymentLifecycleStatus({ status: 'completed', settledToWallet: true }), 'reconciled');
  assert.equal(resolvePaymentLifecycleStatus({ type: 'refund', status: 'completed' }), 'refunded');
  assert.equal(resolvePaymentLifecycleStatus({ providerStatus: 'PROCESSING' }), 'processing');
  assert.equal(resolvePaymentLifecycleStatus({ providerStatus: 'REJECTED' }), 'failed');
  assert.equal(resolvePaymentLifecycleStatus({ providerStatus: 'SUCCESS' }), 'confirmed');
  assert.equal(resolvePaymentLifecycleStatus({ status: 'pending' }), 'pending_provider');
  assert.equal(resolvePaymentLifecycleStatus({}), 'initiated');

  assert.equal(normalizePaymentIntentState('completed'), 'confirmed');
  assert.equal(normalizePaymentIntentState('pending'), 'pending_provider');
  assert.equal(normalizePaymentIntentState('expired'), 'expired');
  assert.equal(normalizePaymentIntentState('unknown'), 'initiated');

  assert.equal(resolveProviderLifecycleState({ status: 'processing', providerStatus: 'failed' }), 'processing');
  assert.equal(resolveProviderLifecycleState({ status: 'unknown', providerStatus: 'SETTLED' }), 'confirmed');
  assert.equal(mapLifecycleStatusToTransactionStatus('confirmed'), 'completed');
  assert.equal(mapLifecycleStatusToTransactionStatus('failed'), 'failed');
  assert.equal(mapLifecycleStatusToTransactionStatus('processing'), 'pending');

  console.log(JSON.stringify({
    ok: true,
    graphKinds: Object.keys(FINANCE_TRANSITION_GRAPHS).length,
    scenarios: {
      transactionReplay,
      escrowReplay,
      payoutReplay,
      paymentIntentReplay,
    },
  }));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
