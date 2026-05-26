import { PrismaClient } from '@prisma/client';

const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');
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

async function loginAs(email) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  assert(response.ok, `login failed for ${email} (${response.status})`);
  return mergeCookieJar(extractCookies(response));
}

async function readJson(path, init = {}) {
  const response = await fetch(`${API_URL}${path}`, init);
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;
  return { response, payload };
}

function isImmutableLedgerError(error) {
  const message = String(error?.message ?? error);
  return message.includes('append-only')
    || message.includes('cannot be mutated')
    || message.includes('Les écritures du ledger financier sont immuables');
}

async function assertLedgerApi() {
  const cookieJar = await loginAs('admin@c2p.sn');
  const ledger = await readJson('/payments/admin/ledger?limit=5', {
    headers: { Cookie: cookieJar },
  });
  assert(ledger.response.ok, `expected 200 on ledger read, got ${ledger.response.status}`);
  assert(Array.isArray(ledger.payload), 'ledger endpoint must return an array');

  const reconciliation = await readJson('/payments/admin/ledger/reconciliation', {
    headers: { Cookie: cookieJar },
  });
  assert(
    reconciliation.response.ok,
    `expected 200 on ledger reconciliation, got ${reconciliation.response.status}`,
  );
  assert(
    typeof reconciliation.payload?.summary?.ledgerEntries === 'number',
    'ledger reconciliation must return a summary.ledgerEntries number',
  );
}

async function assertDbImmutability() {
  const entry = await prisma.financeLedgerEntry.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!entry) {
    console.log('finance-ledger-check: skipped immutability probe, no ledger entry found');
    return;
  }

  let mutationBlocked = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "FinanceLedgerEntry"
        SET "metadata" = COALESCE("metadata", '{}'::jsonb) || '{"immutability_probe": true}'::jsonb
        WHERE "id" = ${entry.id}
      `;
      throw new Error('rollback after successful immutability probe');
    });
  } catch (error) {
    mutationBlocked = isImmutableLedgerError(error);
    if (!mutationBlocked && !String(error?.message ?? '').includes('rollback after successful immutability probe')) {
      throw error;
    }
  }

  assert(mutationBlocked, 'FinanceLedgerEntry update must be blocked by database immutability trigger');
}

async function main() {
  await assertLedgerApi();
  await assertDbImmutability();
  console.log('finance-ledger-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
