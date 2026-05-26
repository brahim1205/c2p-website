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

function fail(message) {
  console.error('PostgreSQL restore drill: FAILED');
  console.error(message);
  process.exit(1);
}

function findLatestBackup(backupDir) {
  return fs.readdirSync(backupDir)
    .filter((fileName) => fileName.endsWith('.sql.gz'))
    .map((fileName) => {
      const filePath = path.join(backupDir, fileName);
      return { filePath, stat: fs.statSync(filePath) };
    })
    .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs)[0] ?? null;
}

function resolveBackupFile(args) {
  const backupFile = args.get('backup-file');
  if (backupFile) return resolveRepoPath(backupFile);

  const backupDir = resolveRepoPath(args.get('backup-dir'), 'backups/postgres');
  if (!fs.existsSync(backupDir)) {
    fail(`Dossier de backup introuvable: ${backupDir}`);
  }

  const latest = findLatestBackup(backupDir);
  if (!latest) {
    fail(`Aucun backup .sql.gz trouvé dans ${backupDir}`);
  }
  return latest.filePath;
}

function ensureCommand(command, args, label) {
  try {
    execFileSync(command, args, { cwd: repoRoot, stdio: 'pipe' });
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    fail(`${label}: ${stderr || (error instanceof Error ? error.message : String(error))}`);
  }
}

function waitForPostgres(containerName, timeoutSeconds) {
  const startedAt = Date.now();
  let lastError = '';
  while ((Date.now() - startedAt) / 1000 < timeoutSeconds) {
    try {
      execFileSync(
        'docker',
        ['exec', '-e', 'PGPASSWORD=restore', containerName, 'pg_isready', '-U', 'restore', '-d', 'restore'],
        { cwd: repoRoot, stdio: 'pipe' },
      );
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }
  fail(`PostgreSQL temporaire non prêt après ${timeoutSeconds}s: ${lastError}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const backupFile = resolveBackupFile(args);
  const image = String(args.get('image') ?? 'postgres:16-alpine');
  const timeoutSeconds = Number(args.get('timeout-seconds') ?? 60);
  const noPull = args.get('no-pull') === 'true';
  const containerName = String(
    args.get('container-name') ?? `c2p-postgres-restore-drill-${process.pid}`,
  ).replace(/[^a-zA-Z0-9_.-]/g, '-');

  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    fail('--timeout-seconds doit être un nombre positif.');
  }
  if (!fs.existsSync(backupFile)) {
    fail(`Backup introuvable: ${backupFile}`);
  }
  if (fs.statSync(backupFile).size <= 0) {
    fail(`Backup vide: ${backupFile}`);
  }

  ensureCommand('gzip', ['-t', backupFile], 'Archive gzip invalide');

  const checksumPath = `${backupFile}.sha256`;
  if (fs.existsSync(checksumPath)) {
    ensureCommand('sha256sum', ['-c', checksumPath], 'Checksum invalide');
  }

  ensureCommand('docker', ['version'], 'Docker indisponible pour le restore drill');

  if (!noPull) {
    try {
      execFileSync('docker', ['image', 'inspect', image], { cwd: repoRoot, stdio: 'pipe' });
    } catch {
      ensureCommand('docker', ['pull', image], `Impossible de récupérer l'image ${image}`);
    }
  }

  try {
    execFileSync('docker', ['rm', '-f', containerName], { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    // Le conteneur n'existe probablement pas encore.
  }

  try {
    execFileSync(
      'docker',
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        containerName,
        '-e',
        'POSTGRES_USER=restore',
        '-e',
        'POSTGRES_PASSWORD=restore',
        '-e',
        'POSTGRES_DB=restore',
        image,
      ],
      { cwd: repoRoot, stdio: 'pipe' },
    );

    waitForPostgres(containerName, timeoutSeconds);

    execFileSync(
      'bash',
      [
        '-lc',
        'set -euo pipefail; gzip -dc "$BACKUP_FILE" | docker exec -i -e PGPASSWORD=restore "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U restore -d restore',
      ],
      {
        cwd: repoRoot,
        stdio: 'pipe',
        env: {
          ...process.env,
          BACKUP_FILE: backupFile,
          CONTAINER_NAME: containerName,
        },
      },
    );

    const tableCountRaw = execFileSync(
      'docker',
      [
        'exec',
        '-e',
        'PGPASSWORD=restore',
        containerName,
        'psql',
        '-At',
        '-U',
        'restore',
        '-d',
        'restore',
        '-c',
        "select count(*) from information_schema.tables where table_schema = 'public';",
      ],
      { cwd: repoRoot, stdio: 'pipe' },
    );

    console.log(JSON.stringify({
      ok: true,
      backup: path.relative(repoRoot, backupFile),
      image,
      restoredPublicTables: Number(String(tableCountRaw).trim()),
    }, null, 2));
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    fail(stderr || (error instanceof Error ? error.message : String(error)));
  } finally {
    try {
      execFileSync('docker', ['rm', '-f', containerName], { cwd: repoRoot, stdio: 'ignore' });
    } catch {
      // Nettoyage best-effort.
    }
  }
}

main();
