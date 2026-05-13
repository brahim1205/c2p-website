#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const composeFile = resolveRepoPath(args.get('compose-file'), 'docker-compose.production.yml');
  const composeEnv = resolveRepoPath(args.get('compose-env'), 'ops/env/compose.production.env');

  try {
    execFileSync(
      'docker',
      ['compose', '--env-file', composeEnv, '-f', composeFile, 'config', '-q'],
      {
        cwd: repoRoot,
        stdio: 'pipe',
      },
    );
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error
      ? String(error.stderr ?? '').trim()
      : '';
    console.error('Production compose check: FAILED');
    if (stderr) {
      console.error(stderr);
    } else if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }

  console.log('Production compose check: OK');
}

main();
