#!/usr/bin/env node

import crypto from 'node:crypto';
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

function resolveRepoPath(inputPath, fallback) {
  const value = inputPath ?? fallback;
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function randomSecret(bytes = 36) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function replaceLine(content, key, value) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}=.*$`, 'm');
  if (!pattern.test(content)) {
    return `${content.trimEnd()}\n${key}=${value}\n`;
  }
  return content.replace(pattern, `${key}=${value}`);
}

function writeSecretFile(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`${path.relative(repoRoot, filePath)} existe deja. Relancez avec --force pour regenerer.`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function parseEnv(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
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

function collectMissingExternal(env) {
  const required = [
    'BREVO_API_KEY',
    'SENDTEXT_SEND_PATH',
    'SENDTEXT_API_KEY',
    'SENDTEXT_API_SECRET',
    'DEXPAY_BASE_URL',
    'DEXPAY_API_KEY',
    'DEXPAY_API_SECRET',
    'UPLOAD_S3_ENDPOINT',
    'UPLOAD_S3_BUCKET',
    'UPLOAD_S3_ACCESS_KEY_ID',
    'UPLOAD_S3_SECRET_ACCESS_KEY',
  ];
  return required.filter((key) => isPlaceholder(env[key]));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const force = args.get('force') === 'true';
  const backendExample = resolveRepoPath(args.get('backend-example'), 'ops/env/backend.production.env.example');
  const composeExample = resolveRepoPath(args.get('compose-example'), 'ops/env/compose.production.env.example');
  const backendEnvPath = resolveRepoPath(args.get('backend-env'), 'ops/env/backend.production.env');
  const composeEnvPath = resolveRepoPath(args.get('compose-env'), 'ops/env/compose.production.env');
  const metricsTokenPath = resolveRepoPath(args.get('metrics-token'), 'ops/monitoring/prometheus/secrets/metrics-token');

  if (!fs.existsSync(backendExample)) {
    throw new Error(`Exemple backend introuvable: ${backendExample}`);
  }
  if (!fs.existsSync(composeExample)) {
    throw new Error(`Exemple compose introuvable: ${composeExample}`);
  }

  const postgresPassword = randomSecret();
  const redisPassword = randomSecret();
  const grafanaPassword = randomSecret();
  const metricsToken = randomSecret(40);
  const dexpayWebhookSecret = randomSecret(40);

  let backend = fs.readFileSync(backendExample, 'utf8');
  let compose = fs.readFileSync(composeExample, 'utf8');

  backend = replaceLine(backend, 'DATABASE_URL', `postgresql://c2p:${postgresPassword}@postgres:5432/c2p?schema=public&connection_limit=20&pool_timeout=10`);
  backend = replaceLine(backend, 'METRICS_AUTH_TOKEN', metricsToken);
  backend = replaceLine(backend, 'REDIS_URL', `redis://:${redisPassword}@redis:6379`);
  backend = replaceLine(backend, 'REDIS_PASSWORD', redisPassword);
  backend = replaceLine(backend, 'DEXPAY_WEBHOOK_SECRET', dexpayWebhookSecret);

  compose = replaceLine(compose, 'POSTGRES_PASSWORD', postgresPassword);
  compose = replaceLine(compose, 'REDIS_PASSWORD', redisPassword);
  compose = replaceLine(compose, 'GF_SECURITY_ADMIN_PASSWORD', grafanaPassword);

  writeSecretFile(backendEnvPath, backend, force);
  writeSecretFile(composeEnvPath, compose, force);
  writeSecretFile(metricsTokenPath, `${metricsToken}\n`, force);

  const missingExternal = collectMissingExternal(parseEnv(backend));
  const result = {
    ok: true,
    written: {
      backendEnv: path.relative(repoRoot, backendEnvPath),
      composeEnv: path.relative(repoRoot, composeEnvPath),
      metricsToken: path.relative(repoRoot, metricsTokenPath),
    },
    generated: [
      'POSTGRES_PASSWORD',
      'REDIS_PASSWORD',
      'GF_SECURITY_ADMIN_PASSWORD',
      'METRICS_AUTH_TOKEN',
      'DEXPAY_WEBHOOK_SECRET',
    ],
    externalValuesToFillBeforePreflight: missingExternal,
  };
  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}
