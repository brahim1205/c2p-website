#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const frontRoot = path.join(repoRoot, 'front');
const srcRoot = path.join(frontRoot, 'src');

const allowedDirectDataFiles = new Map([
  ['src/lib/backendClient.ts', 'legacy-data-adapter'],
]);

const allowedBrowserStorageFiles = new Map([
  ['src/hooks/useAuth.tsx', 'auth-session-ephemeral'],
  [
    'src/pages/dashboard/formateur/mes-cours/components/wizardStorage.ts',
    'trainer-draft-storage-adapter',
  ],
]);

const migrationBacklog = [
  {
    file: 'src/pages/dashboard/formateur/mes-cours/components/wizardStorage.ts',
    target: 'Keep local autosave as draft-only state; published course data must remain backend-owned.',
  },
];

function walkFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

function toFrontPath(filePath) {
  return path.relative(frontRoot, filePath).replace(/\\/g, '/');
}

function hasDirectDataUsage(content) {
  return (
    content.includes("'/data/")
    || content.includes('"/data/')
    || content.includes('`/data/')
    || content.includes("'/data'")
    || content.includes('"/data"')
    || content.includes('`/data`')
  );
}

function hasBrowserStorageUsage(content) {
  return content.includes('localStorage') || content.includes('sessionStorage');
}

function hasInlineQueryKey(content) {
  let searchFrom = 0;
  while (searchFrom < content.length) {
    const keyIndex = content.indexOf('queryKey', searchFrom);
    if (keyIndex === -1) return false;
    const colonIndex = content.indexOf(':', keyIndex + 'queryKey'.length);
    if (colonIndex === -1) return false;
    const nextLineIndex = content.indexOf('\n', keyIndex);
    const scanEnd = nextLineIndex === -1 ? content.length : nextLineIndex;
    const between = content.slice(colonIndex + 1, scanEnd).trimStart();
    if (between.startsWith('[')) return true;
    searchFrom = keyIndex + 'queryKey'.length;
  }
  return false;
}

function main() {
  const files = walkFiles(srcRoot);
  const directDataAllowed = [];
  const directDataViolations = [];
  const browserStorageAllowed = [];
  const browserStorageViolations = [];
  const inlineQueryKeyViolations = [];

  for (const file of files) {
    const frontPath = toFrontPath(file);
    const content = fs.readFileSync(file, 'utf8');

    if (hasDirectDataUsage(content)) {
      const reason = allowedDirectDataFiles.get(frontPath);
      if (reason) {
        directDataAllowed.push({ file: frontPath, reason });
      } else {
        directDataViolations.push({
          file: frontPath,
          reason: 'Direct /data access must go through a domain API or the legacy backendClient adapter.',
        });
      }
    }

    if (hasBrowserStorageUsage(content)) {
      const reason = allowedBrowserStorageFiles.get(frontPath);
      if (reason) {
        browserStorageAllowed.push({ file: frontPath, reason });
      } else {
        browserStorageViolations.push({
          file: frontPath,
          reason: 'Browser storage must be explicitly classified. Server-owned state cannot be hidden in localStorage/sessionStorage.',
        });
      }
    }

    if (hasInlineQueryKey(content)) {
      inlineQueryKeyViolations.push({
        file: frontPath,
        reason: 'React Query keys must be declared in src/lib/queryKeys.ts to avoid cache fragmentation.',
      });
    }
  }

  const result = {
    ok: directDataViolations.length === 0
      && browserStorageViolations.length === 0
      && inlineQueryKeyViolations.length === 0,
    directDataAccess: {
      allowed: directDataAllowed.sort((a, b) => a.file.localeCompare(b.file)),
      violations: directDataViolations.sort((a, b) => a.file.localeCompare(b.file)),
    },
    browserStorage: {
      allowed: browserStorageAllowed.sort((a, b) => a.file.localeCompare(b.file)),
      violations: browserStorageViolations.sort((a, b) => a.file.localeCompare(b.file)),
    },
    queryKeys: {
      violations: inlineQueryKeyViolations.sort((a, b) => a.file.localeCompare(b.file)),
    },
    migrationBacklog,
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main();
