import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPasswordHash =
  '$argon2id$v=19$m=65536,t=3,p=4$Ib10W7lbOfDuhU5wr72pzw$/dnOjZh0+kI0S2UG5hFu3ygmxjKLo6DDmBQqq0ri84o';

const users = [
  {
    id: 'usr-formateur-nonpremium',
    email: 'formateur.nonpremium@c2p.sn',
    firstName: 'Fatou',
    lastName: 'Sene',
    role: 'formateur',
    status: 'active',
    passwordHash: defaultPasswordHash,
    phone: '+221 77 810 10 10',
    avatar: '/images/brand/image5.jpeg',
    bio: 'Compte formateur de test sans abonnement actif.',
    location: 'Dakar, Senegal',
    publicTitle: 'Formatrice test sans plan actif',
    publicProfileEnabled: true,
    expertVerified: false,
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [defaultPasswordHash],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-prestataire-nonpremium',
    email: 'prestataire.nonpremium@c2p.sn',
    firstName: 'Oumar',
    lastName: 'Ndao',
    role: 'prestataire',
    status: 'active',
    passwordHash: defaultPasswordHash,
    phone: '+221 77 820 20 20',
    avatar: '/images/brand/image7.jpeg',
    bio: 'Compte prestataire de test sans abonnement actif.',
    location: 'Dakar, Senegal',
    publicTitle: 'Prestataire test sans plan actif',
    publicProfileEnabled: true,
    expertVerified: false,
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [defaultPasswordHash],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-porteur-nonpremium',
    email: 'porteur.nonpremium@c2p.sn',
    firstName: 'Mamadou',
    lastName: 'Gaye',
    role: 'porteur',
    status: 'active',
    passwordHash: defaultPasswordHash,
    phone: '+221 77 830 30 30',
    avatar: '/images/brand/image8.jpeg',
    bio: 'Compte porteur de test sans abonnement actif.',
    location: 'Dakar, Senegal',
    publicTitle: 'Porteur test sans plan actif',
    publicProfileEnabled: false,
    expertVerified: false,
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [defaultPasswordHash],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
];

function appRowKey(table, rowId) {
  return table.startsWith('auth_') ? `${table}:${rowId}` : `${table}::${rowId}`;
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function toUserCreateInput(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    phone: user.phone,
    avatar: user.avatar,
    bio: user.bio,
    location: user.location,
    publicTitle: user.publicTitle,
    publicProfileEnabled: user.publicProfileEnabled,
    expertVerified: user.expertVerified,
    isTwoFactorEnabled: user.is2FAEnabled,
    passwordHash: user.passwordHash,
    passwordHistory: user.passwordHistory,
    backupCodes: user.backupCodes,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: toDate(user.lockedUntil),
    lastPasswordChangeAt: toDate(user.lastPasswordChangeAt),
    source: 'app_row',
    createdAt: toDate(user.createdAt),
  };
}

function toUserUpdateInput(user) {
  const input = toUserCreateInput(user);
  delete input.id;
  delete input.createdAt;
  return input;
}

async function upsertAppRow(table, row) {
  const rowId = String(row.id);
  await prisma.appRow.upsert({
    where: { key: appRowKey(table, rowId) },
    create: {
      key: appRowKey(table, rowId),
      table,
      rowId,
      data: row,
    },
    update: {
      data: row,
    },
  });
}

async function removeSubscriptionsForUser(userId) {
  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId },
    select: { id: true },
  });
  const subscriptionIds = subscriptions.map((subscription) => subscription.id);

  if (subscriptionIds.length > 0) {
    await prisma.userSubscription.deleteMany({
      where: { id: { in: subscriptionIds } },
    });
    await prisma.appRow.deleteMany({
      where: {
        table: 'user_subscriptions',
        rowId: { in: subscriptionIds },
      },
    });
  }

  const appRowSubscriptions = await prisma.appRow.findMany({
    where: { table: 'user_subscriptions' },
    select: { key: true, data: true },
  });
  const staleKeys = appRowSubscriptions
    .filter((row) => row.data && typeof row.data === 'object' && row.data.user_id === userId)
    .map((row) => row.key);

  if (staleKeys.length > 0) {
    await prisma.appRow.deleteMany({
      where: { key: { in: staleKeys } },
    });
  }
}

async function main() {
  for (const user of users) {
    await upsertAppRow('auth_users', user);
    await prisma.user.upsert({
      where: { id: user.id },
      create: toUserCreateInput(user),
      update: toUserUpdateInput(user),
    });
    await removeSubscriptionsForUser(user.id);
  }

  console.log(JSON.stringify({
    ok: true,
    accounts: users.map((user) => ({
      email: user.email,
      role: user.role,
      subscription: 'none',
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
