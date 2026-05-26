#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const backendDir = path.join(repoRoot, 'backend');
const nodeBin = process.execPath;
const fixedToolPath = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

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

function parseJsonOutput(stdout) {
  const trimmed = String(stdout ?? '').trim();
  if (!trimmed) return null;
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart === -1) return null;
  return JSON.parse(trimmed.slice(jsonStart));
}

function runNodeJson(label, args, options = {}) {
  const result = spawnSync(nodeBin, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, PATH: fixedToolPath, ...(options.env ?? {}) },
    encoding: 'utf8',
  });
  const parsed = parseJsonOutput(result.stdout);
  return {
    label,
    ok: result.status === 0 && parsed?.ok !== false,
    exitCode: result.status,
    data: parsed,
    stderr: result.stderr.trim(),
  };
}

function parseEnvFile(filePath) {
  const values = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
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
    values[key] = value;
  }
  return values;
}

function isTruthy(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

async function runDexPayCheck(backendEnvPath) {
  const env = parseEnvFile(backendEnvPath);
  if (!isTruthy(env.DEXPAY_ENABLED)) {
    return {
      label: 'dexpay-provider',
      ok: true,
      skipped: true,
      data: { ok: true, skipped: 'DEXPAY_ENABLED=false' },
      stderr: '',
    };
  }

  const baseUrl = trimTrailingSlash(String(env.DEXPAY_BASE_URL ?? ''));
  const startedAt = Date.now();
  const endpoints = ['/info', '/health'];
  const attempts = [];
  try {
    for (const endpoint of endpoints) {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-KEY': String(env.DEXPAY_API_KEY ?? ''),
          'X-API-SECRET': String(env.DEXPAY_API_SECRET ?? ''),
        },
        signal: AbortSignal.timeout(10_000),
      });
      attempts.push({ endpoint, status: response.status, ok: response.ok });
      if (response.ok) {
        return {
          label: 'dexpay-provider',
          ok: true,
          exitCode: 0,
          data: {
            ok: true,
            status: response.status,
            endpoint,
            attempts,
            baseUrlHost: new URL(baseUrl).host,
            latencyMs: Date.now() - startedAt,
          },
          stderr: '',
        };
      }
    }

    return {
      label: 'dexpay-provider',
      ok: false,
      exitCode: 1,
      data: {
        ok: false,
        attempts,
        baseUrlHost: new URL(baseUrl).host,
        latencyMs: Date.now() - startedAt,
      },
      stderr: `DexPay health endpoints returned HTTP ${attempts.map((attempt) => `${attempt.endpoint}:${attempt.status}`).join(', ')}`,
    };
  } catch (error) {
    return {
      label: 'dexpay-provider',
      ok: false,
      exitCode: 1,
      data: {
        ok: false,
        attempts,
        baseUrlHost: baseUrl ? new URL(baseUrl).host : null,
        latencyMs: Date.now() - startedAt,
      },
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

function trimTrailingSlash(value) {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;
  return value.slice(0, end);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const backendEnvPath = resolveRepoPath(args.get('backend-env'), 'ops/env/backend.production.env');
  const skipStorage = args.get('skip-storage') === 'true';
  const skipDexPay = args.get('skip-dexpay') === 'true';
  const checks = [];

  checks.push(runNodeJson(
    'production-env-status',
    [
      path.join(repoRoot, 'ops/scripts/production-env-status.mjs'),
      '--strict',
      '--backend-env',
      backendEnvPath,
    ],
  ));

  if (checks[0].ok && !skipStorage) {
    checks.push(runNodeJson(
      'upload-storage-r2-minio',
      [
        '--loader',
        'ts-node/esm',
        '--experimental-specifier-resolution=node',
        'src/uploads/upload-storage-check.cli.ts',
        '--env-file',
        backendEnvPath,
      ],
      { cwd: backendDir },
    ));
  }

  if (checks[0].ok && !skipDexPay) {
    checks.push(await runDexPayCheck(backendEnvPath));
  }

  const report = {
    ok: checks.every((check) => check.ok),
    backendEnv: path.relative(repoRoot, backendEnvPath),
    checks,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
