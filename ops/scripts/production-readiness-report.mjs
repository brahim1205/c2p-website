#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
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

function runJson(label, command, args) {
  try {
    const output = execFileSync(command, args, {
      cwd: repoRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return { label, ok: true, data: JSON.parse(output) };
  } catch (error) {
    const stdout = error instanceof Error && 'stdout' in error ? String(error.stdout ?? '').trim() : '';
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    let data = null;
    if (stdout.startsWith('{')) {
      try {
        data = JSON.parse(stdout);
      } catch {
        data = null;
      }
    }
    return {
      label,
      ok: false,
      data,
      error: stderr || stdout || (error instanceof Error ? error.message : String(error)),
    };
  }
}

function runCheck(label, command, args) {
  try {
    execFileSync(command, args, {
      cwd: repoRoot,
      stdio: 'pipe',
    });
    return { label, ok: true };
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    return {
      label,
      ok: false,
      error: stderr || (error instanceof Error ? error.message : String(error)),
    };
  }
}

function fileStatus(filePath) {
  const exists = fs.existsSync(filePath);
  if (!exists) return { exists: false };
  const mode = fs.statSync(filePath).mode & 0o777;
  return {
    exists: true,
    mode: mode.toString(8).padStart(3, '0'),
    secure: (mode & 0o077) === 0,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const strict = args.get('strict') === 'true';
  const skipDocker = args.get('skip-docker') === 'true';
  const skipBackupCheck = args.get('skip-backup-check') === 'true';
  const skipExternalCheck = args.get('skip-external-check') === 'true';
  const backendEnv = resolveRepoPath(args.get('backend-env'), 'ops/env/backend.production.env');
  const composeEnv = resolveRepoPath(args.get('compose-env'), 'ops/env/compose.production.env');
  const metricsToken = resolveRepoPath(args.get('metrics-token'), 'ops/monitoring/prometheus/secrets/metrics-token');
  const backupDir = resolveRepoPath(args.get('backup-dir'), 'backups/postgres');
  const backupMaxAgeHours = String(args.get('backup-max-age-hours') ?? 26);

  const envStatus = runJson('production env status', 'node', [
    'ops/scripts/production-env-status.mjs',
    '--backend-env',
    backendEnv,
    '--compose-env',
    composeEnv,
    '--metrics-token',
    metricsToken,
  ]);

  const checks = [
    runCheck('production runtime static check', 'node', ['ops/scripts/production-runtime-check.mjs']),
    runCheck('production compose example check', 'node', [
      'ops/scripts/production-compose-check.mjs',
      '--compose-env',
      'ops/env/compose.production.env.example',
    ]),
  ];
  if (!skipDocker) {
    checks.push(runCheck('docker daemon reachable', 'docker', ['version']));
  } else {
    checks.push({ label: 'docker daemon reachable', ok: true, skipped: true });
  }

  const backupCheck = skipBackupCheck
    ? {
      label: 'postgres backup check',
      ok: true,
      data: {
        ok: true,
        skipped: true,
        reason: 'skip-backup-check',
      },
    }
    : runJson('postgres backup check', 'node', [
      'ops/scripts/postgres-backup-check.mjs',
      '--backup-dir',
      backupDir,
      '--max-age-hours',
      backupMaxAgeHours,
    ]);
  const legacyDataInventory = runJson('legacy data inventory', 'node', [
    'backend/scripts/legacy-data-inventory.mjs',
    '--json',
  ]);

  const realEnvFilesExist = fs.existsSync(backendEnv) && fs.existsSync(composeEnv) && fs.existsSync(metricsToken);
  const externalProvidersCheck = skipExternalCheck
    ? {
      label: 'external providers check',
      ok: true,
      data: {
        ok: true,
        skipped: true,
        reason: 'skip-external-check',
      },
    }
    : realEnvFilesExist && envStatus.ok && envStatus.data?.ok !== false
      ? runJson('external providers check', 'node', [
        'ops/scripts/production-external-providers-check.mjs',
        '--backend-env',
        backendEnv,
      ])
      : {
        label: 'external providers check',
        ok: true,
        data: {
          ok: true,
          skipped: true,
          reason: 'production-env-invalid-or-missing',
        },
      };
  const blockers = [];

  if (!envStatus.ok || envStatus.data?.ok === false) {
    const failures = envStatus.data?.failures ?? [];
    blockers.push(...(failures.length > 0 ? failures : [`Env production invalide: ${envStatus.error ?? 'erreur inconnue'}`]));
  }

  for (const check of checks) {
    if (!check.ok && check.label !== 'docker daemon reachable') {
      blockers.push(`${check.label}: ${check.error}`);
    }
  }

  const dockerCheck = checks.find((check) => check.label === 'docker daemon reachable');
  if (!dockerCheck?.ok) {
    blockers.push('Docker indisponible: impossible de valider compose runtime, R2 postdeploy et restore drill localement.');
  }

  if (!backupCheck.ok || backupCheck.data?.ok === false) {
    blockers.push(`Backup PostgreSQL non valide ou absent: ${backupCheck.error ?? 'erreur inconnue'}`);
  }

  if (!legacyDataInventory.ok || legacyDataInventory.data?.ok === false) {
    blockers.push(`Inventaire legacy /data indisponible: ${legacyDataInventory.error ?? 'erreur inconnue'}`);
  }

  if (!externalProvidersCheck.ok || externalProvidersCheck.data?.ok === false) {
    blockers.push(`Providers externes non valides: ${externalProvidersCheck.error ?? 'erreur inconnue'}`);
  }

  const remainingSensitiveMutationSurface = Number(
    legacyDataInventory.data?.totals?.remainingSensitiveMutationSurface ?? 0,
  );
  if (remainingSensitiveMutationSurface > 0) {
    blockers.push(
      `API legacy /data expose encore ${remainingSensitiveMutationSurface} table(s) sensible(s) en mutation generique.`,
    );
  }

  if (!realEnvFilesExist) {
    blockers.push('Fichiers production reels absents: executer production:env:init puis remplir Brevo, R2, DexPay et SMS.');
  }

  const report = {
    ok: blockers.length === 0,
    generatedAt: new Date().toISOString(),
    files: {
      backendEnv: {
        path: path.relative(repoRoot, backendEnv),
        ...fileStatus(backendEnv),
      },
      composeEnv: {
        path: path.relative(repoRoot, composeEnv),
        ...fileStatus(composeEnv),
      },
      metricsToken: {
        path: path.relative(repoRoot, metricsToken),
        ...fileStatus(metricsToken),
      },
    },
    checks,
    envStatus: envStatus.data ?? { ok: false, error: envStatus.error },
    backup: backupCheck.data ?? { ok: false, error: backupCheck.error },
    externalProviders: externalProvidersCheck.data ?? { ok: false, error: externalProvidersCheck.error },
    legacyDataInventory: legacyDataInventory.data ?? { ok: false, error: legacyDataInventory.error },
    blockers,
    skipped: {
      docker: skipDocker,
      backupCheck: skipBackupCheck,
      externalCheck: skipExternalCheck,
    },
    nextActions: blockers.length === 0
      ? [
        skipDocker || skipBackupCheck
          ? 'Relancer sans --skip-docker ni --skip-backup-check sur le VPS avant de deployer.'
          : 'Lancer production:ready:check.',
        'Executer deploy-production.sh sur le VPS.',
        'Executer production:postdeploy puis production:restore:drill apres le premier backup.',
      ]
      : [
        'Corriger les blockers listes ci-dessus.',
        'Relancer production:readiness:report -- --strict.',
        'Quand le rapport est OK, lancer production:ready:check.',
      ],
  };

  console.log(JSON.stringify(report, null, 2));
  if (strict && blockers.length > 0) {
    process.exit(1);
  }
}

main();
