#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize, relative, resolve } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const sourceRoots = [
  resolve(repoRoot, 'backend/src'),
  resolve(repoRoot, 'front/src'),
];
const extensions = new Set(['.ts', '.tsx']);
const backendNewFileLimit = 700;
const frontendNewFileLimit = 300;

const trackedLargeFiles = new Map([
  ['backend/src/auth/auth.service.ts', 1410],
  ['backend/src/database/wallet.service.ts', 1095],
  ['backend/src/payments/provider-integration.service.ts', 960],
  ['backend/src/learning/learning-access.service.ts', 895],
  ['backend/src/data/mock-store-seed/learning-catalog.ts', 885],
  ['backend/src/project-center/project-center.service.ts', 780],
  ['backend/src/database/platform-snapshot-sync.service.ts', 760],
  ['backend/src/payments/payment-commands.service.ts', 750],
  ['backend/src/learning/learning.controller.ts', 730],
  ['backend/src/auth/auth.store.ts', 725],
  ['backend/src/data/mock-store-seed/marketplace.ts', 725],
]);

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'out') continue;
      walk(fullPath, files);
      continue;
    }
    if (extensions.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

function toRepoPath(filePath) {
  return normalize(relative(repoRoot, filePath)).replaceAll('\\', '/');
}

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf8');
  if (!content) return 0;
  return content.split('\n').length;
}

function defaultLimit(repoPath) {
  return repoPath.startsWith('front/') ? frontendNewFileLimit : backendNewFileLimit;
}

const failures = [];
const largest = [];
const seen = new Set();

for (const filePath of sourceRoots.flatMap((root) => walk(root))) {
  const repoPath = toRepoPath(filePath);
  const lines = countLines(filePath);
  const limit = trackedLargeFiles.get(repoPath) ?? defaultLimit(repoPath);
  seen.add(repoPath);
  largest.push({ file: repoPath, lines, limit, tracked: trackedLargeFiles.has(repoPath) });

  if (lines > limit) {
    failures.push(`${repoPath}: ${lines} lines exceeds ratchet limit ${limit}.`);
  }
}

for (const repoPath of trackedLargeFiles.keys()) {
  if (!seen.has(repoPath)) {
    failures.push(`${repoPath}: tracked large file is missing. Remove it from large-file-ratchet-check if the debt was eliminated.`);
  }
}

largest.sort((left, right) => right.lines - left.lines);

const report = {
  ok: failures.length === 0,
  limits: {
    backendNewFileLimit,
    frontendNewFileLimit,
  },
  trackedLargeFiles: trackedLargeFiles.size,
  largest: largest.slice(0, 15),
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
