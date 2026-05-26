#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

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

function resolveRoot(inputRoot) {
  return path.resolve(process.cwd(), inputRoot ?? process.env.UPLOAD_TMP_ROOT ?? 'storage/uploads/_tmp');
}

function assertSafeTempRoot(root) {
  const normalized = root.replaceAll('\\', '/');
  if (!normalized.endsWith('/storage/uploads/_tmp') && !normalized.includes('/storage/uploads/_tmp/')) {
    throw new Error(`Refus de nettoyer un dossier qui n'est pas un tmp uploads: ${root}`);
  }
}

async function walkFiles(root) {
  const result = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch((error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }

  await walk(root);
  return result;
}

async function removeEmptyDirectories(root) {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(root, entry.name);
    await removeEmptyDirectories(fullPath);
    const remaining = await fs.readdir(fullPath).catch(() => []);
    if (remaining.length === 0) {
      await fs.rmdir(fullPath).catch(() => undefined);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolveRoot(args.get('root'));
  const dryRun = args.get('dry-run') === 'true';
  const maxAgeHours = Number(args.get('max-age-hours') ?? process.env.UPLOAD_TMP_MAX_AGE_HOURS ?? 24);
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new Error('--max-age-hours doit être un nombre positif.');
  }

  assertSafeTempRoot(root);

  const now = Date.now();
  const thresholdMs = maxAgeHours * 60 * 60 * 1000;
  const files = await walkFiles(root);
  const candidates = [];
  let deletedBytes = 0;

  for (const filePath of files) {
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) continue;
    const ageMs = now - stat.mtimeMs;
    if (ageMs < thresholdMs) continue;
    candidates.push({
      path: path.relative(process.cwd(), filePath),
      ageHours: Math.round((ageMs / (60 * 60 * 1000)) * 10) / 10,
      sizeBytes: stat.size,
    });

    if (!dryRun) {
      await fs.unlink(filePath).catch(() => undefined);
      deletedBytes += stat.size;
    }
  }

  if (!dryRun) {
    await removeEmptyDirectories(root);
  }

  console.log(JSON.stringify({
    ok: true,
    mode: dryRun ? 'dry-run' : 'cleanup',
    root: path.relative(process.cwd(), root),
    maxAgeHours,
    scannedFiles: files.length,
    candidates: candidates.length,
    deletedFiles: dryRun ? 0 : candidates.length,
    deletedBytes: dryRun ? 0 : deletedBytes,
    sample: candidates.slice(0, 20),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
