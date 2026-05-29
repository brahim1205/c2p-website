import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const projections = [
  { appRowTable: 'providers', model: 'marketplaceProvider' },
  { appRowTable: 'provider_services', model: 'marketplaceProviderService' },
  { appRowTable: 'provider_reviews', model: 'marketplaceProviderReview' },
  { appRowTable: 'client_orders', model: 'marketplaceClientOrder' },
  { appRowTable: 'client_favorites', model: 'marketplaceClientFavorite' },
  { appRowTable: 'provider_verification_requests', model: 'marketplaceProviderVerificationRequest' },
];

async function main() {
  const rows = [];
  const failures = [];

  for (const projection of projections) {
    const appRows = await prisma.appRow.count({ where: { table: projection.appRowTable } });
    const prismaRows = await prisma[projection.model].count({ where: { source: 'app_row' } });
    rows.push({ table: projection.appRowTable, appRows, prismaRows });

    if (appRows !== prismaRows) {
      failures.push(`${projection.appRowTable}: AppRow=${appRows}, Prisma=${prismaRows}`);
    }
  }

  console.log(JSON.stringify({
    status: failures.length === 0 ? 'ok' : 'failed',
    rows,
  }, null, 2));

  if (failures.length > 0) {
    throw new Error(`Marketplace AppRow/Prisma mismatch: ${failures.join('; ')}`);
  }
}

main()
  .catch((error) => {
    if (error && typeof error === 'object' && error.code === 'P2021') {
      console.error('Schema Prisma Marketplace absent. Execute `npx prisma db push --skip-generate` ou les migrations avant ce check.');
      process.exitCode = 1;
      return;
    }
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
