#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const policyPath = path.join(backendRoot, 'src', 'data', 'data-access-policy.ts');

function extractSetValues(source, setName) {
  const match = new RegExp(`(?:export\\s+)?const\\s+${setName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\);`).exec(source);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function printList(title, values) {
  console.log(`\n${title} (${values.length})`);
  if (values.length === 0) {
    console.log('- none');
    return;
  }
  for (const value of values) {
    console.log(`- ${value}`);
  }
}

const source = fs.readFileSync(policyPath, 'utf8');

const sets = {
  publicRead: extractSetValues(source, 'PUBLIC_READ_TABLES'),
  adminOnly: extractSetValues(source, 'ADMIN_ONLY_TABLES'),
  appendOnly: extractSetValues(source, 'APPEND_ONLY_TABLES'),
  commandOnlyWrite: extractSetValues(source, 'COMMAND_ONLY_WRITE_TABLES'),
  providerCatalog: extractSetValues(source, 'PROVIDER_CATALOG_TABLES'),
  reviews: extractSetValues(source, 'REVIEW_TABLES'),
  marketplace: extractSetValues(source, 'MARKETPLACE_TABLES'),
  finance: extractSetValues(source, 'FINANCE_TABLES'),
  subscriptions: extractSetValues(source, 'SUBSCRIPTION_TABLES'),
  learning: extractSetValues(source, 'LEARNING_TABLES'),
  messaging: extractSetValues(source, 'MESSAGING_TABLES'),
  notifications: extractSetValues(source, 'NOTIFICATION_TABLES'),
  projects: extractSetValues(source, 'PROJECT_TABLES'),
};

const knownTables = uniqueSorted(Object.values(sets).flat());
const sensitiveTables = uniqueSorted([
  ...sets.adminOnly,
  ...sets.finance,
  ...sets.subscriptions,
  ...sets.messaging,
  ...sets.notifications,
]);
const readOnlyPublicTables = uniqueSorted(difference(sets.publicRead, sensitiveTables));
const commandOnlySensitiveTables = uniqueSorted(intersection(sets.commandOnlyWrite, sensitiveTables));
const remainingMutationSurface = uniqueSorted(difference(knownTables, sets.commandOnlyWrite));
const remainingSensitiveMutationSurface = uniqueSorted(difference(sensitiveTables, sets.commandOnlyWrite));

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  policyFile: path.relative(backendRoot, policyPath),
  totals: {
    knownTables: knownTables.length,
    publicRead: sets.publicRead.length,
    adminOnly: sets.adminOnly.length,
    commandOnlyWrite: sets.commandOnlyWrite.length,
    sensitiveTables: sensitiveTables.length,
    remainingMutationSurface: remainingMutationSurface.length,
    remainingSensitiveMutationSurface: remainingSensitiveMutationSurface.length,
  },
  sets,
  priorities: {
    migrateFirst: uniqueSorted([
      ...sets.finance,
      ...sets.subscriptions,
      ...sets.messaging,
      ...sets.notifications,
    ]),
    remainingSensitiveMutationSurface,
    keepReadOnlyUntilDedicatedEndpoints: readOnlyPublicTables,
    alreadyCommandOnly: sets.commandOnlyWrite,
    commandOnlySensitiveTables,
    remainingMutationSurface,
  },
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(process.argv.includes('--strict') && remainingMutationSurface.length > 0 ? 1 : 0);
}

console.log('Legacy /data inventory');
console.log(`Policy: ${report.policyFile}`);
console.log(`Known tables: ${report.totals.knownTables}`);
console.log(`Command-only writes: ${report.totals.commandOnlyWrite}`);
console.log(`Sensitive tables: ${report.totals.sensitiveTables}`);
console.log(`Sensitive mutation surface: ${report.totals.remainingSensitiveMutationSurface}`);
console.log(`Remaining generic mutation surface: ${report.totals.remainingMutationSurface}`);

printList('P1 migrate first: sensitive/domain endpoints', report.priorities.migrateFirst);
printList('Sensitive tables still writable through legacy /data in compat mode', report.priorities.remainingSensitiveMutationSurface);
printList('P2 keep read-only until dedicated public/domain endpoints', report.priorities.keepReadOnlyUntilDedicatedEndpoints);
printList('Already blocked from generic writes', report.priorities.alreadyCommandOnly);
printList('Remaining mutation surface if DATA_LEGACY_API_MODE=compat', report.priorities.remainingMutationSurface);

if (process.argv.includes('--strict') && remainingMutationSurface.length > 0) {
  console.error('\nlegacy-data-inventory: strict mode failed, generic mutation surface must stay empty.');
  process.exit(1);
}
