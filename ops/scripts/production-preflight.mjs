#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function parseArgs(argv) {
  const entries = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      entries.set(key, 'true');
      continue;
    }
    entries.set(key, next);
    index += 1;
  }
  return entries;
}

function resolveRepoPath(inputPath) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(repoRoot, inputPath);
}

function resolveContextPath(inputPath, baseDir) {
  if (!inputPath) return null;
  if (path.isAbsolute(inputPath)) return inputPath;

  const repoCandidate = path.resolve(repoRoot, inputPath);
  if (fs.existsSync(repoCandidate)) {
    return repoCandidate;
  }

  return path.resolve(baseDir, inputPath);
}

function readFileIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseEnvFile(filePath) {
  const raw = readFileIfExists(filePath);
  if (raw === null) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }

  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function isTruthy(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

function isPlaceholder(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return true;
  return [
    'replace-with',
    'replace-',
    'change-me',
    'changeme',
    'example.com',
    'example.org',
    'replace-user',
    'replace-password',
    'replace-host',
    'replace-db',
    'placeholder',
  ].some((pattern) => normalized.includes(pattern));
}

function fail(failures, message) {
  failures.push(message);
}

function requireNonPlaceholder(env, key, failures, label = key) {
  const value = env[key];
  if (value === undefined || String(value).trim() === '') {
    fail(failures, `${label} manquant.`);
    return null;
  }
  if (isPlaceholder(value)) {
    fail(failures, `${label} utilise encore une valeur placeholder.`);
    return null;
  }
  return value;
}

function requirePositiveInteger(env, key, failures, label = key) {
  const value = requireNonPlaceholder(env, key, failures, label);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    fail(failures, `${label} doit être un entier positif.`);
    return null;
  }
  return parsed;
}

function checkNoLocalhost(value, failures, label) {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) {
    fail(failures, `${label} pointe encore vers localhost/127.0.0.1.`);
  }
}

function checkSecretFileMode(filePath, failures, label) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const mode = fs.statSync(filePath).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    fail(
      failures,
      `${label} doit être lisible uniquement par le propriétaire (chmod 600 recommandé, mode actuel ${mode.toString(8)}).`,
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const composeEnvPath = resolveRepoPath(args.get('compose-env') ?? 'ops/env/compose.production.env');
  const backendEnvPath = resolveRepoPath(args.get('backend-env') ?? 'ops/env/backend.production.env');
  const metricsSecretPath = resolveRepoPath(args.get('metrics-secret') ?? 'ops/monitoring/prometheus/secrets/metrics-token');
  const certDir = resolveRepoPath(args.get('cert-dir') ?? 'ops/nginx/certs');

  const failures = [];
  const warnings = [];
  const composeEnvDir = path.dirname(composeEnvPath);

  let composeEnv = {};
  let backendEnv = {};

  try {
    composeEnv = parseEnvFile(composeEnvPath);
    checkSecretFileMode(composeEnvPath, failures, path.relative(repoRoot, composeEnvPath));
  } catch (error) {
    fail(failures, error instanceof Error ? error.message : `Impossible de lire ${composeEnvPath}`);
  }

  try {
    backendEnv = parseEnvFile(backendEnvPath);
    checkSecretFileMode(backendEnvPath, failures, path.relative(repoRoot, backendEnvPath));
  } catch (error) {
    fail(failures, error instanceof Error ? error.message : `Impossible de lire ${backendEnvPath}`);
  }

  const composeBackendEnvRef = composeEnv.BACKEND_ENV_FILE;
  if (composeBackendEnvRef) {
    if (composeBackendEnvRef.endsWith('.example')) {
      fail(failures, 'BACKEND_ENV_FILE pointe encore vers un fichier .example.');
    }
    const resolvedComposeBackendEnv = resolveContextPath(composeBackendEnvRef, composeEnvDir);
    if (!resolvedComposeBackendEnv || !fs.existsSync(resolvedComposeBackendEnv)) {
      fail(failures, `BACKEND_ENV_FILE cible un fichier inexistant: ${composeBackendEnvRef}`);
    } else if (path.resolve(resolvedComposeBackendEnv) !== path.resolve(backendEnvPath)) {
      warnings.push(`BACKEND_ENV_FILE utilise ${composeBackendEnvRef}, différent de ${path.relative(repoRoot, backendEnvPath)}.`);
    }
  }

  if (backendEnv.NODE_ENV !== 'production') {
    fail(failures, 'NODE_ENV doit être positionné à production.');
  }

  requireNonPlaceholder(backendEnv, 'DATABASE_URL', failures);
  const appOrigins = requireNonPlaceholder(backendEnv, 'APP_ORIGINS', failures);
  if (appOrigins) {
    checkNoLocalhost(appOrigins, failures, 'APP_ORIGINS');
  }

  const cookieDomain = requireNonPlaceholder(backendEnv, 'COOKIE_DOMAIN', failures);
  if (cookieDomain) {
    checkNoLocalhost(cookieDomain, failures, 'COOKIE_DOMAIN');
  }

  if (!isTruthy(backendEnv.COOKIE_SECURE, false)) {
    fail(failures, 'COOKIE_SECURE doit être à true en production.');
  }

  if (!isTruthy(backendEnv.TRUST_PROXY, false)) {
    fail(failures, 'TRUST_PROXY doit être à true derrière Nginx.');
  }

  if (!isTruthy(backendEnv.PRISMA_CONNECTION_REQUIRED, false)) {
    fail(failures, 'PRISMA_CONNECTION_REQUIRED doit être à true en production.');
  }

  if (isTruthy(backendEnv.PRISMA_PLATFORM_SEED_ENABLED, false)) {
    fail(failures, 'PRISMA_PLATFORM_SEED_ENABLED doit rester à false en production.');
  }

  const dataLegacyApiMode = String(backendEnv.DATA_LEGACY_API_MODE ?? '').trim().toLowerCase();
  if (!['read-only', 'disabled'].includes(dataLegacyApiMode)) {
    fail(failures, 'DATA_LEGACY_API_MODE doit être read-only ou disabled en production.');
  }

  if (!isTruthy(backendEnv.REDIS_DISABLED, false)) {
    requireNonPlaceholder(backendEnv, 'REDIS_PASSWORD', failures);
    if (!backendEnv.REDIS_URL && !backendEnv.REDIS_HOST) {
      fail(failures, 'Configuration Redis manquante.');
    }
    if (backendEnv.REDIS_URL) {
      requireNonPlaceholder(backendEnv, 'REDIS_URL', failures);
    }
  }

  if (isTruthy(backendEnv.ENABLE_METRICS, true)) {
    const metricsToken = requireNonPlaceholder(backendEnv, 'METRICS_AUTH_TOKEN', failures);
    const metricsSecret = readFileIfExists(metricsSecretPath);
    if (metricsSecret === null) {
      fail(failures, `Secret metrics introuvable: ${path.relative(repoRoot, metricsSecretPath)}`);
    } else {
      checkSecretFileMode(metricsSecretPath, failures, path.relative(repoRoot, metricsSecretPath));
      const normalizedSecret = metricsSecret.trim();
      if (!normalizedSecret) {
        fail(failures, 'Le fichier metrics-token est vide.');
      } else if (isPlaceholder(normalizedSecret)) {
        fail(failures, 'Le fichier metrics-token contient encore une valeur placeholder.');
      } else if (metricsToken && normalizedSecret !== metricsToken) {
        fail(failures, 'METRICS_AUTH_TOKEN ne correspond pas au secret Prometheus metrics-token.');
      }
    }
  }

  const smsProvider = String(backendEnv.SMS_PROVIDER ?? '').trim().toLowerCase();
  if (!smsProvider) {
    fail(failures, 'SMS_PROVIDER manquant.');
  } else if (smsProvider !== 'brevo') {
    fail(failures, 'SMS_PROVIDER doit être brevo en production.');
  } else if (smsProvider === 'brevo') {
    requireNonPlaceholder(backendEnv, 'SMS_SENDER_ID', failures);
    requireNonPlaceholder(backendEnv, 'BREVO_API_KEY', failures);
  }

  const emailProvider = String(backendEnv.EMAIL_PROVIDER ?? '').trim().toLowerCase();
  if (!emailProvider) {
    fail(failures, 'EMAIL_PROVIDER manquant. Le projet ne doit pas retomber sur le provider mock en production.');
  } else if (emailProvider !== 'brevo') {
    fail(failures, 'EMAIL_PROVIDER doit être brevo en production.');
  } else if (emailProvider === 'brevo') {
    requireNonPlaceholder(backendEnv, 'EMAIL_FROM', failures);
    requireNonPlaceholder(backendEnv, 'BREVO_API_KEY', failures);
    const brevoBaseUrl = requireNonPlaceholder(backendEnv, 'BREVO_BASE_URL', failures);
    if (brevoBaseUrl) {
      checkNoLocalhost(brevoBaseUrl, failures, 'BREVO_BASE_URL');
    }
  }

  if (isTruthy(backendEnv.DEXPAY_ENABLED, false)) {
    requireNonPlaceholder(backendEnv, 'DEXPAY_BASE_URL', failures);
    requireNonPlaceholder(backendEnv, 'DEXPAY_API_KEY', failures);
    requireNonPlaceholder(backendEnv, 'DEXPAY_API_SECRET', failures);
    requireNonPlaceholder(backendEnv, 'DEXPAY_WEBHOOK_SECRET', failures);
  }

  const uploadStorageDriver = String(backendEnv.UPLOAD_STORAGE_DRIVER ?? 'local-disk').trim().toLowerCase();
  if (uploadStorageDriver !== 's3') {
    fail(failures, 'UPLOAD_STORAGE_DRIVER doit être s3 en production. Le stockage local n est pas multi-instance safe.');
  } else {
    const uploadS3Endpoint = requireNonPlaceholder(backendEnv, 'UPLOAD_S3_ENDPOINT', failures);
    requireNonPlaceholder(backendEnv, 'UPLOAD_S3_BUCKET', failures);
    requireNonPlaceholder(backendEnv, 'UPLOAD_S3_ACCESS_KEY_ID', failures);
    requireNonPlaceholder(backendEnv, 'UPLOAD_S3_SECRET_ACCESS_KEY', failures);
    if (uploadS3Endpoint) {
      checkNoLocalhost(uploadS3Endpoint, failures, 'UPLOAD_S3_ENDPOINT');
      if (!/\.r2\.cloudflarestorage\.com/i.test(uploadS3Endpoint)) {
        fail(failures, 'UPLOAD_S3_ENDPOINT doit pointer vers Cloudflare R2 en production.');
      }
    }
    if (String(backendEnv.UPLOAD_S3_REGION ?? '').trim().toLowerCase() !== 'auto') {
      fail(failures, 'UPLOAD_S3_REGION doit être auto pour Cloudflare R2 en production.');
    }
  }
  const uploadPublicBaseUrl = requireNonPlaceholder(backendEnv, 'UPLOAD_PUBLIC_BASE_URL', failures);
  if (uploadPublicBaseUrl) {
    checkNoLocalhost(uploadPublicBaseUrl, failures, 'UPLOAD_PUBLIC_BASE_URL');
  }
  const uploadTmpMaxAgeHours = requirePositiveInteger(backendEnv, 'UPLOAD_TMP_MAX_AGE_HOURS', failures);
  if (uploadTmpMaxAgeHours !== null && uploadTmpMaxAgeHours > 168) {
    fail(failures, 'UPLOAD_TMP_MAX_AGE_HOURS doit être <= 168 en production.');
  }

  requireNonPlaceholder(composeEnv, 'POSTGRES_PASSWORD', failures);
  requireNonPlaceholder(composeEnv, 'REDIS_PASSWORD', failures);
  requireNonPlaceholder(composeEnv, 'GF_SECURITY_ADMIN_PASSWORD', failures);
  const backupRetentionDays = requirePositiveInteger(composeEnv, 'BACKUP_RETENTION_DAYS', failures);
  if (backupRetentionDays !== null && backupRetentionDays < 7) {
    fail(failures, 'BACKUP_RETENTION_DAYS doit être >= 7 en production.');
  }
  requireNonPlaceholder(composeEnv, 'BACKUP_CRON_SCHEDULE', failures);

  for (const scriptPath of [
    'ops/scripts/postgres-backup.sh',
    'ops/scripts/postgres-restore.sh',
    'ops/scripts/postgres-backup-check.mjs',
    'ops/scripts/install-postgres-backup-cron.sh',
    'ops/scripts/deploy-certbot-certificate.sh',
    'ops/scripts/install-certbot-webroot-renewal.sh',
  ]) {
    const fullPath = path.join(repoRoot, scriptPath);
    if (!fs.existsSync(fullPath)) {
      fail(failures, `Script backup manquant: ${scriptPath}`);
    } else {
      const mode = fs.statSync(fullPath).mode;
      if ((mode & 0o111) === 0) {
        fail(failures, `Script backup non executable: ${scriptPath}`);
      }
    }
  }

  const fullchainPath = path.join(certDir, 'fullchain.pem');
  const privkeyPath = path.join(certDir, 'privkey.pem');
  for (const certPath of [fullchainPath, privkeyPath]) {
    if (!fs.existsSync(certPath)) {
      fail(failures, `Certificat manquant: ${path.relative(repoRoot, certPath)}`);
      continue;
    }
    const stat = fs.statSync(certPath);
    if (stat.size === 0) {
      fail(failures, `Certificat vide: ${path.relative(repoRoot, certPath)}`);
    }
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const message of warnings) {
      console.log(`- ${message}`);
    }
  }

  if (failures.length > 0) {
    console.error('Production preflight: FAILED');
    for (const message of failures) {
      console.error(`- ${message}`);
    }
    process.exit(1);
  }

  console.log('Production preflight: OK');
}

main();
