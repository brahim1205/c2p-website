#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

const EXTERNAL_PROVIDER_GROUPS = {
  resend: [
    'RESEND_API_KEY',
  ],
  brevo: [
    'BREVO_API_KEY',
  ],
  sendtext: [
    'SENDTEXT_SEND_PATH',
    'SENDTEXT_API_KEY',
    'SENDTEXT_API_SECRET',
  ],
  dexpay: [
    'DEXPAY_BASE_URL',
    'DEXPAY_API_KEY',
    'DEXPAY_API_SECRET',
  ],
  cloudflareR2: [
    'UPLOAD_S3_ENDPOINT',
    'UPLOAD_S3_BUCKET',
    'UPLOAD_S3_ACCESS_KEY_ID',
    'UPLOAD_S3_SECRET_ACCESS_KEY',
  ],
};

function getRequiredBackendExternals(env) {
  const required = [];
  const emailProvider = String(env.EMAIL_PROVIDER ?? '').trim().toLowerCase();
  const smsProvider = String(env.SMS_PROVIDER ?? '').trim().toLowerCase();
  const uploadStorageDriver = String(env.UPLOAD_STORAGE_DRIVER ?? '').trim().toLowerCase();
  const dexpayEnabled = String(env.DEXPAY_ENABLED ?? '').trim().toLowerCase() === 'true';

  if (emailProvider === 'resend') required.push(...EXTERNAL_PROVIDER_GROUPS.resend);
  if (emailProvider === 'brevo') required.push(...EXTERNAL_PROVIDER_GROUPS.brevo);
  if (smsProvider === 'brevo') required.push(...EXTERNAL_PROVIDER_GROUPS.brevo);
  if (smsProvider === 'sendtext') required.push(...EXTERNAL_PROVIDER_GROUPS.sendtext);
  if (dexpayEnabled) required.push(...EXTERNAL_PROVIDER_GROUPS.dexpay);
  if (uploadStorageDriver === 's3') required.push(...EXTERNAL_PROVIDER_GROUPS.cloudflareR2);

  return [...new Set(required)];
}

const REQUIRED_BACKEND_INTERNALS = [
  'DATABASE_URL',
  'METRICS_AUTH_TOKEN',
  'REDIS_URL',
  'REDIS_PASSWORD',
  'DEXPAY_WEBHOOK_SECRET',
];

const REQUIRED_COMPOSE_VALUES = [
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
  'GF_SECURITY_ADMIN_PASSWORD',
  'SONAR_POSTGRES_DB',
  'SONAR_POSTGRES_USER',
  'SONAR_POSTGRES_PASSWORD',
];

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

function resolveRepoPath(inputPath, fallback) {
  const value = inputPath ?? fallback;
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function parseEnvFile(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
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
    env[key] = value;
  }
  return env;
}

function isPlaceholder(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return !normalized || [
    'replace-with',
    'replace-',
    'changeme',
    'change-me',
    'placeholder',
    '/replace/with',
  ].some((pattern) => normalized.includes(pattern));
}

function getModeStatus(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, secure: false, mode: null };
  }
  const mode = fs.statSync(filePath).mode & 0o777;
  return {
    exists: true,
    secure: (mode & 0o077) === 0,
    mode: mode.toString(8).padStart(3, '0'),
  };
}

function collectMissing(env, keys) {
  return keys.filter((key) => isPlaceholder(env[key]));
}

function collectMissingByProvider(env) {
  const emailProvider = String(env.EMAIL_PROVIDER ?? '').trim().toLowerCase();
  const smsProvider = String(env.SMS_PROVIDER ?? '').trim().toLowerCase();
  const uploadStorageDriver = String(env.UPLOAD_STORAGE_DRIVER ?? '').trim().toLowerCase();
  const dexpayEnabled = String(env.DEXPAY_ENABLED ?? '').trim().toLowerCase() === 'true';
  const activeGroups = {};

  if (emailProvider === 'resend') activeGroups.resend = collectMissing(env, EXTERNAL_PROVIDER_GROUPS.resend);
  if (emailProvider === 'brevo') activeGroups.brevo = collectMissing(env, EXTERNAL_PROVIDER_GROUPS.brevo);
  if (smsProvider === 'brevo') activeGroups.brevoSms = collectMissing(env, EXTERNAL_PROVIDER_GROUPS.brevo);
  if (smsProvider === 'sendtext') activeGroups.sendtext = collectMissing(env, EXTERNAL_PROVIDER_GROUPS.sendtext);
  if (dexpayEnabled) activeGroups.dexpay = collectMissing(env, EXTERNAL_PROVIDER_GROUPS.dexpay);
  if (uploadStorageDriver === 's3') activeGroups.cloudflareR2 = collectMissing(env, EXTERNAL_PROVIDER_GROUPS.cloudflareR2);

  return activeGroups;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const strict = args.get('strict') === 'true';
  const backendEnvPath = resolveRepoPath(args.get('backend-env'), 'ops/env/backend.production.env');
  const composeEnvPath = resolveRepoPath(args.get('compose-env'), 'ops/env/compose.production.env');
  const metricsTokenPath = resolveRepoPath(args.get('metrics-token'), 'ops/monitoring/prometheus/secrets/metrics-token');

  const backendMode = getModeStatus(backendEnvPath);
  const composeMode = getModeStatus(composeEnvPath);
  const metricsMode = getModeStatus(metricsTokenPath);
  const failures = [];

  if (!backendMode.exists) failures.push(`Fichier absent: ${path.relative(repoRoot, backendEnvPath)}`);
  if (!composeMode.exists) failures.push(`Fichier absent: ${path.relative(repoRoot, composeEnvPath)}`);
  if (!metricsMode.exists) failures.push(`Fichier absent: ${path.relative(repoRoot, metricsTokenPath)}`);

  let backend = {};
  let compose = {};
  if (backendMode.exists) {
    backend = parseEnvFile(backendEnvPath);
    const requiredBackendExternals = getRequiredBackendExternals(backend);
    const missing = [
      ...collectMissing(backend, REQUIRED_BACKEND_INTERNALS),
      ...collectMissing(backend, requiredBackendExternals),
    ];
    for (const key of missing) failures.push(`Valeur backend manquante ou placeholder: ${key}`);
    if (!['read-only', 'disabled'].includes(String(backend.DATA_LEGACY_API_MODE ?? '').trim().toLowerCase())) {
      failures.push('DATA_LEGACY_API_MODE doit être read-only ou disabled en production.');
    }
    if (!backendMode.secure) failures.push(`Permissions trop ouvertes: ${path.relative(repoRoot, backendEnvPath)} (${backendMode.mode}, attendu 600)`);
  }

  if (composeMode.exists) {
    compose = parseEnvFile(composeEnvPath);
    for (const key of collectMissing(compose, REQUIRED_COMPOSE_VALUES)) {
      failures.push(`Valeur compose manquante ou placeholder: ${key}`);
    }
    if (!composeMode.secure) failures.push(`Permissions trop ouvertes: ${path.relative(repoRoot, composeEnvPath)} (${composeMode.mode}, attendu 600)`);
  }

  if (metricsMode.exists && !metricsMode.secure) {
    failures.push(`Permissions trop ouvertes: ${path.relative(repoRoot, metricsTokenPath)} (${metricsMode.mode}, attendu 600)`);
  }

  const report = {
    ok: failures.length === 0,
    files: {
      backendEnv: { path: path.relative(repoRoot, backendEnvPath), ...backendMode },
      composeEnv: { path: path.relative(repoRoot, composeEnvPath), ...composeMode },
      metricsToken: { path: path.relative(repoRoot, metricsTokenPath), ...metricsMode },
    },
    runtimeModes: {
      dataLegacyApiMode: backend.DATA_LEGACY_API_MODE ?? null,
      uploadStorageDriver: backend.UPLOAD_STORAGE_DRIVER ?? null,
      emailProvider: backend.EMAIL_PROVIDER ?? null,
      smsProvider: backend.SMS_PROVIDER ?? null,
    },
    missingBackendExternalValues: backendMode.exists ? collectMissing(backend, getRequiredBackendExternals(backend)) : [],
    missingBackendExternalValuesByProvider: backendMode.exists
      ? collectMissingByProvider(backend)
      : collectMissingByProvider({}),
    failures,
  };

  console.log(JSON.stringify(report, null, 2));
  if (strict && failures.length > 0) {
    process.exit(1);
  }
}

main();
