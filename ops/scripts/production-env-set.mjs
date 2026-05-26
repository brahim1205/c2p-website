#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

const EXTERNAL_KEYS = [
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
  'UPLOAD_PUBLIC_BASE_URL',
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

function replaceLine(content, key, value) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}=.*$`, 'm');
  if (!pattern.test(content)) {
    return `${content.trimEnd()}\n${key}=${value}\n`;
  }
  return content.replace(pattern, `${key}=${value}`);
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

function validateProvidedValues(values) {
  const failures = [];
  const endpoint = values.UPLOAD_S3_ENDPOINT;
  if (endpoint && !/\.r2\.cloudflarestorage\.com/i.test(endpoint)) {
    failures.push('UPLOAD_S3_ENDPOINT doit pointer vers Cloudflare R2 (*.r2.cloudflarestorage.com).');
  }

  const publicBaseUrl = values.UPLOAD_PUBLIC_BASE_URL;
  if (publicBaseUrl && !/^https:\/\//i.test(publicBaseUrl)) {
    failures.push('UPLOAD_PUBLIC_BASE_URL doit utiliser HTTPS.');
  }

  const dexpayBaseUrl = values.DEXPAY_BASE_URL;
  if (dexpayBaseUrl && !/^https:\/\//i.test(dexpayBaseUrl)) {
    failures.push('DEXPAY_BASE_URL doit utiliser HTTPS.');
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const requireAll = args.get('require-all') === 'true';
  const backendEnvPath = resolveRepoPath(args.get('backend-env'), 'ops/env/backend.production.env');

  if (!fs.existsSync(backendEnvPath)) {
    throw new Error(`Fichier introuvable: ${path.relative(repoRoot, backendEnvPath)}. Lance d'abord production:env:init.`);
  }

  const values = {};
  for (const key of EXTERNAL_KEYS) {
    const value = String(process.env[key] ?? '').trim();
    if (value && !isPlaceholder(value)) {
      values[key] = value;
    }
  }

  const missing = EXTERNAL_KEYS
    .filter((key) => key !== 'UPLOAD_PUBLIC_BASE_URL')
    .filter((key) => !values[key]);

  if (requireAll && missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
  }

  validateProvidedValues(values);

  let content = fs.readFileSync(backendEnvPath, 'utf8');
  content = replaceLine(content, 'EMAIL_PROVIDER', 'brevo');
  content = replaceLine(content, 'UPLOAD_STORAGE_DRIVER', 's3');
  content = replaceLine(content, 'UPLOAD_S3_REGION', 'auto');
  content = replaceLine(content, 'UPLOAD_S3_FORCE_PATH_STYLE', 'true');

  for (const [key, value] of Object.entries(values)) {
    content = replaceLine(content, key, value);
  }

  fs.writeFileSync(backendEnvPath, content, { mode: 0o600 });
  fs.chmodSync(backendEnvPath, 0o600);

  console.log(JSON.stringify({
    ok: true,
    backendEnv: path.relative(repoRoot, backendEnvPath),
    updatedKeys: Object.keys(values),
    missingExternalValues: missing,
  }, null, 2));
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
