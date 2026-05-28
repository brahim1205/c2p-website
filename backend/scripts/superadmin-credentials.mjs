import { existsSync } from 'node:fs';
import process from 'node:process';
import argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

const DEFAULT_SUPERADMIN_ID = 'usr-superadmin';

for (const path of [process.env.SUPERADMIN_ENV_FILE, '.env.prod', '.env'].filter(Boolean)) {
  if (existsSync(path)) {
    loadEnv({ path, override: false });
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} est requis.`);
  }
  return value;
}

function redactEmail(email) {
  const [name, domain] = email.split('@');
  if (!domain) return '<email>';
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
}

function asAppRowData(row, email, passwordHash) {
  const now = new Date().toISOString();
  return {
    ...row,
    email,
    firstName: process.env.C2P_SUPERADMIN_FIRST_NAME || row.firstName || 'Super',
    lastName: process.env.C2P_SUPERADMIN_LAST_NAME || row.lastName || 'Admin',
    role: 'superadmin',
    status: 'active',
    passwordHash,
    passwordHistory: [passwordHash],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: now,
    updatedAt: now,
  };
}

async function main() {
  const email = requireEnv('C2P_SUPERADMIN_EMAIL').toLowerCase();
  const password = requireEnv('C2P_SUPERADMIN_PASSWORD');
  const id = process.env.C2P_SUPERADMIN_ID?.trim() || DEFAULT_SUPERADMIN_ID;
  const firstName = process.env.C2P_SUPERADMIN_FIRST_NAME?.trim() || 'Super';
  const lastName = process.env.C2P_SUPERADMIN_LAST_NAME?.trim() || 'Admin';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const now = new Date();
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { id },
          { role: 'superadmin' },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    const userId = existing?.id ?? id;

    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email,
          firstName,
          lastName,
          role: 'superadmin',
          status: 'active',
          passwordHash,
          passwordHistory: [passwordHash],
          backupCodes: [],
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastPasswordChangeAt: now,
          source: 'native',
          metadata: {},
        },
        update: {
          email,
          firstName,
          lastName,
          role: 'superadmin',
          status: 'active',
          passwordHash,
          passwordHistory: [passwordHash],
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastPasswordChangeAt: now,
          metadata: existing?.metadata ?? {},
        },
      });

      await tx.userSessionRecord.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.refreshTokenSessionRecord.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });

      const appRowKey = `auth_users:${userId}`;
      const existingAppRow = await tx.appRow.findUnique({ where: { key: appRowKey } });
      const previousData = existingAppRow?.data && typeof existingAppRow.data === 'object'
        ? existingAppRow.data
        : { id: userId };
      const data = asAppRowData(previousData, email, passwordHash);
      await tx.appRow.upsert({
        where: { key: appRowKey },
        create: {
          key: appRowKey,
          table: 'auth_users',
          rowId: userId,
          data,
        },
        update: { data },
      });
    });

    console.log(JSON.stringify({
      ok: true,
      userId,
      email: redactEmail(email),
      sessionsRevoked: true,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
