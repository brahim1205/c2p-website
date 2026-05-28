#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const gzipBin = '/usr/bin/gzip';
const sha256sumBin = '/usr/bin/sha256sum';
const psqlBin = '/usr/bin/psql';

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
  console.error('PostgreSQL local restore drill: FAILED');
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
    fail(`Aucun backup .sql.gz trouve dans ${backupDir}`);
  }
  return latest.filePath;
}

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: options.cwd ?? repoRoot,
      stdio: options.stdio ?? 'pipe',
      env: options.env ?? process.env,
      input: options.input,
    });
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    fail(stderr || (error instanceof Error ? error.message : String(error)));
  }
}

function stripQuery(databaseUrl) {
  const parsed = new URL(databaseUrl);
  parsed.search = '';
  return parsed;
}

function loadBackendEnv() {
  const envPath = path.join(repoRoot, 'backend', '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function quotedIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  loadBackendEnv();
  const backupFile = resolveBackupFile(args);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail('DATABASE_URL est absent.');
  }
  if (!fs.existsSync(backupFile) || fs.statSync(backupFile).size <= 0) {
    fail(`Backup invalide: ${backupFile}`);
  }

  run(gzipBin, ['-t', backupFile]);
  const checksumPath = `${backupFile}.sha256`;
  if (fs.existsSync(checksumPath)) {
    run(sha256sumBin, ['-c', checksumPath], { stdio: 'pipe', cwd: path.dirname(backupFile) });
  }

  const baseUrl = stripQuery(databaseUrl);
  const restoreDbName = String(args.get('database') ?? `c2p_restore_drill_${process.pid}`).replace(/[^a-zA-Z0-9_]/g, '_');
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = '/postgres';
  const restoreUrl = new URL(baseUrl);
  restoreUrl.pathname = `/${restoreDbName}`;

  try {
    run(psqlBin, [adminUrl.toString(), '-v', 'ON_ERROR_STOP=1', '-c', `drop database if exists ${quotedIdentifier(restoreDbName)};`]);
    run(psqlBin, [adminUrl.toString(), '-v', 'ON_ERROR_STOP=1', '-c', `create database ${quotedIdentifier(restoreDbName)};`]);
    run('/usr/bin/bash', [
      '-lc',
      'set -euo pipefail; gzip -dc "$BACKUP_FILE" | psql "$RESTORE_URL" -v ON_ERROR_STOP=1',
    ], {
      env: {
        ...process.env,
        BACKUP_FILE: backupFile,
        RESTORE_URL: restoreUrl.toString(),
      },
    });
    const tableCountRaw = run(psqlBin, [
      restoreUrl.toString(),
      '-At',
      '-c',
      "select count(*) from information_schema.tables where table_schema = 'public';",
    ]);
    console.log(JSON.stringify({
      ok: true,
      backup: path.relative(repoRoot, backupFile),
      restoredDatabase: restoreDbName,
      restoredPublicTables: Number(String(tableCountRaw).trim()),
    }, null, 2));
  } finally {
    run(psqlBin, [adminUrl.toString(), '-v', 'ON_ERROR_STOP=1', '-c', `drop database if exists ${quotedIdentifier(restoreDbName)};`]);
  }
}

main();
