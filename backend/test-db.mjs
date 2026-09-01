import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const assets = await prisma.appRow.findMany({
    where: { table: 'lesson_assets' },
  });
  console.log('Total assets:', assets.length);
  const jsonAssets = assets.map(a => a.data).slice(-5); // last 5 assets
  jsonAssets.forEach(a => console.log('Asset:', a.asset_type, a.type, a.url));
  process.exit(0);
}
run();
