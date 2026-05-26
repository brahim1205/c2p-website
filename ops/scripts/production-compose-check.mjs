#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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
  console.error('Production compose check: FAILED');
  console.error(message);
  process.exit(1);
}

function extractServiceBlock(composeContent, serviceName) {
  const lines = composeContent.split(/\r?\n/);
  const serviceHeader = `  ${serviceName}:`;
  const startIndex = lines.findIndex((line) => line === serviceHeader);
  if (startIndex === -1) {
    return '';
  }

  const block = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > startIndex && /^  [a-zA-Z0-9_-]+:\s*$/.test(line)) {
      break;
    }
    block.push(line);
  }
  return block.join('\n');
}

function assertBackendUploadStorage(composeFile) {
  const composeContent = fs.readFileSync(composeFile, 'utf8');
  const backendBlock = extractServiceBlock(composeContent, 'backend');
  if (!backendBlock) {
    fail('Service backend introuvable dans docker-compose production.');
  }

  if (backendBlock.includes('c2p-upload-data:/usr/src/app/storage/uploads')) {
    fail('Le backend ne doit plus monter c2p-upload-data en production. Les uploads doivent passer par object storage.');
  }

  if (/\nvolumes:\n(?:[\s\S]*\n)?  c2p-upload-data:\s*(?:\n|$)/.test(composeContent)) {
    fail('Le volume Docker c2p-upload-data ne doit plus exister en production.');
  }

  if (!backendBlock.includes('/usr/src/app/storage/uploads/_tmp')) {
    fail('Le backend doit exposer /usr/src/app/storage/uploads/_tmp en tmpfs pour les fichiers temporaires.');
  }
}

function assertProductionServiceHardening(composeFile) {
  const composeContent = fs.readFileSync(composeFile, 'utf8');
  const services = ['reverse-proxy', 'frontend', 'backend', 'backend-migrate', 'redis'];
  for (const serviceName of services) {
    const block = extractServiceBlock(composeContent, serviceName);
    if (!block) {
      fail(`Service ${serviceName} introuvable dans docker-compose production.`);
    }
    if (!block.includes('read_only: true')) {
      fail(`Service ${serviceName} doit être read_only en production.`);
    }
    if (!block.includes('no-new-privileges:true')) {
      fail(`Service ${serviceName} doit définir security_opt no-new-privileges:true.`);
    }
    if (!block.includes('cap_drop:') || !block.includes('- ALL')) {
      fail(`Service ${serviceName} doit supprimer toutes les capabilities Linux via cap_drop: ALL.`);
    }
  }

  for (const serviceName of ['backend', 'postgres']) {
    const block = extractServiceBlock(composeContent, serviceName);
    if (!block.includes('healthcheck:')) {
      fail(`Service ${serviceName} doit avoir un healthcheck production.`);
    }
  }
}

function resolveComposeEnvForConfig(composeEnv) {
  if (!composeEnv.endsWith('.example')) {
    return { composeEnv, cleanup: () => undefined };
  }

  const raw = fs.readFileSync(composeEnv, 'utf8');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c2p-compose-check-'));
  const tempEnv = path.join(tempDir, 'compose.production.env');
  const backendExamplePath = path.join(repoRoot, 'ops/env/backend.production.env.example');
  const patched = raw.replace(
    /^BACKEND_ENV_FILE=.*$/m,
    `BACKEND_ENV_FILE=${backendExamplePath}`,
  );
  fs.writeFileSync(tempEnv, patched);
  return {
    composeEnv: tempEnv,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const composeFile = resolveRepoPath(args.get('compose-file'), 'docker-compose.production.yml');
  const composeEnv = resolveRepoPath(args.get('compose-env'), 'ops/env/compose.production.env');

  assertBackendUploadStorage(composeFile);
  assertProductionServiceHardening(composeFile);

  const composeConfigEnv = resolveComposeEnvForConfig(composeEnv);
  try {
    execFileSync(
      'docker',
      ['compose', '--env-file', composeConfigEnv.composeEnv, '-f', composeFile, 'config', '-q'],
      {
        cwd: repoRoot,
        stdio: 'pipe',
      },
    );
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error
      ? String(error.stderr ?? '').trim()
      : '';
    if (stderr) {
      fail(stderr);
    } else if (error instanceof Error) {
      fail(error.message);
    }
    fail('docker compose config a echoue.');
  } finally {
    composeConfigEnv.cleanup();
  }

  console.log('Production compose check: OK');
}

main();
