import assert from 'node:assert/strict';
import {
  assertRefundAmountInvariant,
  resolveMonotonicFinanceTransition,
} from './finance-domain-guards.js';

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

  console.log(JSON.stringify({
    ok: true,
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
