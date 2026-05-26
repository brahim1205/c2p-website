#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

const frontendApiModuleAggregates = new Map([
  ['front/src/lib/adminApi.ts', ['front/src/lib/admin-api', 'front/src/lib/adminFinanceApi.ts', 'front/src/lib/adminResourceApi.ts']],
  ['front/src/lib/apprenantDashboardApi.ts', ['front/src/lib/apprenant-dashboard-api']],
  ['front/src/lib/clientDashboardApi.ts', ['front/src/lib/client-dashboard-api']],
  ['front/src/lib/formateurDashboardApi.ts', ['front/src/lib/formateur-dashboard-api', 'front/src/lib/formateurCoursesApi.ts']],
  ['front/src/lib/projectApi.ts', ['front/src/lib/project-api']],
]);

function readTextFile(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function collectTextFiles(filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    return [fs.readFileSync(absolutePath, 'utf8')];
  }

  return walkFiles(absolutePath, (candidatePath) => /\.(ts|tsx)$/.test(candidatePath))
    .sort((left, right) => left.localeCompare(right))
    .map((candidatePath) => fs.readFileSync(candidatePath, 'utf8'));
}

function readRepoFile(filePath) {
  const content = readTextFile(filePath);
  const aggregatePaths = frontendApiModuleAggregates.get(filePath) ?? [];
  const aggregateContent = aggregatePaths.flatMap(collectTextFiles).join('\n');
  return [content, aggregateContent].filter(Boolean).join('\n');
}

function fail(messages) {
  console.error('CI governance check: FAILED');
  for (const message of messages) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

function assertContains(content, filePath, expected, failures) {
  if (!content.includes(expected)) {
    failures.push(`${filePath} doit contenir: ${expected}`);
  }
}

function walkFiles(directory, predicate) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(fullPath, predicate));
      continue;
    }
    if (entry.isFile() && predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

function assertNoDirectFrontendDataApiUsage(failures) {
  const allowed = new Set(['front/src/lib/backendClient.ts']);
  const frontSrc = path.join(repoRoot, 'front/src');
  const files = walkFiles(frontSrc, (filePath) => /\.(ts|tsx)$/.test(filePath));
  for (const filePath of files) {
    const repoPath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    if (allowed.has(repoPath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (/['"`]\/data\//.test(content) || /apiRequest\s*<[^>]*>\s*\(\s*`\/data\//.test(content)) {
      failures.push(`${repoPath}: accès direct à /data interdit. Passer par front/src/lib/backendClient.ts ou créer un endpoint métier dédié.`);
    }
  }
}

function extractSetValues(content, setName) {
  const setMatch = new RegExp(`(?:export\\s+)?const\\s+${setName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\);`).exec(content);
  if (!setMatch) return [];
  return [...setMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function extractAllDataPolicyTables(content) {
  const tables = new Set();
  const setPattern = /(?:export\s+)?const\s+(\w+TABLES)\s*=\s*new Set\(\[([\s\S]*?)\]\);/g;
  for (const match of content.matchAll(setPattern)) {
    for (const valueMatch of match[2].matchAll(/'([^']+)'/g)) {
      tables.add(valueMatch[1]);
    }
  }
  return tables;
}

function assertDataRowAccessCoverage(dataAccessPolicy, dataRowAccess, failures) {
  const allTables = extractAllDataPolicyTables(dataAccessPolicy);
  const adminOnlyTables = new Set(extractSetValues(dataAccessPolicy, 'ADMIN_ONLY_TABLES'));
  const rowAccessCases = new Set([...dataRowAccess.matchAll(/case\s+'([^']+)'\s*:/g)].map((match) => match[1]));

  for (const table of allTables) {
    if (adminOnlyTables.has(table)) continue;
    if (!rowAccessCases.has(table)) {
      failures.push(`backend/src/data/data-row-access.ts doit filtrer explicitement la table data "${table}".`);
    }
  }
}

function isTrackedByGit(repoPath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', repoPath], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const failures = [];
  const ciPath = '.github/workflows/ci.yml';
  const deployPath = '.github/workflows/deploy-production.yml';
  const rootGitignorePath = '.gitignore';
  const backendDockerignorePath = 'backend/.dockerignore';
  const backendProdEnvExamplePath = 'backend/.env.prod.example';
  const opsProdEnvExamplePath = 'ops/env/backend.production.env.example';
  const backendComposePath = 'backend/docker-compose.yml';
  const backendPackagePath = 'backend/package.json';
  const frontendPackagePath = 'front/package.json';
  const metricsTokenPath = 'ops/monitoring/prometheus/secrets/metrics-token';
  const metricsGitkeepPath = 'ops/monitoring/prometheus/secrets/.gitkeep';
  const ci = readRepoFile(ciPath);
  const deploy = readRepoFile(deployPath);
  const rootGitignore = readRepoFile(rootGitignorePath);
  const backendDockerignore = readRepoFile(backendDockerignorePath);
  const backendDockerfile = readRepoFile('backend/Dockerfile');
  const authController = readRepoFile('backend/src/auth/auth.controller.ts');
  const authService = readRepoFile('backend/src/auth/auth.service.ts');
  const dataAccessPolicy = readRepoFile('backend/src/data/data-access-policy.ts');
  const dataTableAccess = readRepoFile('backend/src/data/data-table-access.ts');
  const dataRowAccess = readRepoFile('backend/src/data/data-row-access.ts');
  const dataRuntime = readRepoFile('backend/src/data/data-runtime.ts');
  const dataFinanceRuntime = readRepoFile('backend/src/data/data-finance-runtime.ts');
  const dataController = readRepoFile('backend/src/data/data.controller.ts');
  const dataLegacyApiPolicy = readRepoFile('backend/src/data/data-legacy-api-policy.ts');
  const dataMutationSanitizers = readRepoFile('backend/src/data/data-mutation-sanitizers.ts');
  const dataResponseSanitizers = readRepoFile('backend/src/data/data-response-sanitizers.ts');
  const dataProviderVisibilityRuntime = readRepoFile('backend/src/data/data-provider-visibility-runtime.ts');
  const dataDeleteCascade = readRepoFile('backend/src/data/data-delete-cascade.ts');
  const dataModule = readRepoFile('backend/src/data/data.module.ts');
  const monitoringService = readRepoFile('backend/src/monitoring/monitoring.service.ts');
  const prometheusAlerts = readRepoFile('ops/monitoring/prometheus/alerts.yml');
  const dataAccessCheck = readRepoFile('backend/scripts/data-access-check.mjs');
  const legacyDataInventory = readRepoFile('backend/scripts/legacy-data-inventory.mjs');
  const legacyDataModeCheck = readRepoFile('backend/scripts/legacy-data-mode-check.mjs');
  const architectureRiskRegister = readRepoFile('docs/ARCHITECTURE_RISK_REGISTER.md');
  const projectCenterPage = readRepoFile('front/src/pages/project-center/page.tsx');
  const projectCenterDetailPage = readRepoFile('front/src/pages/project-center/projet/page.tsx');
  const projectCenterSubmitPage = readRepoFile('front/src/pages/project-center/soumettre/page.tsx');
  const projectCenterApi = readRepoFile('front/src/lib/projectCenterApi.ts');
  const learningController = readRepoFile('backend/src/learning/learning.controller.ts');
  const learningAccessService = readRepoFile('backend/src/learning/learning-access.service.ts');
  const learningService = readRepoFile('backend/src/learning/learning.service.ts');
  const formateurCommunityService = readRepoFile('backend/src/learning/formateur-community.service.ts');
  const formateurCourseProgramService = readRepoFile('backend/src/learning/formateur-course-program.service.ts');
  const formateurLearnersService = readRepoFile('backend/src/learning/formateur-learners.service.ts');
  const formateurVirtualClassesService = readRepoFile('backend/src/learning/formateur-virtual-classes.service.ts');
  const apprenantDashboardApi = readRepoFile('front/src/lib/apprenantDashboardApi.ts');
  const espaceNumeriqueApi = readRepoFile('front/src/lib/espaceNumeriqueApi.ts');
  const parentDashboardApi = readRepoFile('front/src/lib/parentDashboardApi.ts');
  const formateurDashboardApi = readRepoFile('front/src/lib/formateurDashboardApi.ts');
  const formateurPublicProfilePage = readRepoFile('front/src/pages/dashboard/formateur/profil-public/page.tsx');
  const publicInstructorProfilePage = readRepoFile('front/src/pages/formateurs/[id]/page.tsx');
  const espaceNumeriqueCatalogPage = readRepoFile('front/src/pages/espace-numerique/page.tsx');
  const espaceNumeriqueFormationPage = readRepoFile('front/src/pages/espace-numerique/formation/page.tsx');
  const espaceNumeriqueLearningPage = readRepoFile('front/src/pages/espace-numerique/mon-apprentissage/page.tsx');
  const espaceNumeriqueVirtualClassPage = readRepoFile('front/src/pages/espace-numerique/classe-virtuelle/page.tsx');
  const accountApi = readRepoFile('front/src/lib/accountApi.ts');
  const marketplaceController = readRepoFile('backend/src/marketplace/marketplace.controller.ts');
  const marketplaceService = readRepoFile('backend/src/marketplace/marketplace.service.ts');
  const adminController = readRepoFile('backend/src/admin/admin.controller.ts');
  const adminService = readRepoFile('backend/src/admin/admin.service.ts');
  const notificationsController = readRepoFile('backend/src/notifications/notifications.controller.ts');
  const notificationsService = readRepoFile('backend/src/notifications/notifications.service.ts');
  const messagingController = readRepoFile('backend/src/messaging/messaging.controller.ts');
  const messagingService = readRepoFile('backend/src/messaging/messaging.service.ts');
  const clientDashboardApi = readRepoFile('front/src/lib/clientDashboardApi.ts');
  const prestataireDashboardApi = readRepoFile('front/src/lib/prestataireDashboardApi.ts');
  const providerApi = readRepoFile('front/src/lib/providerApi.ts');
  const notificationsApi = readRepoFile('front/src/lib/notificationsApi.ts');
  const messagingApi = readRepoFile('front/src/lib/messagingApi.ts');
  const onboardingClausesApi = readRepoFile('front/src/lib/onboardingClauses.ts');
  const useNotificationsHook = readRepoFile('front/src/hooks/useNotifications.tsx');
  const useCreateNotificationHook = readRepoFile('front/src/hooks/useCreateNotification.ts');
  const useBackendMessagingHook = readRepoFile('front/src/hooks/useBackendMessaging.ts');
  const alloprestaPrestatairePage = readRepoFile('front/src/pages/allopresta/prestataire/page.tsx');
  const paymentCommands = readRepoFile('backend/src/payments/payment-commands.service.ts');
  const providerIntegration = readRepoFile('backend/src/payments/provider-integration.service.ts');
  const backendProdEnvExample = readRepoFile(backendProdEnvExamplePath);
  const opsProdEnvExample = readRepoFile(opsProdEnvExamplePath);
  const backendCompose = readRepoFile(backendComposePath);
  const backendPackage = readRepoFile(backendPackagePath);
  const frontendPackage = readRepoFile(frontendPackagePath);
  const deployScript = readRepoFile('ops/scripts/deploy-production.sh');
  const productionRuntimeCheck = readRepoFile('ops/scripts/production-runtime-check.mjs');
  const productionPreflight = readRepoFile('ops/scripts/production-preflight.mjs');
  const productionEnvStatus = readRepoFile('ops/scripts/production-env-status.mjs');
  const productionReadinessReport = readRepoFile('ops/scripts/production-readiness-report.mjs');

  const requiredCiSnippets = [
    'permissions:',
    'contents: read',
    'services:',
    'postgres:16-alpine',
    'npm run production:runtime:check',
    'npm run production:compose:check -- --compose-env ops/env/compose.production.env.example',
    'bash -n ops/scripts/deploy-production.sh',
    'node --check ops/scripts/postgres-restore-drill.mjs',
    'node --check ops/scripts/prepare-production-env.mjs',
    'node --check ops/scripts/production-env-set.mjs',
    'node --check ops/scripts/production-env-status.mjs',
    'node --check ops/scripts/production-external-providers-check.mjs',
    'node --check ops/scripts/production-readiness-report.mjs',
    'node --check ops/scripts/production-postdeploy-check.mjs',
    'node --check front/scripts/state-boundary-check.mjs',
    'npm run production:postdeploy --',
    '--skip-upload-temp-cleanup',
    'npm run prisma:validate',
    'npx prisma db push --skip-generate',
    'npm run db:ledger-immutability:local',
    'npm run db:seed:local',
    'npm run finance:validate',
    'npm run uploads:validate',
    'npm run email:provider:check',
    'npm run swagger:check',
    'npm run data:legacy-mode:test',
    'npm run state:check',
    'npm run http:checks',
    'npm run bundle:budget',
    'npm run smoke:test',
    'aquasecurity/trivy-action',
  ];

  for (const snippet of requiredCiSnippets) {
    assertContains(ci, ciPath, snippet, failures);
  }

  const requiredDeploySnippets = [
    'workflow_run:',
    'monorepo-ci',
    'concurrency:',
    'production-deploy',
    'permissions:',
    'contents: read',
    'environment:',
    'name: production',
    'PRODUCTION_SSH_KNOWN_HOSTS',
    'PRODUCTION_ALLOW_SSH_KEYSCAN',
    'PRODUCTION_POSTDEPLOY_RESTORE_DRILL',
    'DEPLOY_REF',
    'StrictHostKeyChecking=yes',
    './ops/scripts/deploy-production.sh',
  ];

  for (const snippet of requiredDeploySnippets) {
    assertContains(deploy, deployPath, snippet, failures);
  }

  assertContains(rootGitignore, rootGitignorePath, 'backend/storage/uploads/', failures);
  assertContains(rootGitignore, rootGitignorePath, 'ops/env/*.env', failures);
  assertContains(rootGitignore, rootGitignorePath, 'ops/monitoring/prometheus/secrets/*', failures);
  assertContains(rootGitignore, rootGitignorePath, '!ops/monitoring/prometheus/secrets/.gitkeep', failures);
  assertContains(backendDockerignore, backendDockerignorePath, 'storage/uploads', failures);
  assertContains(backendDockerfile, 'backend/Dockerfile', 'COPY scripts/upload-temp-cleanup.mjs', failures);
  assertContains(dataAccessPolicy, 'backend/src/data/data-access-policy.ts', 'COMMAND_ONLY_WRITE_TABLES', failures);
  for (const commandOnlyTable of [
    'payment_transactions',
    'wallet_accounts',
    'invoices',
    'payout_accounts',
    'payout_requests',
    'commission_ledger',
    'escrow_cases',
    'provider_visibility_orders',
    'user_subscriptions',
    'provider_visibility_passes',
    'provider_visibility_products',
    'subscription_plans',
    'conversations',
    'messages',
    'notifications',
    'admin_accreditations',
    'admin_content_items',
    'admin_campaigns',
    'admin_reports',
    'admin_platform_categories',
    'admin_platform_rules',
    'admin_feature_flags',
    'admin_integrations',
    'admin_backups',
    'admin_security_alerts',
    'admin_audit_logs',
    'auth_users',
    'auth_sessions',
  ]) {
    assertContains(dataAccessPolicy, 'backend/src/data/data-access-policy.ts', `'${commandOnlyTable}'`, failures);
    assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', `'${commandOnlyTable}'`, failures);
  }
  assertContains(dataTableAccess, 'backend/src/data/data-table-access.ts', 'se modifie via un endpoint metier dedie', failures);
  assertContains(dataRowAccess, 'backend/src/data/data-row-access.ts', 'default:', failures);
  assertContains(dataRowAccess, 'backend/src/data/data-row-access.ts', 'return [];', failures);
  if (/default:\s*(?:if\s*\([^)]*\)\s*return\s*\[\];\s*)?return\s+rows\s*;/m.test(dataRowAccess)) {
    failures.push('backend/src/data/data-row-access.ts doit rester deny-by-default pour les tables non explicitement filtrées.');
  }
  assertDataRowAccessCoverage(dataAccessPolicy, dataRowAccess, failures);
  assertContains(dataRuntime, 'backend/src/data/data-runtime.ts', 'registerAppStoreDerivedDataRecomputer', failures);
  assertContains(dataFinanceRuntime, 'backend/src/data/data-finance-runtime.ts', 'createFinanceSideEffectsContext', failures);
  assertContains(dataController, 'backend/src/data/data.controller.ts', './data-mutation-sanitizers.js', failures);
  assertContains(dataController, 'backend/src/data/data.controller.ts', './data-response-sanitizers.js', failures);
  assertContains(dataController, 'backend/src/data/data.controller.ts', './data-provider-visibility-runtime.js', failures);
  assertContains(dataController, 'backend/src/data/data.controller.ts', './data-legacy-api-policy.js', failures);
  assertContains(dataController, 'backend/src/data/data.controller.ts', 'assertLegacyDataAccess', failures);
  assertContains(dataController, 'backend/src/data/data.controller.ts', 'recordLegacyDataApiRequest', failures);
  assertContains(dataModule, 'backend/src/data/data.module.ts', 'MonitoringModule', failures);
  assertContains(monitoringService, 'backend/src/monitoring/monitoring.service.ts', 'c2p_legacy_data_api_requests_total', failures);
  assertContains(monitoringService, 'backend/src/monitoring/monitoring.service.ts', 'recordLegacyDataApiRequest', failures);
  assertContains(prometheusAlerts, 'ops/monitoring/prometheus/alerts.yml', 'C2PLegacyDataMutationAttempt', failures);
  assertContains(prometheusAlerts, 'ops/monitoring/prometheus/alerts.yml', 'C2PLegacyDataApiStillUsed', failures);
  assertContains(dataLegacyApiPolicy, 'backend/src/data/data-legacy-api-policy.ts', "export type LegacyDataApiMode = 'compat' | 'read-only' | 'disabled'", failures);
  assertContains(dataLegacyApiPolicy, 'backend/src/data/data-legacy-api-policy.ts', 'getLegacyDataApiMode', failures);
  assertContains(dataLegacyApiPolicy, 'backend/src/data/data-legacy-api-policy.ts', 'assertLegacyDataApiAllowed', failures);
  assertContains(dataLegacyApiPolicy, 'backend/src/data/data-legacy-api-policy.ts', "mode === 'read-only' && operation !== 'GET'", failures);
  assertContains(dataMutationSanitizers, 'backend/src/data/data-mutation-sanitizers.ts', 'export function sanitizeCreatePayload', failures);
  assertContains(dataMutationSanitizers, 'backend/src/data/data-mutation-sanitizers.ts', 'export function sanitizeUpdatePayload', failures);
  assertContains(dataResponseSanitizers, 'backend/src/data/data-response-sanitizers.ts', 'export function sanitizeRowsForActor', failures);
  assertContains(dataResponseSanitizers, 'backend/src/data/data-response-sanitizers.ts', "table === 'projects' && !isAdminRole(user)", failures);
  assertContains(dataResponseSanitizers, 'backend/src/data/data-response-sanitizers.ts', "user.role === 'porteur' && String(row.owner_id) === String(user.id)", failures);
  assertContains(dataResponseSanitizers, 'backend/src/data/data-response-sanitizers.ts', "case 'project_documents':", failures);
  assertContains(dataResponseSanitizers, 'backend/src/data/data-response-sanitizers.ts', "case 'funding_investors':", failures);
  assertContains(dataResponseSanitizers, 'backend/src/data/data-response-sanitizers.ts', 'return []', failures);
  assertContains(dataProviderVisibilityRuntime, 'backend/src/data/data-provider-visibility-runtime.ts', 'export function createProviderVisibilityContext', failures);
  assertContains(dataDeleteCascade, 'backend/src/data/data-delete-cascade.ts', 'export function applyDataDeleteCascade', failures);
  assertContains(dataController, 'backend/src/data/data.controller.ts', './data-delete-cascade.js', failures);
  assertContains(paymentCommands, 'backend/src/payments/payment-commands.service.ts', '../data/data-finance-runtime.js', failures);
  assertContains(paymentCommands, 'backend/src/payments/payment-commands.service.ts', '../data/data-runtime.js', failures);
  assertContains(providerIntegration, 'backend/src/payments/provider-integration.service.ts', '../data/data-finance-runtime.js', failures);
  if (paymentCommands.includes('../data/data.controller.js') || providerIntegration.includes('../data/data.controller.js')) {
    failures.push('payments ne doit pas importer data.controller.ts. Utiliser data-runtime/data-finance-runtime.');
  }
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', 'commandOnlyWriteTables', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', 'expected 400 on command-only table generic POST', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', 'clientForbiddenFinanceReads', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', "client must not receive another user's finance rows", failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', 'anonymous project documents must not leak business plan or private file metadata', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', 'anonymous funding rounds must not expose internal financial diligence fields', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', 'non-owner authenticated users must receive only public project fields', failures);
  assertContains(legacyDataModeCheck, 'backend/scripts/legacy-data-mode-check.mjs', 'assertBlocked', failures);
  assertContains(legacyDataModeCheck, 'backend/scripts/legacy-data-mode-check.mjs', "assertAllowed('read-only', 'GET')", failures);
  assertContains(legacyDataModeCheck, 'backend/scripts/legacy-data-mode-check.mjs', "assertBlocked('disabled', operation)", failures);
  assertContains(legacyDataInventory, 'backend/scripts/legacy-data-inventory.mjs', 'Legacy /data inventory', failures);
  assertContains(legacyDataInventory, 'backend/scripts/legacy-data-inventory.mjs', 'remainingMutationSurface', failures);
  assertContains(legacyDataInventory, 'backend/scripts/legacy-data-inventory.mjs', 'remainingSensitiveMutationSurface', failures);
  assertContains(legacyDataInventory, 'backend/scripts/legacy-data-inventory.mjs', 'migrateFirst', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/projects', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/projects/4001', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/submissions', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/owner/projects', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/owner/snapshot', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/owner/funding-rounds', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/owner/partnerships', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/partner/tracked-projects', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/partner/snapshot', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/partner/collaborations', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/partner/open-projects', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/partner/interests', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/partner/support-conversations', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/project-center/admin/dashboard-summary', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/courses/201', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/public/instructors/usr-formateur/courses', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/courses/201/progress', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/enrollments', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/certificates', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/dashboard', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/progression', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/parent/dashboard', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/exams', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/exams/7001/quiz', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/apprenant/exams/7001/submissions', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/evaluations', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/exams', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/submissions/8001/grade', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/courses', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/courses/bundle', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/courses/201/program', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/courses/201/sections', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/courses/201/lessons', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/courses/201/assets', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/certificates', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/learners', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/learners/usr-apprenant', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/virtual-classes', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/community', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/learning/formateur/community/faqs', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/providers/public', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/providers/public/${encodeURIComponent(String(firstProviderId))}/reviews', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/client/providers/${encodeURIComponent(String(firstProviderId))}/reviews', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/providers/by-user/usr-prestataire', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/client/dashboard', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/client/bookings', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/client/providers', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/client/favorites', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/prestataire/dashboard', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/marketplace/prestataire/services', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/admin/resources/accreditations', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/admin/resources/featureFlags', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/admin/dashboard-data', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/admin/analytics-data', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/notifications/me', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/notifications/provider-recipients/3', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/messaging/conversations', failures);
  assertContains(dataAccessCheck, 'backend/scripts/data-access-check.mjs', '/messages', failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "@Controller('learning')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('public/instructors/:instructorId/courses')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "RequirePermission('data.learning.read')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "RequirePermission('data.learning.write')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/evaluations')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('parent/dashboard')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Post('formateur/exams')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Patch('formateur/submissions/:submissionId/grade')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/courses')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Post('formateur/courses/bundle')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/courses/:courseId/program')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Post('formateur/courses/:courseId/sections')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Post('formateur/courses/:courseId/lessons')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Post('formateur/courses/:courseId/assets')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/certificates')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Patch('formateur/certificates/:certId/issue')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Delete('formateur/certificates/:certId')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/learners')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/learners/:studentId')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/virtual-classes')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Post('formateur/virtual-classes')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Patch('formateur/virtual-classes/:classId/status')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Get('formateur/community')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Patch('formateur/community/comments/:commentId')", failures);
  assertContains(learningController, 'backend/src/learning/learning.controller.ts', "Post('formateur/community/faqs')", failures);
  assertContains(learningAccessService, 'backend/src/learning/learning-access.service.ts', 'learning:apprenant:progress:update', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'learning:apprenant:exam:submit', failures);
  assertContains(learningAccessService, 'backend/src/learning/learning-access.service.ts', 'learning:apprenant:course:enroll', failures);
  assertContains(learningAccessService, 'backend/src/learning/learning-access.service.ts', 'learning:apprenant:course-review:create', failures);
  assertContains(learningAccessService, 'backend/src/learning/learning-access.service.ts', 'learning:apprenant:lesson-progress:update', failures);
  assertContains(learningAccessService, 'backend/src/learning/learning-access.service.ts', 'learning:apprenant:lesson-comment:create', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'learning:formateur:exam:create', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'learning:formateur:submission:grade', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'sanitizeSubmissionRecord', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'sanitizeExamRecord', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'sanitizeQuizQuestionRecord', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'sanitizeQuizChoiceRecord', failures);
  assertContains(learningService, 'backend/src/learning/learning.service.ts', 'filterRowsForActor', failures);
  assertContains(formateurCommunityService, 'backend/src/learning/formateur-community.service.ts', 'learning:formateur:community-comment:moderate', failures);
  assertContains(formateurCommunityService, 'backend/src/learning/formateur-community.service.ts', 'learning:formateur:community-comment:reply', failures);
  assertContains(formateurCommunityService, 'backend/src/learning/formateur-community.service.ts', 'learning:formateur:community-faq:create', failures);
  assertContains(formateurCommunityService, 'backend/src/learning/formateur-community.service.ts', 'learning:formateur:community-faq:update', failures);
  assertContains(formateurCommunityService, 'backend/src/learning/formateur-community.service.ts', 'sanitizeLessonCommentRecord', failures);
  assertContains(formateurCommunityService, 'backend/src/learning/formateur-community.service.ts', 'sanitizeCourseFaqRecord', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'learning:formateur:course-bundle:create', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'learning:formateur:course:update', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'learning:formateur:course-section:create', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'learning:formateur:course-lesson:create', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'learning:formateur:lesson-asset:create', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'sanitizeCourseRecord', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'sanitizeCourseSectionRecord', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'sanitizeCourseLessonRecord', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'sanitizeLessonAssetRecord', failures);
  assertContains(formateurCourseProgramService, 'backend/src/learning/formateur-course-program.service.ts', 'applyDataDeleteCascade', failures);
  assertContains(formateurLearnersService, 'backend/src/learning/formateur-learners.service.ts', 'learning:formateur:certificate:issue', failures);
  assertContains(formateurLearnersService, 'backend/src/learning/formateur-learners.service.ts', 'learning:formateur:certificate:delete', failures);
  assertContains(formateurLearnersService, 'backend/src/learning/formateur-learners.service.ts', 'getLearners', failures);
  assertContains(formateurLearnersService, 'backend/src/learning/formateur-learners.service.ts', 'getLearnerDetail', failures);
  assertContains(formateurLearnersService, 'backend/src/learning/formateur-learners.service.ts', 'filterRowsForActor', failures);
  assertContains(formateurLearnersService, 'backend/src/learning/formateur-learners.service.ts', 'PlatformPersistenceService', failures);
  assertContains(formateurVirtualClassesService, 'backend/src/learning/formateur-virtual-classes.service.ts', 'learning:formateur:virtual-class:create', failures);
  assertContains(formateurVirtualClassesService, 'backend/src/learning/formateur-virtual-classes.service.ts', 'learning:formateur:virtual-class:update', failures);
  assertContains(formateurVirtualClassesService, 'backend/src/learning/formateur-virtual-classes.service.ts', 'learning:formateur:virtual-class:delete', failures);
  assertContains(formateurVirtualClassesService, 'backend/src/learning/formateur-virtual-classes.service.ts', 'sanitizeVirtualClassRecord', failures);
  assertContains(formateurVirtualClassesService, 'backend/src/learning/formateur-virtual-classes.service.ts', 'appendVirtualClassCreateEvents', failures);
  assertContains(formateurVirtualClassesService, 'backend/src/learning/formateur-virtual-classes.service.ts', 'appendVirtualClassUpdateEvents', failures);
  for (const snippet of [
    "Get('public/courses')",
    "Get('public/courses/:courseId')",
    "Get('public/virtual-classes/:classId')",
    "Get('apprenant/courses/:courseId/context')",
    "Post('apprenant/courses/:courseId/enroll')",
    "Post('apprenant/courses/:courseId/reviews')",
    "Patch('apprenant/courses/:courseId/lessons/:lessonId/progress')",
    "Get('apprenant/lessons/:lessonId/comments')",
    "Post('apprenant/lessons/:lessonId/comments')",
  ]) {
    assertContains(learningController, 'backend/src/learning/learning.controller.ts', snippet, failures);
  }
  for (const snippet of [
    "'/learning/public/courses'",
    "`/learning/public/courses/${encodeURIComponent(String(courseId))}`",
    "`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/context`",
    "`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/enroll`",
    "`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/reviews`",
    "`/learning/public/virtual-classes/${encodeURIComponent(String(classId))}`",
    "`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/lessons/${encodeURIComponent(String(lessonId))}/progress`",
    "`/learning/apprenant/lessons/${encodeURIComponent(String(lessonId))}/comments`",
  ]) {
    assertContains(espaceNumeriqueApi, 'front/src/lib/espaceNumeriqueApi.ts', snippet, failures);
  }
  for (const [filePath, content] of [
    ['front/src/lib/espaceNumeriqueApi.ts', espaceNumeriqueApi],
    ['front/src/pages/espace-numerique/page.tsx', espaceNumeriqueCatalogPage],
    ['front/src/pages/espace-numerique/formation/page.tsx', espaceNumeriqueFormationPage],
    ['front/src/pages/espace-numerique/mon-apprentissage/page.tsx', espaceNumeriqueLearningPage],
    ['front/src/pages/espace-numerique/classe-virtuelle/page.tsx', espaceNumeriqueVirtualClassPage],
  ]) {
    if (content.includes('backendClient')) {
      failures.push(`${filePath} doit utiliser les endpoints /learning/*, sans backendClient direct.`);
    }
  }
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', "`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}`", failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', "`/learning/apprenant/courses/${encodeURIComponent(String(courseId))}/progress`", failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', '/learning/apprenant/enrollments', failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', '/learning/apprenant/certificates', failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', "'/learning/apprenant/dashboard'", failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', "'/learning/apprenant/progression'", failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', "'/learning/apprenant/exams'", failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', '`/learning/apprenant/exams/${encodeURIComponent(String(examId))}/quiz`', failures);
  assertContains(apprenantDashboardApi, 'front/src/lib/apprenantDashboardApi.ts', '`/learning/apprenant/exams/${encodeURIComponent(String(input.exam.id))}/submissions`', failures);
  assertContains(parentDashboardApi, 'front/src/lib/parentDashboardApi.ts', "'/learning/parent/dashboard'", failures);
  if (parentDashboardApi.includes('backendClient')) {
    failures.push('front/src/lib/parentDashboardApi.ts doit utiliser /learning/parent/dashboard, pas backendClient direct.');
  }
  const apprenantCourseDetailMatch = /export async function fetchApprenantCourseDetail[\s\S]*?^}/m.exec(apprenantDashboardApi);
  if (!apprenantCourseDetailMatch || apprenantCourseDetailMatch[0].includes('backendClient.from')) {
    failures.push('front/src/lib/apprenantDashboardApi.ts fetchApprenantCourseDetail doit utiliser /learning/apprenant/courses/:id, pas backendClient.from.');
  }
  const apprenantProgressMatch = /export async function updateApprenantEnrollmentProgress[\s\S]*?^}/m.exec(apprenantDashboardApi);
  if (!apprenantProgressMatch || apprenantProgressMatch[0].includes('backendClient.from')) {
    failures.push('front/src/lib/apprenantDashboardApi.ts updateApprenantEnrollmentProgress doit utiliser /learning/apprenant/courses/:id/progress, pas backendClient.from.');
  }
  for (const functionName of [
    'fetchApprenantEnrollments',
    'fetchApprenantCertificates',
    'fetchApprenantDashboardSnapshot',
    'fetchApprenantProgressionSnapshot',
    'fetchApprenantExamensSnapshot',
    'fetchApprenantQuizStructure',
    'submitApprenantExamAnswer',
  ]) {
    const match = new RegExp(`export async function ${functionName}[\\s\\S]*?^}`, 'm').exec(apprenantDashboardApi);
    if (!match || match[0].includes('backendClient.from')) {
      failures.push(`front/src/lib/apprenantDashboardApi.ts ${functionName} doit utiliser /learning/apprenant/*, pas backendClient.from.`);
    }
  }
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/evaluations'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/exams'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/courses'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/courses/bundle'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', '`/learning/formateur/courses/${encodeURIComponent(String(courseId))}`', failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', '`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/program`', failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/certificates'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', '`/learning/formateur/certificates/${encodeURIComponent(String(cert.id))}/issue`', failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', '`/learning/formateur/certificates/${encodeURIComponent(String(certId))}`', failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/learners'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', '`/learning/formateur/learners/${encodeURIComponent(studentId)}`', failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/virtual-classes'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', "'/learning/formateur/community'", failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', '`/learning/formateur/exams/${encodeURIComponent(String(examId))}/quiz`', failures);
  assertContains(formateurDashboardApi, 'front/src/lib/formateurDashboardApi.ts', '`/learning/formateur/submissions/${encodeURIComponent(String(input.submissionId))}/grade`', failures);
  if (formateurDashboardApi.includes('backendClient')) {
    failures.push('front/src/lib/formateurDashboardApi.ts doit rester entierement sur les endpoints /learning/formateur/*, sans backendClient direct.');
  }
  if (formateurPublicProfilePage.includes('backendClient')) {
    failures.push('front/src/pages/dashboard/formateur/profil-public/page.tsx doit utiliser /learning/formateur/courses via formateurDashboardApi, pas backendClient.');
  }
  assertContains(accountApi, 'front/src/lib/accountApi.ts', '`/learning/public/instructors/${encodeURIComponent(id)}/courses`', failures);
  if (publicInstructorProfilePage.includes('backendClient')) {
    failures.push('front/src/pages/formateurs/[id]/page.tsx doit utiliser /learning/public/instructors/:id/courses, pas backendClient direct.');
  }
  for (const functionName of [
    'fetchFormateurDashboardSnapshot',
    'fetchFormateurAnalytics',
    'fetchFormateurRevenueSnapshot',
    'fetchFormateurEvaluations',
    'fetchFormateurQuizStructure',
    'gradeFormateurSubmission',
    'createFormateurExam',
    'deleteFormateurExam',
    'createFormateurQuizQuestion',
    'updateFormateurQuizQuestion',
    'deleteFormateurQuizQuestion',
    'reorderFormateurQuizQuestion',
    'createFormateurQuizChoice',
    'updateFormateurQuizChoice',
    'deleteFormateurQuizChoice',
    'reorderFormateurQuizChoice',
    'fetchFormateurCourses',
    'createFormateurCourseBundle',
    'updateFormateurCourse',
    'updateFormateurCourseWorkflow',
    'deleteFormateurCourse',
    'fetchFormateurCourseProgram',
    'saveFormateurCourseSection',
    'saveFormateurCourseLesson',
    'saveFormateurLessonAsset',
    'deleteFormateurCourseSection',
    'deleteFormateurCourseLesson',
    'deleteFormateurLessonAsset',
    'reorderFormateurCourseSections',
    'reorderFormateurCourseLessons',
    'fetchFormateurCertificates',
    'issueFormateurCertificate',
    'deleteFormateurCertificate',
    'fetchFormateurLearners',
    'fetchFormateurLearnerDetail',
    'fetchFormateurVirtualClasses',
    'updateFormateurVirtualClassStatus',
    'createFormateurVirtualClass',
    'updateFormateurVirtualClass',
    'deleteFormateurVirtualClass',
    'fetchFormateurCommunity',
    'moderateFormateurCommunityComment',
    'replyToFormateurCommunityComment',
    'createFormateurFaq',
    'updateFormateurFaqStatus',
  ]) {
    const match = new RegExp(`export async function ${functionName}[\\s\\S]*?^}`, 'm').exec(formateurDashboardApi);
    if (!match || match[0].includes('backendClient.from')) {
      failures.push(`front/src/lib/formateurDashboardApi.ts ${functionName} doit utiliser /learning/formateur/*, pas backendClient.from.`);
    }
  }
  assertContains(marketplaceController, 'backend/src/marketplace/marketplace.controller.ts', "@Controller('marketplace')", failures);
  for (const snippet of [
    "Get('providers/public')",
    "Get('providers/public/:id/reviews')",
    "Get('providers/public/:id')",
    "Get('providers/by-user/:userId')",
    "Get('client/dashboard')",
    "Get('client/orders')",
    "Patch('client/orders/:orderId/status')",
    "Post('client/reports')",
    "Get('client/bookings')",
    "Patch('client/bookings/:bookingId/cancel')",
    "Post('client/reviews')",
    "Post('client/providers/:providerId/reviews')",
    "Get('client/providers')",
    "Post('client/favorites')",
    "Delete('client/favorites/:favoriteId')",
    "Post('client/bookings')",
    "Get('prestataire/dashboard')",
    "Post('prestataire/verification-requests')",
    "Get('prestataire/bookings')",
    "Patch('prestataire/bookings/:bookingId/status')",
    "Get('prestataire/reviews')",
    "Patch('prestataire/reviews/:reviewId/reply')",
    "Patch('prestataire/reviews/:reviewId/helpful')",
    "Get('prestataire/services')",
    "Post('prestataire/services')",
    "Patch('prestataire/services/:serviceId')",
    "Patch('prestataire/services/:serviceId/status')",
    "Delete('prestataire/services/:serviceId')",
  ]) {
    assertContains(marketplaceController, 'backend/src/marketplace/marketplace.controller.ts', snippet, failures);
  }
  for (const snippet of [
    'marketplace:client:order-status:update',
    'marketplace:client:report:create',
    'marketplace:client:booking:cancel',
    'marketplace:client:review:create',
    'marketplace:client:provider-review:create',
    'marketplace:client:favorite:create',
    'marketplace:client:favorite:delete',
    'marketplace:client:booking:create',
    'marketplace:prestataire:verification-request:create',
    'marketplace:prestataire:booking-status:update',
    'marketplace:prestataire:review:reply',
    'marketplace:prestataire:review:helpful',
    'marketplace:prestataire:service:create',
    'marketplace:prestataire:service:update',
    'marketplace:prestataire:service:delete',
  ]) {
    assertContains(marketplaceService, 'backend/src/marketplace/marketplace.service.ts', snippet, failures);
  }
  for (const [filePath, content] of [
    ['front/src/lib/clientDashboardApi.ts', clientDashboardApi],
    ['front/src/lib/prestataireDashboardApi.ts', prestataireDashboardApi],
    ['front/src/lib/providerApi.ts', providerApi],
    ['front/src/pages/allopresta/prestataire/page.tsx', alloprestaPrestatairePage],
  ]) {
    if (content.includes('backendClient')) {
      failures.push(`${filePath} doit utiliser les endpoints /marketplace/*, sans backendClient direct.`);
    }
  }
  for (const snippet of [
    "'/marketplace/client/dashboard'",
    "'/marketplace/client/orders'",
    "`/marketplace/client/orders/${encodeURIComponent(String(orderId))}/status`",
    "'/marketplace/client/reports'",
    "'/marketplace/client/bookings'",
    "`/marketplace/client/bookings/${encodeURIComponent(String(bookingId))}/cancel`",
    "'/marketplace/client/reviews'",
    "`/marketplace/client/providers/${encodeURIComponent(String(providerId))}/reviews`",
    "'/marketplace/client/providers'",
    "'/marketplace/client/favorites'",
    "`/marketplace/client/favorites/${encodeURIComponent(String(favoriteId))}`",
  ]) {
    assertContains(clientDashboardApi, 'front/src/lib/clientDashboardApi.ts', snippet, failures);
  }
  for (const snippet of [
    "'/marketplace/prestataire/dashboard'",
    "'/marketplace/prestataire/verification-requests'",
    "'/marketplace/prestataire/bookings'",
    "`/marketplace/prestataire/bookings/${encodeURIComponent(String(booking.id))}/status`",
    "'/marketplace/prestataire/reviews'",
    "`/marketplace/prestataire/reviews/${encodeURIComponent(String(review.id))}/reply`",
    "`/marketplace/prestataire/reviews/${encodeURIComponent(String(reviewId))}/helpful`",
    "'/marketplace/prestataire/services'",
    "`/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}`",
    "`/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}/status`",
  ]) {
    assertContains(prestataireDashboardApi, 'front/src/lib/prestataireDashboardApi.ts', snippet, failures);
  }
  for (const snippet of [
    "`/marketplace/providers/by-user/${encodeURIComponent(userId)}`",
    "'/marketplace/providers/public'",
    "`/marketplace/providers/public/${encodeURIComponent(String(id))}`",
    "`/marketplace/providers/public/${encodeURIComponent(String(id))}/reviews`",
  ]) {
    assertContains(providerApi, 'front/src/lib/providerApi.ts', snippet, failures);
  }
  assertContains(projectCenterApi, 'front/src/lib/projectCenterApi.ts', "apiRequest<PublicProject[]>('/project-center/projects')", failures);
  assertContains(projectCenterApi, 'front/src/lib/projectCenterApi.ts', '`/project-center/projects/${encodeURIComponent(String(projectId))}`', failures);
  assertContains(projectCenterApi, 'front/src/lib/projectCenterApi.ts', "apiRequest<ProjectSubmissionResponse>('/project-center/submissions'", failures);
  const projectApi = readRepoFile('front/src/lib/projectApi.ts');
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<ProjectRecord[]>('/project-center/owner/projects')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<OwnerDashboardSnapshot>('/project-center/owner/snapshot')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', '`/project-center/owner/projects/${encodeURIComponent(String(projectId))}`', failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<FundingRound[]>('/project-center/owner/funding-rounds')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', '`/project-center/owner/funding-rounds/${encodeURIComponent(String(roundId))}`', failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<ProjectPartnership[]>('/project-center/owner/partnerships')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<TrackedProject[]>('/project-center/partner/tracked-projects')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<PartnerDashboardSnapshot>('/project-center/partner/snapshot')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', '`/project-center/partner/tracked-projects/${encodeURIComponent(String(projectId))}`', failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<Collaboration[]>('/project-center/partner/collaborations')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<ProjectRecord[]>('/project-center/partner/open-projects')", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<PartnerInterestResult>('/project-center/partner/interests'", failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', '`/project-center/partner/collaborations/${encodeURIComponent(String(collaborationId))}`', failures);
  assertContains(projectApi, 'front/src/lib/projectApi.ts', "apiRequest<{ conversationId: string | number; messageId: string | number }>('/project-center/partner/support-conversations'", failures);
  if (projectApi.includes('backendClient')) {
    failures.push('front/src/lib/projectApi.ts doit rester sur les endpoints ProjectCenter dedies, sans backendClient direct.');
  }
  const adminApi = readRepoFile('front/src/lib/adminApi.ts');
  assertContains(adminApi, 'front/src/lib/adminApi.ts', "apiRequest<AdminProjectDashboardSummary>('/project-center/admin/dashboard-summary')", failures);
  for (const snippet of [
    "`/admin/resources/${encodeURIComponent(resource)}`",
    "`/admin/resources/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}`",
    "'/admin/dashboard-data'",
    "'/admin/analytics-data'",
    "`/admin/bookings/${encodeURIComponent(String(params.booking.id))}/assign`",
  ]) {
    assertContains(adminApi, 'front/src/lib/adminApi.ts', snippet, failures);
  }
  if (adminApi.includes('backendClient')) {
    failures.push('front/src/lib/adminApi.ts doit utiliser les endpoints /admin/*, /project-center/* et /payments/*, sans backendClient direct.');
  }
  if (adminApi.includes("from('projects')") || adminApi.includes("from('project_history')")) {
    failures.push('front/src/lib/adminApi.ts doit utiliser /project-center/admin/dashboard-summary pour les projets admin, pas backendClient.from(projects/project_history).');
  }
  for (const snippet of [
    "@Controller('admin')",
    "Get('resources/:resource')",
    "Post('resources/:resource')",
    "Patch('resources/:resource/:id')",
    "Delete('resources/:resource/:id')",
    "Get('dashboard-data')",
    "Patch('bookings/:bookingId/assign')",
    "Get('analytics-data')",
    "RequirePermission('data.admin.read')",
    "RequirePermission('data.admin.write')",
  ]) {
    assertContains(adminController, 'backend/src/admin/admin.controller.ts', snippet, failures);
  }
  for (const snippet of [
    'ADMIN_RESOURCES',
    "admin_accreditations",
    "admin_feature_flags",
    "auditLogs: { table: 'admin_audit_logs'",
    "admin:booking:assign-provider",
    "syncAppStoreFromDatabase",
    "PlatformPersistenceService",
  ]) {
    assertContains(adminService, 'backend/src/admin/admin.service.ts', snippet, failures);
  }
  for (const snippet of [
    "@Controller('notifications')",
    "Get('me')",
    "Post()",
    "Patch(':id/read')",
    "Patch('read-all')",
    "Delete(':id')",
    "Delete()",
    "Get('provider-recipients/:providerId')",
    "RequirePermission('data.notifications.read')",
    "RequirePermission('data.notifications.write')",
  ]) {
    assertContains(notificationsController, 'backend/src/notifications/notifications.controller.ts', snippet, failures);
  }
  for (const snippet of [
    'notifications:create',
    'notifications:read',
    'notifications:clear',
    'notifications:provider-recipient',
    'syncAppStoreFromDatabase',
    'PlatformPersistenceService',
  ]) {
    assertContains(notificationsService, 'backend/src/notifications/notifications.service.ts', snippet, failures);
  }
  for (const snippet of [
    "@Controller('messaging')",
    "Get('conversations')",
    "Post('conversations')",
    "Get('conversations/:conversationId/messages')",
    "Post('conversations/:conversationId/messages')",
    "Patch('conversations/:conversationId/read')",
    "RequirePermission('data.messaging.read')",
    "RequirePermission('data.messaging.write')",
  ]) {
    assertContains(messagingController, 'backend/src/messaging/messaging.controller.ts', snippet, failures);
  }
  for (const snippet of [
    'messaging:conversations:list',
    'messaging:conversation:create',
    'messaging:message:create',
    'messaging:conversation:read',
    'assertConversationParticipant',
    'syncAppStoreFromDatabase',
    'PlatformPersistenceService',
  ]) {
    assertContains(messagingService, 'backend/src/messaging/messaging.service.ts', snippet, failures);
  }
  for (const snippet of [
    '`/notifications/me?limit=${encodeURIComponent(String(limit))}`',
    "'/notifications'",
    '`/notifications/${encodeURIComponent(id)}/read`',
    "'/notifications/read-all'",
    '`/notifications/provider-recipients/${encodeURIComponent(String(providerId))}`',
  ]) {
    assertContains(notificationsApi, 'front/src/lib/notificationsApi.ts', snippet, failures);
  }
  for (const snippet of [
    "`/messaging/conversations?summaryOnly=${summaryOnly ? 'true' : 'false'}`",
    "'/messaging/conversations'",
    '`/messaging/conversations/${encodeURIComponent(conversationId)}/messages`',
    '`/messaging/conversations/${encodeURIComponent(conversationId)}/read`',
  ]) {
    assertContains(messagingApi, 'front/src/lib/messagingApi.ts', snippet, failures);
  }
  for (const [filePath, content] of [
    ['front/src/hooks/useNotifications.tsx', useNotificationsHook],
    ['front/src/hooks/useCreateNotification.ts', useCreateNotificationHook],
    ['front/src/hooks/useBackendMessaging.ts', useBackendMessagingHook],
    ['front/src/lib/notificationsApi.ts', notificationsApi],
    ['front/src/lib/messagingApi.ts', messagingApi],
  ]) {
    if (content.includes('backendClient') || /\.from(?:<|\s*\(\s*['"`])/.test(content)) {
      failures.push(`${filePath} doit utiliser les endpoints /notifications/* ou /messaging/*, sans backendClient/.from direct.`);
    }
  }
  if (projectCenterPage.includes("from('projects')") || projectCenterPage.includes('backendClient')) {
    failures.push('front/src/pages/project-center/page.tsx doit utiliser l’endpoint metier project-center, pas backendClient/data.');
  }
  if (projectCenterDetailPage.includes("from('projects')")
    || projectCenterDetailPage.includes("from('project_")
    || projectCenterDetailPage.includes("from('funding_investors')")
    || projectCenterDetailPage.includes('backendClient')) {
    failures.push('front/src/pages/project-center/projet/page.tsx doit utiliser l’endpoint metier project-center, pas backendClient/data.');
  }
  if (projectCenterSubmitPage.includes("from('projects')")
    || projectCenterSubmitPage.includes("from('project_")
    || projectCenterSubmitPage.includes('backendClient')) {
    failures.push('front/src/pages/project-center/soumettre/page.tsx doit utiliser l’endpoint metier project-center, pas backendClient/data.');
  }
  for (const [filePath, content] of [
    [backendProdEnvExamplePath, backendProdEnvExample],
    [opsProdEnvExamplePath, opsProdEnvExample],
  ]) {
    assertContains(content, filePath, 'EMAIL_PROVIDER=brevo', failures);
    assertContains(content, filePath, 'DATA_LEGACY_API_MODE=read-only', failures);
    assertContains(content, filePath, 'BREVO_API_KEY=', failures);
    assertContains(content, filePath, 'UPLOAD_S3_ENDPOINT=https://replace-with-cloudflare-account-id.r2.cloudflarestorage.com', failures);
    assertContains(content, filePath, 'UPLOAD_S3_REGION=auto', failures);
  }
  assertContains(backendCompose, backendComposePath, 'minio:', failures);
  assertContains(backendCompose, backendComposePath, 'minio-create-bucket:', failures);
  assertContains(backendCompose, backendComposePath, 'UPLOAD_S3_ENDPOINT: http://minio:9000', failures);
  assertContains(backendPackage, backendPackagePath, '"data:legacy-mode:test"', failures);
  assertContains(backendPackage, backendPackagePath, '"data:legacy:inventory"', failures);
  assertContains(backendPackage, backendPackagePath, 'npm run data:legacy-mode:test', failures);
  assertContains(architectureRiskRegister, 'docs/ARCHITECTURE_RISK_REGISTER.md', 'npm run data:legacy:inventory', failures);
  assertContains(backendPackage, backendPackagePath, '"production:restore:drill"', failures);
  assertContains(backendPackage, backendPackagePath, '"production:env:set"', failures);
  assertContains(backendPackage, backendPackagePath, '"production:env:status"', failures);
  assertContains(backendPackage, backendPackagePath, '"production:external:check"', failures);
  assertContains(backendPackage, backendPackagePath, '"production:readiness:report"', failures);
  assertContains(backendPackage, backendPackagePath, '"production:readiness:local"', failures);
  assertContains(frontendPackage, frontendPackagePath, '"state:check"', failures);
  assertContains(frontendPackage, frontendPackagePath, 'npm run state:check', failures);
  assertContains(authController, 'backend/src/auth/auth.controller.ts', "onboarding/monetized-clauses/accept", failures);
  assertContains(authService, 'backend/src/auth/auth.service.ts', 'acceptMonetizedClauses', failures);
  assertContains(onboardingClausesApi, 'front/src/lib/onboardingClauses.ts', '/auth/onboarding/monetized-clauses/accept', failures);
  if (onboardingClausesApi.includes('localStorage') || onboardingClausesApi.includes('sessionStorage')) {
    failures.push('front/src/lib/onboardingClauses.ts doit persister les clauses cote serveur, pas dans le navigateur.');
  }
  assertContains(deployScript, 'ops/scripts/deploy-production.sh', 'production-env-status.mjs', failures);
  assertContains(deployScript, 'ops/scripts/deploy-production.sh', 'POSTDEPLOY_RESTORE_DRILL', failures);
  assertContains(deployScript, 'ops/scripts/deploy-production.sh', 'postgres-restore-drill.mjs', failures);
  assertContains(deployScript, 'ops/scripts/deploy-production.sh', 'ALLOW_DIRTY_DEPLOY_WORKTREE', failures);
  assertContains(productionRuntimeCheck, 'ops/scripts/production-runtime-check.mjs', 'DATA_LEGACY_API_MODE doit etre read-only ou disabled en production.', failures);
  assertContains(productionPreflight, 'ops/scripts/production-preflight.mjs', 'DATA_LEGACY_API_MODE doit être read-only ou disabled en production.', failures);
  assertContains(productionEnvStatus, 'ops/scripts/production-env-status.mjs', 'dataLegacyApiMode', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'legacyDataInventory', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'backend/scripts/legacy-data-inventory.mjs', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'remainingSensitiveMutationSurface', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'table(s) sensible(s) en mutation generique', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'skip-docker', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'skip-backup-check', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'production-external-providers-check.mjs', failures);
  assertContains(productionReadinessReport, 'ops/scripts/production-readiness-report.mjs', 'externalProviders', failures);
  assertContains(productionEnvStatus, 'ops/scripts/production-env-status.mjs', 'missingBackendExternalValuesByProvider', failures);
  assertContains(productionEnvStatus, 'ops/scripts/production-env-status.mjs', 'cloudflareR2', failures);
  if (isTrackedByGit(metricsTokenPath)) {
    failures.push(`${metricsTokenPath} ne doit pas être versionné. Il est créé par production:env:init sur le VPS.`);
  }
  if (!fs.existsSync(path.join(repoRoot, metricsGitkeepPath))) {
    failures.push(`${metricsGitkeepPath} doit exister pour conserver le dossier secrets sans versionner le token.`);
  }
  assertNoDirectFrontendDataApiUsage(failures);

  if (failures.length > 0) {
    fail(failures);
  }

  console.log('CI governance check: OK');
}

main();
