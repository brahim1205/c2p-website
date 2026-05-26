#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const dockerBin = fs.existsSync('/usr/local/bin/docker') ? '/usr/local/bin/docker' : '/usr/bin/docker';
const nodeBin = process.execPath;

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
  const raw = fs.readFileSync(filePath, 'utf8');
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

function parseComposePs(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function getServiceName(record) {
  return String(record.Service ?? record.Name ?? '').trim();
}

function getServiceStatus(record) {
  return String(record.State ?? record.Status ?? '').trim().toLowerCase();
}

function isSuccessfulCompleted(record) {
  const state = getServiceStatus(record);
  if (state.includes('exited (0)')) return true;
  const exitCode = record.ExitCode;
  return Number.isFinite(Number(exitCode)) && Number(exitCode) === 0;
}

async function fetchJson(url, init, label, failures) {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      failures.push(`${label} a répondu ${response.status}.`);
      return null;
    }
    return await response.json();
  } catch (error) {
    failures.push(`${label} est indisponible: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function fetchText(url, init, label, failures) {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      failures.push(`${label} a répondu ${response.status}.`);
      return null;
    }
    return {
      text: await response.text(),
      headers: response.headers,
    };
  } catch (error) {
    failures.push(`${label} est indisponible: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const composeFile = resolveRepoPath(args.get('compose-file'), 'docker-compose.production.yml');
  const composeEnv = resolveRepoPath(args.get('compose-env'), 'ops/env/compose.production.env');
  const backendEnv = resolveRepoPath(args.get('backend-env'), 'ops/env/backend.production.env');
  const skipComposePs = args.get('skip-compose-ps') === 'true';
  const skipHttp = args.get('skip-http') === 'true';
  const skipMonitoring = args.get('skip-monitoring') === 'true';
  const skipUploadStorageCheck = args.get('skip-upload-storage-check') === 'true';
  const skipUploadMetadataAudit = args.get('skip-upload-metadata-audit') === 'true';
  const skipUploadTempCleanup = args.get('skip-upload-temp-cleanup') === 'true';
  const skipBackupCheck = args.get('skip-backup-check') === 'true';

  const failures = [];
  const backendConfig = fs.existsSync(backendEnv) ? parseEnvFile(backendEnv) : {};
  const baseUrl = trimTrailingSlash(String(
    args.get('base-url')
      ?? String(backendConfig.APP_ORIGINS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)[0]
      ?? '',
  ).trim());

  const monitoringUrls = {
    prometheus: String(args.get('prometheus-url') ?? 'http://127.0.0.1:9090/-/healthy').trim(),
    alertmanager: String(args.get('alertmanager-url') ?? 'http://127.0.0.1:9093/-/healthy').trim(),
    grafana: String(args.get('grafana-url') ?? 'http://127.0.0.1:3004/api/health').trim(),
  };

  if (!skipBackupCheck) {
    try {
      const backupDir = resolveRepoPath(args.get('backup-dir'), 'backups/postgres');
      const maxAgeHours = String(args.get('backup-max-age-hours') ?? 26);
      execFileSync(
        nodeBin,
        [
          'ops/scripts/postgres-backup-check.mjs',
          '--backup-dir',
          backupDir,
          '--max-age-hours',
          maxAgeHours,
        ],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        },
      );
    } catch (error) {
      const stderr = error instanceof Error && 'stderr' in error
        ? String(error.stderr ?? '').trim()
        : '';
      failures.push(`Backup PostgreSQL récent invalide: ${stderr || (error instanceof Error ? error.message : String(error))}`);
    }
  }

  if (!skipComposePs) {
    try {
      const raw = execFileSync(
        dockerBin,
        ['compose', '--env-file', composeEnv, '-f', composeFile, 'ps', '--format', 'json'],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        },
      );
      const services = parseComposePs(String(raw));
      const byService = new Map(services.map((record) => [getServiceName(record), record]));
      const requiredRunning = [
        'reverse-proxy',
        'frontend',
        'backend',
        'postgres',
        'redis',
        'prometheus',
        'alertmanager',
        'grafana',
        'loki',
        'promtail',
        'node-exporter',
        'cadvisor',
      ];

      for (const serviceName of requiredRunning) {
        const record = byService.get(serviceName);
        if (!record) {
          failures.push(`Service Docker absent dans compose ps: ${serviceName}.`);
          continue;
        }
        const status = getServiceStatus(record);
        if (!status.includes('running') && !status.includes('healthy')) {
          failures.push(`Service Docker non prêt: ${serviceName} (${status || 'statut inconnu'}).`);
        }
      }

      const migrationRecord = byService.get('backend-migrate');
      if (!migrationRecord) {
        failures.push('Service Docker absent dans compose ps: backend-migrate.');
      } else if (!isSuccessfulCompleted(migrationRecord) && !getServiceStatus(migrationRecord).includes('running')) {
        failures.push(`Migration Prisma non terminée correctement: ${getServiceStatus(migrationRecord) || 'statut inconnu'}.`);
      }
    } catch (error) {
      failures.push(`Impossible de lire docker compose ps: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!skipUploadStorageCheck && !skipComposePs) {
    try {
      const raw = execFileSync(
        dockerBin,
        [
          'compose',
          '--env-file',
          composeEnv,
          '-f',
          composeFile,
          'exec',
          '-T',
          'backend',
          'npm',
          'run',
          'uploads:storage:check',
          '--silent',
        ],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        },
      );
      const report = JSON.parse(String(raw).trim());
      if (!report.ok) {
        failures.push('Check storage uploads a renvoyé un payload non OK.');
      }
      if (String(backendConfig.UPLOAD_STORAGE_DRIVER ?? '').trim().toLowerCase() === 's3' && report.driver !== 's3') {
        failures.push(`Check storage uploads a utilisé ${report.driver} au lieu de s3.`);
      }
    } catch (error) {
      const stderr = error instanceof Error && 'stderr' in error
        ? String(error.stderr ?? '').trim()
        : '';
      failures.push(
        `Check storage uploads indisponible: ${stderr || (error instanceof Error ? error.message : String(error))}`,
      );
    }
  }

  if (!skipUploadMetadataAudit && !skipComposePs) {
    try {
      const raw = execFileSync(
        dockerBin,
        [
          'compose',
          '--env-file',
          composeEnv,
          '-f',
          composeFile,
          'exec',
          '-T',
          'backend',
          'node',
          'scripts/upload-object-audit.mjs',
          '--limit=1000',
        ],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        },
      );
      const report = JSON.parse(String(raw));
      if (!report.ok) {
        failures.push('Audit metadata uploads a renvoyé un payload non OK.');
      }
    } catch (error) {
      const stderr = error instanceof Error && 'stderr' in error
        ? String(error.stderr ?? '').trim()
        : '';
      failures.push(
        `Audit metadata uploads indisponible: ${stderr || (error instanceof Error ? error.message : String(error))}`,
      );
    }
  }

  if (!skipUploadTempCleanup && !skipComposePs) {
    try {
      const raw = execFileSync(
        dockerBin,
        [
          'compose',
          '--env-file',
          composeEnv,
          '-f',
          composeFile,
          'exec',
          '-T',
          'backend',
          'node',
          'scripts/upload-temp-cleanup.mjs',
        ],
        {
          cwd: repoRoot,
          stdio: 'pipe',
        },
      );
      const report = JSON.parse(String(raw));
      if (!report.ok) {
        failures.push('Nettoyage tmp uploads a renvoyé un payload non OK.');
      }
    } catch (error) {
      const stderr = error instanceof Error && 'stderr' in error
        ? String(error.stderr ?? '').trim()
        : '';
      failures.push(
        `Nettoyage tmp uploads indisponible: ${stderr || (error instanceof Error ? error.message : String(error))}`,
      );
    }
  }

  if (!skipHttp) {
    if (!baseUrl) {
      failures.push('Base URL introuvable. Utilisez --base-url ou renseignez APP_ORIGINS dans le backend env.');
    } else {
      const root = await fetchText(`${baseUrl}/`, {}, 'Accueil public', failures);
      if (root && baseUrl.startsWith('https://') && !root.headers.get('strict-transport-security')) {
        failures.push('La réponse HTTPS publique ne porte pas Strict-Transport-Security.');
      }

      const health = await fetchJson(`${baseUrl}/api/healthz`, {}, 'API healthz', failures);
      if (health && health.status !== 'ok') {
        failures.push(`API healthz a renvoyé un payload inattendu: ${JSON.stringify(health)}`);
      }
    }
  }

  if (!skipMonitoring) {
    for (const [label, url] of Object.entries(monitoringUrls)) {
      await fetchText(url, {}, `Monitoring ${label}`, failures);
    }
  }

  if (failures.length > 0) {
    console.error('Production postdeploy check: FAILED');
    for (const message of failures) {
      console.error(`- ${message}`);
    }
    process.exit(1);
  }

  console.log('Production postdeploy check: OK');
}

function trimTrailingSlash(value) {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;
  return value.slice(0, end);
}

await main();
