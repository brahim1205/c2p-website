#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoRoot = path.resolve(backendRoot, '..');
const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');
const migrationPath = path.join(
  backendRoot,
  'prisma',
  'migrations',
  '202605290145_marketplace_foundation',
  'migration.sql',
);
const migrationPlanPath = path.join(repoRoot, 'docs', 'APPROW_MIGRATION_PLAN.md');

const marketplaceModels = [
  'MarketplaceProvider',
  'MarketplaceProviderService',
  'MarketplaceProviderReview',
  'MarketplaceClientFavorite',
  'MarketplaceClientOrder',
  'MarketplaceProviderVerificationRequest',
];

const requiredIndexes = [
  'MarketplaceProvider_category_active_idx',
  'MarketplaceProviderService_providerId_status_idx',
  'MarketplaceProviderReview_providerId_createdAt_idx',
  'MarketplaceClientFavorite_clientId_providerId_key',
  'MarketplaceClientOrder_clientId_status_idx',
  'MarketplaceProviderVerificationRequest_providerId_status_idx',
];

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier manquant: ${path.relative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function main() {
  const schemaSource = readRequiredFile(schemaPath);
  const migrationSource = readRequiredFile(migrationPath);
  const migrationPlanSource = readRequiredFile(migrationPlanPath);
  const failures = [];

  for (const model of marketplaceModels) {
    if (!new RegExp(`model\\s+${model}\\s+\\{`).test(schemaSource)) {
      failures.push(`Modele Prisma manquant: ${model}`);
    }
    if (!migrationSource.includes(`CREATE TABLE "${model}"`)) {
      failures.push(`Migration SQL manquante pour: ${model}`);
    }
  }

  for (const indexName of requiredIndexes) {
    if (!migrationSource.includes(`"${indexName}"`)) {
      failures.push(`Index marketplace manquant: ${indexName}`);
    }
  }

  if (!migrationPlanSource.includes('Lot 1 - Marketplace')) {
    failures.push('docs/APPROW_MIGRATION_PLAN.md doit documenter le Lot 1 - Marketplace.');
  }
  if (!migrationPlanSource.includes('202605290145_marketplace_foundation')) {
    failures.push('Le plan AppRow doit citer la migration marketplace foundation.');
  }

  const report = {
    ok: failures.length === 0,
    models: marketplaceModels,
    requiredIndexes,
    migration: path.relative(repoRoot, migrationPath),
    failures,
  };

  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
