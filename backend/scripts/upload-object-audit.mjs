import 'dotenv/config';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const DEFAULT_LIMIT = 5000;
const DEFAULT_GRACE_DAYS = 7;

function parseArgs(argv) {
  const options = {
    limit: DEFAULT_LIMIT,
    graceDays: Number(process.env.UPLOAD_ORPHAN_GRACE_DAYS || DEFAULT_GRACE_DAYS),
    status: 'active',
    markOrphans: false,
    strict: false,
  };

  for (const arg of argv) {
    if (arg === '--mark-orphans') {
      options.markOrphans = true;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      options.limit = parsePositiveInteger(arg.slice('--limit='.length), 'limit');
      continue;
    }
    if (arg.startsWith('--grace-days=')) {
      options.graceDays = parsePositiveInteger(arg.slice('--grace-days='.length), 'grace-days');
      continue;
    }
    if (arg.startsWith('--status=')) {
      options.status = arg.slice('--status='.length);
      continue;
    }
    throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!['active', 'orphaned', 'all'].includes(options.status)) {
    throw new Error('--status doit valoir active, orphaned ou all.');
  }

  return options;
}

function parsePositiveInteger(raw, label) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--${label} doit être un entier positif.`);
  }
  return value;
}

function jsonReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function safeJson(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return '';
  }
}

function buildNeedles(upload) {
  return [
    upload.storageKey,
    upload.relativePath,
    upload.publicUrl,
    upload.storageKey ? `/uploads/${upload.storageKey}` : null,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
}

function hasReference(referenceCorpus, upload) {
  const needles = buildNeedles(upload);
  return needles.some((needle) => referenceCorpus.includes(needle));
}

function ageInDays(date, now) {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

async function collectReferenceCorpus(prisma) {
  const chunks = [];

  const appRows = await prisma.appRow.findMany({
    select: {
      key: true,
      table: true,
      rowId: true,
      data: true,
    },
  });
  for (const row of appRows) {
    chunks.push(row.key, row.table, row.rowId, safeJson(row.data));
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      avatar: true,
      introVideo: true,
      metadata: true,
      socialLinks: true,
      certifications: true,
      portfolioItems: true,
    },
  });
  for (const user of users) {
    chunks.push(
      user.id,
      user.email,
      user.avatar ?? '',
      user.introVideo ?? '',
      safeJson(user.metadata),
      safeJson(user.socialLinks),
      safeJson(user.certifications),
      safeJson(user.portfolioItems),
    );
  }

  return {
    corpus: chunks.join('\n'),
    sources: {
      appRows: appRows.length,
      users: users.length,
    },
  };
}

async function localFileExists(upload) {
  if (upload.driver !== 'local-disk') return null;

  const localPath = resolve(process.cwd(), 'storage/uploads', upload.storageKey);
  try {
    await access(localPath);
    return true;
  } catch {
    return false;
  }
}

function compactUpload(upload, extra = {}) {
  return {
    id: upload.id,
    ownerId: upload.ownerId,
    driver: upload.driver,
    storageKey: upload.storageKey,
    relativePath: upload.relativePath,
    publicUrl: upload.publicUrl,
    resourceType: upload.resourceType,
    sizeBytes: upload.sizeBytes,
    status: upload.status,
    createdAt: upload.createdAt,
    ...extra,
  };
}

function mergeMetadata(metadata, patch) {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return { ...metadata, ...patch };
  }
  return patch;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const now = new Date();

  try {
    const where = options.status === 'all' ? {} : { status: options.status };
    const uploads = await prisma.uploadObject.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: options.limit,
    });

    const references = await collectReferenceCorpus(prisma);
    const missingLocalFiles = [];
    const unreferenced = [];
    const orphanCandidates = [];

    for (const upload of uploads) {
      const referenced = hasReference(references.corpus, upload);
      const localExists = await localFileExists(upload);
      const uploadAgeDays = ageInDays(upload.createdAt, now);

      if (localExists === false) {
        missingLocalFiles.push(compactUpload(upload, { ageDays: uploadAgeDays }));
      }

      if (!referenced) {
        const compact = compactUpload(upload, {
          ageDays: uploadAgeDays,
          localFileExists: localExists,
        });
        unreferenced.push(compact);

        if (upload.status === 'active' && uploadAgeDays >= options.graceDays) {
          orphanCandidates.push(compact);
        }
      }
    }

    const marked = [];
    if (options.markOrphans) {
      for (const candidate of orphanCandidates) {
        const source = uploads.find((upload) => upload.id === candidate.id);
        if (!source) continue;

        const updated = await prisma.uploadObject.update({
          where: { id: candidate.id },
          data: {
            status: 'orphaned',
            metadata: mergeMetadata(source.metadata, {
              orphanedAt: now.toISOString(),
              orphanReason: 'not_referenced_by_app_rows_or_user_upload_fields',
              orphanAuditGraceDays: options.graceDays,
            }),
          },
          select: { id: true, storageKey: true, status: true },
        });
        marked.push(updated);
      }
    }

    const report = {
      ok: true,
      mode: options.markOrphans ? 'mark-orphans' : 'dry-run',
      checkedAt: now.toISOString(),
      options,
      referenceSources: references.sources,
      scannedUploads: uploads.length,
      summary: {
        missingLocalFiles: missingLocalFiles.length,
        unreferenced: unreferenced.length,
        orphanCandidates: orphanCandidates.length,
        markedOrphaned: marked.length,
      },
      samples: {
        missingLocalFiles: missingLocalFiles.slice(0, 20),
        orphanCandidates: orphanCandidates.slice(0, 20),
        marked,
      },
    };

    console.log(JSON.stringify(report, jsonReplacer, 2));

    if (options.strict && (missingLocalFiles.length > 0 || orphanCandidates.length > 0)) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
