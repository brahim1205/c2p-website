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
  console.error('PostgreSQL backup check: FAILED');
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const backupDir = resolveRepoPath(args.get('backup-dir'), 'backups/postgres');
  const maxAgeHours = Number(args.get('max-age-hours') ?? 26);

  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    fail('--max-age-hours doit être un nombre positif.');
  }
  if (!fs.existsSync(backupDir)) {
    fail(`Dossier de backup introuvable: ${backupDir}`);
  }

  const latest = findLatestBackup(backupDir);
  if (!latest) {
    fail(`Aucun backup .sql.gz trouvé dans ${backupDir}`);
  }
  if (latest.stat.size <= 0) {
    fail(`Backup vide: ${latest.filePath}`);
  }

  const ageHours = (Date.now() - latest.stat.mtimeMs) / 3_600_000;
  if (ageHours > maxAgeHours) {
    fail(`Backup trop ancien: ${latest.filePath} (${ageHours.toFixed(1)}h > ${maxAgeHours}h)`);
  }

  const checksumPath = `${latest.filePath}.sha256`;
  if (!fs.existsSync(checksumPath)) {
    fail(`Checksum manquant: ${checksumPath}`);
  }

  try {
    execFileSync('sha256sum', ['-c', checksumPath], {
      cwd: path.dirname(latest.filePath),
      stdio: 'pipe',
    });
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    fail(`Checksum invalide: ${stderr || (error instanceof Error ? error.message : String(error))}`);
  }

  console.log(JSON.stringify({
    ok: true,
    backup: path.relative(repoRoot, latest.filePath),
    sizeBytes: latest.stat.size,
    ageHours: Number(ageHours.toFixed(2)),
  }, null, 2));
}

main();
