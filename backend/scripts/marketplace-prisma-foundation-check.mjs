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
const persistencePath = path.join(backendRoot, 'src', 'database', 'platform-persistence.service.ts');
const projectionPath = path.join(backendRoot, 'src', 'database', 'platform-marketplace-projection.ts');
const readServicePath = path.join(backendRoot, 'src', 'marketplace', 'marketplace-prisma-read.service.ts');
const marketplaceServicePath = path.join(backendRoot, 'src', 'marketplace', 'marketplace.service.ts');
const snapshotSyncPath = path.join(backendRoot, 'src', 'database', 'platform-snapshot-sync.service.ts');
const snapshotMarketplaceSyncPath = path.join(backendRoot, 'src', 'database', 'platform-snapshot-marketplace-sync.ts');
const consistencyCheckPath = path.join(backendRoot, 'scripts', 'marketplace-prisma-consistency-check.mjs');
const packageJsonPath = path.join(backendRoot, 'package.json');

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
  const persistenceSource = readRequiredFile(persistencePath);
  const projectionSource = readRequiredFile(projectionPath);
  const readServiceSource = readRequiredFile(readServicePath);
  const marketplaceServiceSource = readRequiredFile(marketplaceServicePath);
  const snapshotSyncSource = readRequiredFile(snapshotSyncPath);
  const snapshotMarketplaceSyncSource = readRequiredFile(snapshotMarketplaceSyncPath);
  const consistencyCheckSource = readRequiredFile(consistencyCheckPath);
  const packageJsonSource = readRequiredFile(packageJsonPath);
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
  for (const table of ['providers', 'provider_services', 'provider_reviews', 'client_orders', 'client_favorites', 'provider_verification_requests']) {
    if (!persistenceSource.includes(`rowsByTable.${table}`)) {
      failures.push(`Projection double-run absente de PlatformPersistenceService: ${table}`);
    }
    if (!snapshotMarketplaceSyncSource.includes(table)) {
      failures.push(`Helper backfill Marketplace absent: ${table}`);
    }
    if (!consistencyCheckSource.includes(`'${table}'`)) {
      failures.push(`Check de coherence AppRow/Prisma absent: ${table}`);
    }
  }
  if (!projectionSource.includes('persistMarketplaceProjection') || !projectionSource.includes('deleteMarketplaceProjection')) {
    failures.push('La projection Marketplace doit exposer persistMarketplaceProjection et deleteMarketplaceProjection.');
  }
  if (!readServiceSource.includes('MarketplacePrismaReadService')) {
    failures.push('Le lecteur Prisma Marketplace doit exister.');
  }
  for (const method of [
    'listPublicProviders',
    'getPublicProvider',
    'getProviderByUserId',
    'listProviderReviews',
    'listClientFavorites',
    'listProviderServices',
    'getClientOrder',
    'getProviderReview',
    'getClientFavorite',
    'getProviderService',
    'getVerificationRequest',
  ]) {
    if (!readServiceSource.includes(method)) {
      failures.push(`Lecteur Prisma Marketplace incomplet: ${method}`);
    }
    if (!marketplaceServiceSource.includes(`marketplacePrismaReadService.${method}`)) {
      failures.push(`MarketplaceService doit utiliser le lecteur Prisma: ${method}`);
    }
  }
  if (!marketplaceServiceSource.includes('persistedMarketplaceRow')) {
    failures.push('Les mutations Marketplace doivent relire la projection Prisma apres persistence.');
  }
  if (!snapshotSyncSource.includes('buildMarketplaceRows(groupedRows)') || !snapshotSyncSource.includes('syncMarketplaceSnapshot(tx, marketplaceRows)')) {
    failures.push('PlatformSnapshotSyncService doit deleguer le backfill Marketplace au helper dedie.');
  }
  if (!snapshotMarketplaceSyncSource.includes('persistMarketplaceProjection(tx, rowsByTable)')) {
    failures.push('Le helper snapshot Marketplace doit utiliser persistMarketplaceProjection.');
  }
  if (!packageJsonSource.includes('marketplace:prisma-consistency:check')) {
    failures.push('package.json doit exposer marketplace:prisma-consistency:check.');
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
