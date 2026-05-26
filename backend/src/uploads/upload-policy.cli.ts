import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BadRequestException } from '@nestjs/common';
import {
  assertUploadTypeAllowed,
  getUploadPolicySnapshot,
  resolveUploadExtension,
} from './upload-policy.js';
import { LocalDiskUploadStorageProvider } from './upload-storage-provider.js';

function assertRejected(input: Parameters<typeof assertUploadTypeAllowed>[0]) {
  assert.throws(() => assertUploadTypeAllowed(input), BadRequestException);
}

async function assertLocalStorageProviderContract() {
  const root = await mkdtemp(join(tmpdir(), 'c2p-upload-provider-'));
  const tempRoot = join(root, '_tmp');
  const publicRoot = join(root, 'public');
  const sourcePath = join(tempRoot, 'source.txt');
  const provider = new LocalDiskUploadStorageProvider(publicRoot, tempRoot);

  try {
    await provider.ensureTempRoot();
    await writeFile(sourcePath, 'storage-contract');

    const stored = await provider.storeObject({
      sourcePath,
      folder: 'smoke/contracts',
      filename: 'sample.txt',
    });

    assert.equal(stored.driver, 'local-disk');
    assert.equal(stored.storageKey, 'smoke/contracts/sample.txt');
    assert.equal(stored.relativePath, '/uploads/smoke/contracts/sample.txt');
    assert.equal(await readFile(join(publicRoot, stored.storageKey), 'utf8'), 'storage-contract');
    await assert.rejects(() => stat(sourcePath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main() {
  assert.doesNotThrow(() => assertUploadTypeAllowed({
    resourceType: 'image',
    mimeType: 'image/jpeg',
    originalName: 'photo.jpg',
  }));
  assert.doesNotThrow(() => assertUploadTypeAllowed({
    resourceType: 'video',
    mimeType: 'video/mp4',
    originalName: 'trailer.mp4',
  }));
  assert.doesNotThrow(() => assertUploadTypeAllowed({
    resourceType: 'raw',
    mimeType: 'application/pdf',
    originalName: 'consigne.pdf',
  }));
  assert.doesNotThrow(() => assertUploadTypeAllowed({
    resourceType: 'raw',
    mimeType: 'audio/mpeg',
    originalName: 'audio.mp3',
  }));

  assertRejected({
    resourceType: 'image',
    mimeType: 'image/svg+xml',
    originalName: 'payload.svg',
  });
  assertRejected({
    resourceType: 'raw',
    mimeType: 'application/octet-stream',
    originalName: 'payload.exe',
  });
  assertRejected({
    resourceType: 'raw',
    mimeType: 'application/pdf',
    originalName: 'payload.exe',
  });
  assertRejected({
    resourceType: 'video',
    mimeType: 'video/mp4',
    originalName: 'video.pdf',
  });

  assert.equal(resolveUploadExtension('', 'image/jpeg'), '.jpg');
  assert.equal(resolveUploadExtension('document.PDF', 'application/pdf'), '.pdf');
  assert.equal(resolveUploadExtension('', 'application/octet-stream'), '');

  const policy = getUploadPolicySnapshot();
  assert.equal(policy.image.includes('image/svg+xml'), false);
  assert.equal(policy.raw.includes('application/octet-stream'), false);
  await assertLocalStorageProviderContract();

  console.log(JSON.stringify({
    ok: true,
    policy,
  }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
