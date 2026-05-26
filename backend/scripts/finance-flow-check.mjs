import { PrismaClient } from '@prisma/client';

const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || 'password123';
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractCookies(response) {
  const setCookies = response.headers.getSetCookie?.() || [];
  return setCookies.map((cookie) => cookie.split(';', 1)[0]);
}

function mergeCookieJar(...cookieSets) {
  return cookieSets.flat().filter(Boolean).join('; ');
}

function readCookie(cookieJar, name) {
  const prefix = `${name}=`;
  return cookieJar
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || null;
}

function toAmount(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

async function loginAs(email) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  assert(response.ok, `login failed for ${email} (${response.status})`);
  const cookieJar = mergeCookieJar(extractCookies(response));
  return {
    cookieJar,
    csrfToken: readCookie(cookieJar, 'c2p_csrf'),
  };
}

async function request(path, init = {}) {
  return fetch(`${API_URL}${path}`, init);
}

async function readJson(path, init = {}) {
  const response = await request(path, init);
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;
  return { response, payload };
}

async function readWallet(cookieJar) {
  const wallet = await readJson('/payments/wallet/me', {
    headers: { Cookie: cookieJar },
  });
  assert(wallet.response.ok, `expected 200 on wallet read, got ${wallet.response.status}`);
  return wallet.payload;
}

async function topup({ cookieJar, csrfToken, requestId, amount }) {
  return readJson('/payments/wallet/topup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
      'X-Request-Id': requestId,
    },
    body: JSON.stringify({
      amount,
      method: 'wave',
      description: `Finance idempotency smoke ${requestId}`,
    }),
  });
}

async function refundTransaction({ cookieJar, csrfToken, requestId, transactionId }) {
  return readJson(`/payments/admin/transactions/${encodeURIComponent(transactionId)}/refund`, {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
      'X-Request-Id': requestId,
    },
  });
}

async function readAdminLedger({ cookieJar, limit = 25 }) {
  return readJson(`/payments/admin/ledger?limit=${encodeURIComponent(String(limit))}`, {
    headers: { Cookie: cookieJar },
  });
}

async function readAdminLedgerReconciliation({ cookieJar }) {
  return readJson('/payments/admin/ledger/reconciliation', {
    headers: { Cookie: cookieJar },
  });
}

async function createPayoutAccount({ cookieJar, csrfToken, requestId }) {
  return readJson('/payments/payout-accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
      'X-Request-Id': requestId,
    },
    body: JSON.stringify({
      method: 'wave',
      account_name: 'Finance Smoke',
      account_identifier: `+22177000${String(Date.now()).slice(-4)}`,
      label: `Smoke ${requestId}`,
      is_default: false,
    }),
  });
}

async function createPayoutRequest({ cookieJar, csrfToken, requestId, accountId, amount }) {
  return readJson('/payments/payouts/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
      'X-Request-Id': requestId,
    },
    body: JSON.stringify({
      amount,
      account_id: accountId,
      note: `Finance payout idempotency smoke ${requestId}`,
    }),
  });
}

async function main() {
  const { cookieJar, csrfToken } = await loginAs('formateur@c2p.sn');
  assert(csrfToken, 'missing csrf cookie for finance flow');

  const before = await readWallet(cookieJar);
  const beforeBalance = toAmount(before.balance);
  const amount = 123;
  const requestId = `finance-smoke-${Date.now()}`;

  const firstTopup = await topup({ cookieJar, csrfToken, requestId, amount });
  assert(firstTopup.response.ok, `expected 200 on first topup, got ${firstTopup.response.status}`);
  assert(firstTopup.payload?.financialOperationId, 'first topup must return a financialOperationId');
  assert(firstTopup.payload?.transaction?.id, 'first topup must return a transaction id');
  const topupLedger = await prisma.financeLedgerEntry.findMany({
    where: { financialOperationId: firstTopup.payload.financialOperationId },
  });
  assert(topupLedger.length === 1, `topup must create exactly one ledger entry, got ${topupLedger.length}`);
  assert(topupLedger[0].direction === 'credit', `topup ledger direction must be credit, got ${topupLedger[0].direction}`);
  assert(topupLedger[0].amount === amount, `topup ledger amount must be ${amount}, got ${topupLedger[0].amount}`);

  const afterFirst = await readWallet(cookieJar);
  const afterFirstBalance = toAmount(afterFirst.balance);
  assert(
    afterFirstBalance === beforeBalance + amount,
    `wallet balance must increase once after first topup: expected ${beforeBalance + amount}, got ${afterFirstBalance}`,
  );

  const secondTopup = await topup({ cookieJar, csrfToken, requestId, amount });
  assert(secondTopup.response.ok, `expected 200 on idempotent second topup, got ${secondTopup.response.status}`);
  assert(
    secondTopup.payload.financialOperationId === firstTopup.payload.financialOperationId,
    'idempotent topup must return the same financialOperationId',
  );
  assert(
    secondTopup.payload.transaction?.id === firstTopup.payload.transaction?.id,
    'idempotent topup must return the same transaction id',
  );

  const afterSecond = await readWallet(cookieJar);
  const afterSecondBalance = toAmount(afterSecond.balance);
  assert(
    afterSecondBalance === afterFirstBalance,
    `wallet balance must not change after idempotent replay: expected ${afterFirstBalance}, got ${afterSecondBalance}`,
  );

  const { cookieJar: adminCookieJar, csrfToken: adminCsrfToken } = await loginAs('admin@c2p.sn');
  assert(adminCsrfToken, 'missing csrf cookie for admin finance flow');
  const refundRequestId = `${requestId}-refund`;
  const firstRefund = await refundTransaction({
    cookieJar: adminCookieJar,
    csrfToken: adminCsrfToken,
    requestId: refundRequestId,
    transactionId: firstTopup.payload.transaction.id,
  });
  assert(firstRefund.response.ok, `expected 200 on first refund, got ${firstRefund.response.status}`);
  assert(firstRefund.payload?.financialOperationId, 'first refund must return a financialOperationId');
  assert(firstRefund.payload?.transaction?.id, 'first refund must return a transaction id');
  const refundLedger = await prisma.financeLedgerEntry.findMany({
    where: { financialOperationId: firstRefund.payload.financialOperationId },
  });
  assert(refundLedger.length === 1, `refund must create exactly one ledger entry, got ${refundLedger.length}`);
  assert(refundLedger[0].direction === 'credit', `refund ledger direction must be credit, got ${refundLedger[0].direction}`);

  const adminLedger = await readAdminLedger({ cookieJar: adminCookieJar });
  assert(adminLedger.response.ok, `expected 200 on admin ledger read, got ${adminLedger.response.status}`);
  assert(Array.isArray(adminLedger.payload), 'admin ledger read must return an array');
  assert(
    adminLedger.payload.some((entry) => entry.financial_operation_id === firstTopup.payload.financialOperationId),
    'admin ledger read must expose the topup ledger entry',
  );
  assert(
    adminLedger.payload.some((entry) => entry.financial_operation_id === firstRefund.payload.financialOperationId),
    'admin ledger read must expose the refund ledger entry',
  );

  const reconciliation = await readAdminLedgerReconciliation({ cookieJar: adminCookieJar });
  assert(
    reconciliation.response.ok,
    `expected 200 on admin ledger reconciliation, got ${reconciliation.response.status}`,
  );
  assert(
    typeof reconciliation.payload?.summary?.ledgerEntries === 'number',
    'ledger reconciliation must return a numeric ledger entry count',
  );

  const afterFirstRefund = await readWallet(cookieJar);
  const afterFirstRefundBalance = toAmount(afterFirstRefund.balance);
  assert(
    afterFirstRefundBalance === afterSecondBalance + amount,
    `wallet balance must increase once after first refund: expected ${afterSecondBalance + amount}, got ${afterFirstRefundBalance}`,
  );

  const secondRefund = await refundTransaction({
    cookieJar: adminCookieJar,
    csrfToken: adminCsrfToken,
    requestId: refundRequestId,
    transactionId: firstTopup.payload.transaction.id,
  });
  assert(secondRefund.response.ok, `expected 200 on idempotent second refund, got ${secondRefund.response.status}`);
  assert(
    secondRefund.payload.financialOperationId === firstRefund.payload.financialOperationId,
    'idempotent refund must return the same financialOperationId',
  );
  assert(
    secondRefund.payload.transaction?.id === firstRefund.payload.transaction?.id,
    'idempotent refund must return the same transaction id',
  );

  const afterSecondRefund = await readWallet(cookieJar);
  const afterSecondRefundBalance = toAmount(afterSecondRefund.balance);
  assert(
    afterSecondRefundBalance === afterFirstRefundBalance,
    `wallet balance must not change after idempotent refund replay: expected ${afterFirstRefundBalance}, got ${afterSecondRefundBalance}`,
  );

  const concurrentBefore = await readWallet(cookieJar);
  const concurrentBeforeBalance = toAmount(concurrentBefore.balance);
  const concurrentRequestId = `${requestId}-concurrent-topup`;
  const concurrentAmount = 77;
  const concurrentTopups = await Promise.all([
    topup({ cookieJar, csrfToken, requestId: concurrentRequestId, amount: concurrentAmount }),
    topup({ cookieJar, csrfToken, requestId: concurrentRequestId, amount: concurrentAmount }),
  ]);
  const statuses = concurrentTopups.map((entry) => entry.response.status);
  assert(
    statuses.every((status) => [200, 201, 409].includes(status)),
    `concurrent idempotent topups must return success or conflict, got ${statuses.join(', ')}`,
  );
  assert(
    statuses.some((status) => [200, 201].includes(status)),
    `at least one concurrent topup must complete, got ${statuses.join(', ')}`,
  );

  const concurrentAfter = await readWallet(cookieJar);
  const concurrentAfterBalance = toAmount(concurrentAfter.balance);
  assert(
    concurrentAfterBalance === concurrentBeforeBalance + concurrentAmount,
    `concurrent idempotent topups must increment balance once: expected ${concurrentBeforeBalance + concurrentAmount}, got ${concurrentAfterBalance}`,
  );

  const invalidWithdraw = await readJson('/payments/wallet/withdraw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
      'X-Request-Id': `${requestId}-invalid-withdraw`,
    },
    body: JSON.stringify({
      amount: 0,
      method: 'wave',
      description: 'Invalid withdraw must fail validation',
    }),
  });
  assert(invalidWithdraw.response.status === 400, `expected 400 on zero withdraw, got ${invalidWithdraw.response.status}`);

  const payoutAccount = await createPayoutAccount({
    cookieJar,
    csrfToken,
    requestId: `${requestId}-payout-account`,
  });
  assert(payoutAccount.response.ok, `expected 200 on payout account create, got ${payoutAccount.response.status}`);
  assert(payoutAccount.payload?.account?.id, 'payout account create must return an account id');

  const payoutRequestId = `${requestId}-payout-request`;
  const firstPayoutRequest = await createPayoutRequest({
    cookieJar,
    csrfToken,
    requestId: payoutRequestId,
    accountId: payoutAccount.payload.account.id,
    amount: 1000,
  });
  assert(firstPayoutRequest.response.ok, `expected 200 on first payout request, got ${firstPayoutRequest.response.status}`);
  assert(firstPayoutRequest.payload?.request?.id, 'first payout request must return a request id');

  const secondPayoutRequest = await createPayoutRequest({
    cookieJar,
    csrfToken,
    requestId: payoutRequestId,
    accountId: payoutAccount.payload.account.id,
    amount: 1000,
  });
  assert(secondPayoutRequest.response.ok, `expected 200 on idempotent payout request, got ${secondPayoutRequest.response.status}`);
  assert(
    secondPayoutRequest.payload.request.id === firstPayoutRequest.payload.request.id,
    'idempotent payout request must return the same request id',
  );

  console.log('finance-flow-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
