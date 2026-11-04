import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const projections = [
  { appRowTable: 'projects', model: 'projectCenterProject' },
  { appRowTable: 'project_milestones', model: 'projectCenterMilestone' },
  { appRowTable: 'project_documents', model: 'projectCenterDocument' },
  { appRowTable: 'project_history', model: 'projectCenterHistoryEntry' },
  { appRowTable: 'project_funding_rounds', model: 'projectCenterFundingRound' },
  { appRowTable: 'funding_investors', model: 'projectCenterFundingInvestor' },
  { appRowTable: 'project_partnerships', model: 'projectCenterPartnership' },
  { appRowTable: 'project_tracking', model: 'projectCenterTracking' },
  { appRowTable: 'project_collaborations', model: 'projectCenterCollaboration' },
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function rowId(row, fallback) {
  return String(row?.id ?? fallback);
}

async function main() {
  const rows = [];
  const failures = [];

  for (const projection of projections) {
    const appRows = await prisma.appRow.findMany({ where: { table: projection.appRowTable }, select: { rowId: true, data: true } });
    const prismaRows = await prisma[projection.model].findMany({ where: { source: 'app_row' }, select: { id: true, metadata: true } });
    const prismaById = new Map(prismaRows.map((row) => [rowId(row.metadata, row.id), JSON.stringify(stable(row.metadata))]));
    const missing = [];
    const diverging = [];

    for (const appRow of appRows) {
      const id = rowId(appRow.data, appRow.rowId);
      const projected = prismaById.get(id);
      if (projected === undefined) {
        missing.push(id);
      } else if (projected !== JSON.stringify(stable(appRow.data))) {
        diverging.push(id);
      }
    }

    rows.push({ table: projection.appRowTable, appRows: appRows.length, prismaRows: prismaRows.length, missing: missing.length, diverging: diverging.length });

    if (appRows.length !== prismaRows.length) {
      failures.push(`${projection.appRowTable}: AppRow=${appRows.length}, Prisma=${prismaRows.length}`);
    }
    if (missing.length > 0) {
      failures.push(`${projection.appRowTable}: absent de Prisma -> ${missing.slice(0, 5).join(', ')}`);
    }
    if (diverging.length > 0) {
      failures.push(`${projection.appRowTable}: contenu divergent -> ${diverging.slice(0, 5).join(', ')}`);
    }
  }

  console.log(JSON.stringify({
    status: failures.length === 0 ? 'ok' : 'failed',
    rows,
  }, null, 2));

  if (failures.length > 0) {
    throw new Error(`Project Center AppRow/Prisma mismatch: ${failures.join('; ')}`);
  }
}

main()
  .catch((error) => {
    if (error && typeof error === 'object' && error.code === 'P2021') {
      console.error('Schema Prisma Project Center absent. Execute `npx prisma db push --skip-generate` ou les migrations avant ce check.');
      process.exitCode = 1;
      return;
    }
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
