import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

const CONFIRM_VALUE = 'reset';
const npxBin = '/usr/bin/npx';
const npmBin = '/usr/bin/npm';
const toolEnv = { ...process.env, PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' };

function parseDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL est absent.');
  }

  const url = new URL(raw);
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (!isLocalHost) {
    throw new Error(`Refus de reset: DATABASE_URL ne pointe pas vers localhost (${url.hostname}).`);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refus de reset: NODE_ENV=production.');
  }

  if (process.env.C2P_CONFIRM_LOCAL_DB_RESET !== CONFIRM_VALUE) {
    throw new Error(`Refus de reset: definir C2P_CONFIRM_LOCAL_DB_RESET=${CONFIRM_VALUE}.`);
  }

  return raw;
}

async function truncatePublicTables(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(`
      select tablename
      from pg_tables
      where schemaname = 'public'
      order by tablename
    `);

    if (rows.length === 0) {
      return { tables: [] };
    }

    const tableList = rows
      .map((row) => `"public"."${String(row.tablename).replaceAll('"', '""')}"`)
      .join(', ');

    await client.query(`truncate table ${tableList} restart identity cascade`);
    return { tables: rows.map((row) => row.tablename) };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const databaseUrl = parseDatabaseUrl();
  const result = await truncatePublicTables(databaseUrl);

  execFileSync(npxBin, ['prisma', 'db', 'push', '--skip-generate'], {
    stdio: 'inherit',
    env: toolEnv,
  });

  execFileSync(npmBin, ['run', 'db:seed:local'], {
    stdio: 'inherit',
    env: toolEnv,
  });

  console.log(JSON.stringify({ ok: true, truncatedTables: result.tables.length }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
