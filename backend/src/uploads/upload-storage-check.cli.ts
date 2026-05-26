import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  LocalDiskUploadStorageProvider,
  S3UploadStorageProvider,
  type UploadStorageProvider,
} from './upload-storage-provider.js';

function parseArgs(argv: string[]) {
  const entries = new Map<string, string>();
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

function readEnvFile(filePath: string, options: { override: boolean }) {
  if (!existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!options.override && process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

function loadEnvFiles() {
  const args = parseArgs(process.argv.slice(2));
  const explicitEnvFile = args.get('env-file') ?? process.env.C2P_ENV_FILE;
  if (explicitEnvFile) {
    readEnvFile(resolve(process.cwd(), explicitEnvFile), { override: true });
  }

  const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
  const files = [
    `.env.${nodeEnv}`,
    nodeEnv === 'production' ? '.env.prod' : '',
    '.env',
  ].filter(Boolean);

  for (const file of files) {
    const filePath = resolve(process.cwd(), file);
    if (!existsSync(filePath)) continue;
    readEnvFile(filePath, { override: false });
  }
}

function requireEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function createProvider(tempRoot: string): UploadStorageProvider {
  const driver = process.env.UPLOAD_STORAGE_DRIVER || 'local-disk';
  if (driver === 's3') {
    return new S3UploadStorageProvider({
      endpoint: requireEnv('UPLOAD_S3_ENDPOINT'),
      region: process.env.UPLOAD_S3_REGION || 'us-east-1',
      bucket: requireEnv('UPLOAD_S3_BUCKET'),
      accessKeyId: requireEnv('UPLOAD_S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('UPLOAD_S3_SECRET_ACCESS_KEY'),
      keyPrefix: process.env.UPLOAD_S3_KEY_PREFIX || 'uploads',
      forcePathStyle: process.env.UPLOAD_S3_FORCE_PATH_STYLE !== 'false',
      tempRoot,
    });
  }

  if (driver !== 'local-disk') {
    throw new Error(`Unsupported UPLOAD_STORAGE_DRIVER=${driver}.`);
  }

  return LocalDiskUploadStorageProvider.create({
    storageRoot: process.env.UPLOAD_STORAGE_ROOT || 'storage/uploads',
    tempRoot,
  });
}

async function main() {
  loadEnvFiles();
  const tempRoot = await mkdtemp(join(tmpdir(), 'c2p-upload-storage-check-'));
  const provider = createProvider(tempRoot);
  const sourcePath = join(tempRoot, 'storage-check.txt');
  const filename = `${Date.now()}-storage-check.txt`;
  await provider.ensureTempRoot();
  await writeFile(sourcePath, `c2p upload storage check ${new Date().toISOString()}\n`);

  try {
    const stored = await provider.storeObject({
      sourcePath,
      folder: 'smoke/storage-check',
      filename,
      contentType: 'text/plain',
    });

    if (provider.driver === 'local-disk') {
      const storedContent = await readFile(join(provider.publicRoot, stored.storageKey), 'utf8');
      if (!storedContent.includes('c2p upload storage check')) {
        throw new Error('Local storage check wrote unexpected content.');
      }
    }

    await provider.deleteObject(stored.storageKey);

    if (provider.driver === 'local-disk') {
      await stat(join(provider.publicRoot, stored.storageKey))
        .then(() => {
          throw new Error('Local storage check did not delete the object.');
        })
        .catch((error) => {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
          throw error;
        });
    }

    console.log(JSON.stringify({
      ok: true,
      driver: provider.driver,
      storageKey: stored.storageKey,
      deleted: true,
    }, null, 2));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
