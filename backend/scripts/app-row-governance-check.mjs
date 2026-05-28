#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoRoot = path.resolve(backendRoot, '..');
const dataPolicyPath = path.join(backendRoot, 'src', 'data', 'data-access-policy.ts');
const persistencePath = path.join(backendRoot, 'src', 'database', 'platform-persistence.service.ts');
const chantiersPath = path.join(repoRoot, 'docs', 'TECHNICAL_DEBT_CHANTIERS.md');

const trackedAppRowDebtTables = new Set([
  'admin_accreditations',
  'admin_backups',
  'admin_campaigns',
  'admin_content_items',
  'admin_feature_flags',
  'admin_integrations',
  'admin_platform_categories',
  'admin_platform_rules',
  'admin_reports',
  'admin_security_alerts',
  'admin_audit_logs',
  'auth_sessions',
  'auth_users',
  'certificates',
  'client_favorites',
  'client_orders',
  'course_enrollments',
  'course_faq_items',
  'course_lessons',
  'course_reviews',
  'course_sections',
  'courses',
  'exams',
  'funding_investors',
  'lesson_assets',
  'lesson_comments',
  'lesson_progress',
  'messages',
  'conversations',
  'notifications',
  'project_collaborations',
  'project_documents',
  'project_funding_rounds',
  'project_history',
  'project_milestones',
  'project_partnerships',
  'project_tracking',
  'projects',
  'provider_reviews',
  'provider_services',
  'provider_verification_requests',
  'provider_visibility_orders',
  'provider_visibility_passes',
  'provider_visibility_products',
  'providers',
  'quiz_choices',
  'quiz_questions',
  'student_guardians',
  'submissions',
  'virtual_classes',
]);

const normalizedAuthTables = new Set([
  'auth_audit_logs',
  'auth_pending_2fa',
  'auth_refresh_tokens',
]);

function extractSetValues(source, setName) {
  const match = new RegExp(`(?:export\\s+)?const\\s+${setName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\);`).exec(source);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function extractKnownDataTables(source) {
  const tables = new Set();
  const setPattern = /(?:export\s+)?const\s+\w+TABLES\s*=\s*new Set\(\[([\s\S]*?)\]\);/g;
  for (const match of source.matchAll(setPattern)) {
    for (const valueMatch of match[1].matchAll(/'([^']+)'/g)) {
      tables.add(valueMatch[1]);
    }
  }
  return tables;
}

function extractNormalizedProjectionTables(source) {
  const match = /private\s+async\s+persistNormalizedProjection[\s\S]*?\n\s+}\n/.exec(source);
  if (!match) return new Set();
  return new Set([...match[0].matchAll(/rowsByTable\.([a-z0-9_]+)/g)].map((entry) => entry[1]));
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function difference(left, right) {
  return sorted([...left].filter((value) => !right.has(value)));
}

function main() {
  const policySource = fs.readFileSync(dataPolicyPath, 'utf8');
  const persistenceSource = fs.readFileSync(persistencePath, 'utf8');
  const chantiersSource = fs.existsSync(chantiersPath) ? fs.readFileSync(chantiersPath, 'utf8') : '';

  const knownTables = extractKnownDataTables(policySource);
  const publicReadTables = new Set(extractSetValues(policySource, 'PUBLIC_READ_TABLES'));
  const normalizedProjectionTables = new Set([
    ...extractNormalizedProjectionTables(persistenceSource),
    ...normalizedAuthTables,
  ]);
  const classifiedTables = new Set([
    ...normalizedProjectionTables,
    ...trackedAppRowDebtTables,
  ]);

  const unclassifiedTables = difference(knownTables, classifiedTables);
  const obsoleteDebtTables = difference(trackedAppRowDebtTables, knownTables);
  const projectedButStillDebt = sorted([...normalizedProjectionTables].filter((table) => trackedAppRowDebtTables.has(table)));
  const publicReadDebtTables = sorted([...publicReadTables].filter((table) => trackedAppRowDebtTables.has(table)));
  const failures = [];

  if (unclassifiedTables.length > 0) {
    failures.push(`Tables non classees AppRow/Prisma: ${unclassifiedTables.join(', ')}`);
  }
  if (obsoleteDebtTables.length > 0) {
    failures.push(`Tables suivies comme dette mais absentes de la policy: ${obsoleteDebtTables.join(', ')}`);
  }
  if (projectedButStillDebt.length > 0) {
    failures.push(`Tables a la fois projetees et suivies comme dette: ${projectedButStillDebt.join(', ')}`);
  }
  if (!chantiersSource.includes('Chantier 3 - Stabiliser `AppRow` et les projections Prisma')) {
    failures.push('docs/TECHNICAL_DEBT_CHANTIERS.md doit contenir le chantier AppRow/Prisma.');
  }

  const report = {
    ok: failures.length === 0,
    totals: {
      knownTables: knownTables.size,
      normalizedProjectionTables: normalizedProjectionTables.size,
      trackedAppRowDebtTables: trackedAppRowDebtTables.size,
      publicReadDebtTables: publicReadDebtTables.length,
      unclassifiedTables: unclassifiedTables.length,
    },
    normalizedProjectionTables: sorted(normalizedProjectionTables),
    trackedAppRowDebtTables: sorted(trackedAppRowDebtTables),
    publicReadDebtTables,
    unclassifiedTables,
    obsoleteDebtTables,
    projectedButStillDebt,
    failures,
  };

  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
