import 'dotenv/config';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

function redactConnectionString(value) {
  try {
    const url = new URL(value);
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL est absent.');
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const { rows } = await client.query(`
      select
        current_database() as database,
        current_user as user,
        current_schema() as schema,
        version() as version
    `);
    console.log(JSON.stringify({ ok: true, connection: redactConnectionString(databaseUrl), ...rows[0] }, null, 2));
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    connection: redactConnectionString(process.env.DATABASE_URL ?? ''),
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
