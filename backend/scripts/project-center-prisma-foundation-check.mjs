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
  '202605291930_project_center_projects_foundation',
  'migration.sql',
);
const detailMigrationPath = path.join(
  backendRoot,
  'prisma',
  'migrations',
  '202605292000_project_center_detail_foundation',
  'migration.sql',
);
const migrationPlanPath = path.join(repoRoot, 'docs', 'APPROW_MIGRATION_PLAN.md');
const persistencePath = path.join(backendRoot, 'src', 'database', 'platform-persistence.service.ts');
const projectionPath = path.join(backendRoot, 'src', 'database', 'platform-project-center-projection.ts');
const snapshotSyncPath = path.join(backendRoot, 'src', 'database', 'platform-snapshot-sync.service.ts');
const snapshotProjectCenterSyncPath = path.join(backendRoot, 'src', 'database', 'platform-snapshot-project-center-sync.ts');
const consistencyCheckPath = path.join(backendRoot, 'scripts', 'project-center-prisma-consistency-check.mjs');
const packageJsonPath = path.join(backendRoot, 'package.json');

const requiredIndexes = [
  'ProjectCenterProject_status_category_idx',
  'ProjectCenterProject_ownerId_status_idx',
  'ProjectCenterProject_source_idx',
  'ProjectCenterMilestone_projectId_status_idx',
  'ProjectCenterMilestone_projectId_dueDate_idx',
  'ProjectCenterMilestone_source_idx',
  'ProjectCenterDocument_projectId_category_idx',
  'ProjectCenterDocument_projectId_docDate_idx',
  'ProjectCenterDocument_source_idx',
];

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier manquant: ${path.relative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function main() {
  const schemaSource = readRequiredFile(schemaPath);
  const migrationSource = `${readRequiredFile(migrationPath)}\n${readRequiredFile(detailMigrationPath)}`;
  const migrationPlanSource = readRequiredFile(migrationPlanPath);
  const persistenceSource = readRequiredFile(persistencePath);
  const projectionSource = readRequiredFile(projectionPath);
  const snapshotSyncSource = readRequiredFile(snapshotSyncPath);
  const snapshotProjectCenterSyncSource = readRequiredFile(snapshotProjectCenterSyncPath);
  const consistencyCheckSource = readRequiredFile(consistencyCheckPath);
  const packageJsonSource = readRequiredFile(packageJsonPath);
  const failures = [];

  if (!/model\s+ProjectCenterProject\s+\{/.test(schemaSource)) {
    failures.push('Modele Prisma manquant: ProjectCenterProject.');
  }
  for (const model of ['ProjectCenterMilestone', 'ProjectCenterDocument']) {
    if (!new RegExp(`model\\s+${model}\\s+\\{`).test(schemaSource)) {
      failures.push(`Modele Prisma manquant: ${model}.`);
    }
  }
  if (!migrationSource.includes('CREATE TABLE "ProjectCenterProject"')) {
    failures.push('Migration SQL manquante pour ProjectCenterProject.');
  }
  if (!migrationSource.includes('CREATE TABLE "ProjectCenterMilestone"')) {
    failures.push('Migration SQL manquante pour ProjectCenterMilestone.');
  }
  if (!migrationSource.includes('CREATE TABLE "ProjectCenterDocument"')) {
    failures.push('Migration SQL manquante pour ProjectCenterDocument.');
  }
  for (const indexName of requiredIndexes) {
    if (!migrationSource.includes(`"${indexName}"`)) {
      failures.push(`Index Project Center manquant: ${indexName}`);
    }
  }
  if (!migrationPlanSource.includes('202605291930_project_center_projects_foundation')) {
    failures.push('Le plan AppRow doit citer la migration Project Center projects foundation.');
  }
  if (!persistenceSource.includes('persistProjectCenterProjection') || !persistenceSource.includes('deleteProjectCenterProjection')) {
    failures.push('PlatformPersistenceService doit brancher la projection Project Center.');
  }
  if (!persistenceSource.includes('rowsByTable.projects')) {
    failures.push('Projection double-run absente de PlatformPersistenceService: projects.');
  }
  for (const table of ['project_milestones', 'project_documents']) {
    if (!persistenceSource.includes(`rowsByTable.${table}`)) {
      failures.push(`Projection double-run absente de PlatformPersistenceService: ${table}.`);
    }
    if (!snapshotProjectCenterSyncSource.includes(table)) {
      failures.push(`Helper backfill Project Center absent: ${table}.`);
    }
    if (!consistencyCheckSource.includes(`'${table}'`)) {
      failures.push(`Check de coherence Project Center incomplet: ${table}.`);
    }
  }
  if (!projectionSource.includes('persistProjectCenterProjection') || !projectionSource.includes('deleteProjectCenterProjection')) {
    failures.push('La projection Project Center doit exposer persist/delete.');
  }
  if (!snapshotSyncSource.includes('buildProjectCenterRows(groupedRows)') || !snapshotSyncSource.includes('syncProjectCenterSnapshot(tx, projectCenterRows)')) {
    failures.push('PlatformSnapshotSyncService doit deleguer le backfill Project Center au helper dedie.');
  }
  if (!snapshotProjectCenterSyncSource.includes('persistProjectCenterProjection(tx, rowsByTable)')) {
    failures.push('Le helper snapshot Project Center doit utiliser persistProjectCenterProjection.');
  }
  if (!consistencyCheckSource.includes("'projects'") || !consistencyCheckSource.includes('projectCenterProject')) {
    failures.push('Check de coherence Project Center incomplet pour projects.');
  }
  if (!packageJsonSource.includes('project-center:prisma-foundation:check') || !packageJsonSource.includes('project-center:prisma-consistency:check')) {
    failures.push('package.json doit exposer les checks Prisma Project Center.');
  }

  const report = {
    ok: failures.length === 0,
    models: ['ProjectCenterProject', 'ProjectCenterMilestone', 'ProjectCenterDocument'],
    requiredIndexes,
    migration: path.relative(repoRoot, migrationPath),
    failures,
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exit(1);
}

main();
