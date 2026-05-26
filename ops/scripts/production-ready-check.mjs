#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function run(label, command, args, options = {}) {
  process.stdout.write(`[production-ready] ${label}\n`);
  execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  });
}

function main() {
  const backendDir = path.join(repoRoot, 'backend');
  const frontendDir = path.join(repoRoot, 'front');
  const realBackendEnv = path.join(repoRoot, 'ops/env/backend.production.env');
  const realComposeEnv = path.join(repoRoot, 'ops/env/compose.production.env');

  run('backend verify', 'npm', ['run', 'verify'], { cwd: backendDir });
  run('frontend verify', 'npm', ['run', 'verify'], { cwd: frontendDir });
  run('production runtime static checks', 'npm', ['run', 'production:runtime:check'], { cwd: backendDir });
  run(
    'production compose static checks with examples',
    'npm',
    ['run', 'production:compose:check', '--', '--compose-env', 'ops/env/compose.production.env.example'],
    { cwd: backendDir },
  );
  run('local MinIO compose syntax', 'docker', ['compose', '-f', 'backend/docker-compose.yml', 'config', '-q']);

  if (fs.existsSync(realBackendEnv) && fs.existsSync(realComposeEnv)) {
    run(
      'real production env status',
      'node',
      [
        'ops/scripts/production-env-status.mjs',
        '--strict',
        '--backend-env',
        realBackendEnv,
        '--compose-env',
        realComposeEnv,
      ],
    );
    run(
      'real production preflight',
      'node',
      [
        'ops/scripts/production-preflight.mjs',
        '--backend-env',
        realBackendEnv,
        '--compose-env',
        realComposeEnv,
      ],
    );
    run(
      'real external provider checks',
      'node',
      [
        'ops/scripts/production-external-providers-check.mjs',
        '--backend-env',
        realBackendEnv,
      ],
    );
  } else {
    process.stdout.write('[production-ready] real production preflight skipped: ops/env/backend.production.env or ops/env/compose.production.env is missing.\n');
  }

  process.stdout.write('[production-ready] OK\n');
}

try {
  main();
} catch (error) {
  process.stderr.write('[production-ready] FAILED\n');
  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
  } else {
    process.stderr.write(`${String(error)}\n`);
  }
  process.exit(1);
}
