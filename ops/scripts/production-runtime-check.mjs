#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const backendSrc = path.join(repoRoot, 'backend', 'src');

const allowedRuntimeMockImporters = new Set([
  'backend/src/data/data-app-store.ts',
  'backend/src/data/mock-store.ts',
  'backend/src/data/mock-store.seed.ts',
  'backend/src/database/platform-snapshot-sync.service.ts',
]);

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function walkTsFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkTsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      result.push(fullPath);
    }
  }
  return result;
}

function isMockSeedFile(repoPath) {
  return repoPath.startsWith('backend/src/data/mock-store-seed/');
}

function isRuntimeImport(statement) {
  return !statement.trim().startsWith('import type ');
}

function findImportStatements(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('import ') && line.includes(' from '));
}

function hasMockRuntimeImport(statement) {
  if (!isRuntimeImport(statement)) return false;
  return statement.includes('mock-store') || statement.includes('mock-store.seed') || statement.includes('mock-store-seed/');
}

function checkRuntimeMockImports(failures) {
  for (const filePath of walkTsFiles(backendSrc)) {
    const repoPath = toRepoPath(filePath);
    if (isMockSeedFile(repoPath) || allowedRuntimeMockImporters.has(repoPath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const statement of findImportStatements(content)) {
      if (hasMockRuntimeImport(statement)) {
        failures.push(`${repoPath}: import runtime interdit depuis mock-store/mock seed. Utiliser import type ou un service domaine/Prisma.`);
      }
    }
  }
}

function parseJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function checkPackageScripts(failures) {
  const packageJson = parseJson(path.join(repoRoot, 'backend', 'package.json'));
  const productionScripts = ['start'];
  for (const scriptName of productionScripts) {
    const script = String(packageJson.scripts?.[scriptName] ?? '');
    if (/PRISMA_PLATFORM_SEED_ENABLED\s*=\s*true/.test(script)) {
      failures.push(`backend/package.json:${scriptName} active PRISMA_PLATFORM_SEED_ENABLED=true.`);
    }
  }
}

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    result[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return result;
}

function checkProductionEnvExamples(failures) {
  const envFiles = [
    'backend/.env.prod.example',
    'ops/env/backend.production.env.example',
  ];

  for (const repoPath of envFiles) {
    const env = parseEnvFile(path.join(repoRoot, repoPath));
    if (env.PRISMA_CONNECTION_REQUIRED !== 'true') {
      failures.push(`${repoPath}: PRISMA_CONNECTION_REQUIRED doit rester a true.`);
    }
    if (env.PRISMA_PLATFORM_SEED_ENABLED === 'true') {
      failures.push(`${repoPath}: PRISMA_PLATFORM_SEED_ENABLED ne doit jamais etre true en production.`);
    }
    if (!['read-only', 'disabled'].includes(env.DATA_LEGACY_API_MODE)) {
      failures.push(`${repoPath}: DATA_LEGACY_API_MODE doit etre read-only ou disabled en production.`);
    }
    if (!env.UPLOAD_PUBLIC_BASE_URL) {
      failures.push(`${repoPath}: UPLOAD_PUBLIC_BASE_URL doit etre renseigne en production.`);
    } else if (/localhost|127\.0\.0\.1/i.test(env.UPLOAD_PUBLIC_BASE_URL)) {
      failures.push(`${repoPath}: UPLOAD_PUBLIC_BASE_URL ne doit pas pointer vers localhost/127.0.0.1.`);
    }
    if (env.UPLOAD_STORAGE_DRIVER !== 's3') {
      failures.push(`${repoPath}: UPLOAD_STORAGE_DRIVER doit etre s3 en production pour eviter le stockage disque local.`);
    }
    for (const key of ['UPLOAD_S3_ENDPOINT', 'UPLOAD_S3_BUCKET', 'UPLOAD_S3_ACCESS_KEY_ID', 'UPLOAD_S3_SECRET_ACCESS_KEY']) {
      if (!env[key]) {
        failures.push(`${repoPath}: ${key} doit etre renseigne quand UPLOAD_STORAGE_DRIVER=s3.`);
      }
    }
    if (env.UPLOAD_S3_ENDPOINT && !/\.r2\.cloudflarestorage\.com/i.test(env.UPLOAD_S3_ENDPOINT)) {
      failures.push(`${repoPath}: UPLOAD_S3_ENDPOINT doit documenter Cloudflare R2 en production.`);
    }
    if (env.UPLOAD_S3_REGION !== 'auto') {
      failures.push(`${repoPath}: UPLOAD_S3_REGION doit rester auto pour Cloudflare R2.`);
    }
    if (env.EMAIL_PROVIDER !== 'brevo') {
      failures.push(`${repoPath}: EMAIL_PROVIDER doit etre brevo en production.`);
    }
    for (const key of ['EMAIL_FROM', 'BREVO_API_KEY', 'BREVO_BASE_URL']) {
      if (!env[key]) {
        failures.push(`${repoPath}: ${key} doit etre renseigne quand EMAIL_PROVIDER=brevo.`);
      }
    }
  }
}

function main() {
  const failures = [];
  checkRuntimeMockImports(failures);
  checkPackageScripts(failures);
  checkProductionEnvExamples(failures);

  if (failures.length > 0) {
    console.error('Production runtime check: FAILED');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Production runtime check: OK');
}

main();
