import { createHash, createHmac } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, unlink } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

export type UploadStorageDriver = 'local-disk' | 's3';

export interface UploadStorageWriteInput {
  sourcePath: string;
  folder: string;
  filename: string;
  contentType?: string;
}

export interface UploadStorageWriteResult {
  driver: UploadStorageDriver;
  storageKey: string;
  relativePath: string;
}

export interface UploadStorageReadResult {
  body: NodeJS.ReadableStream;
  statusCode: 200 | 206;
  contentType: string;
  contentLength?: number;
  contentRange?: string;
  acceptRanges?: string;
  etag?: string;
  lastModified?: string;
}

export interface UploadStorageProvider {
  readonly driver: UploadStorageDriver;
  readonly publicRoot: string;
  readonly tempRoot: string;
  ensureTempRoot(): Promise<string>;
  storeObject(input: UploadStorageWriteInput): Promise<UploadStorageWriteResult>;
  readObject(storageKey: string, range?: string): Promise<UploadStorageReadResult | null>;
  deleteObject(storageKey: string): Promise<void>;
}

export class LocalDiskUploadStorageProvider implements UploadStorageProvider {
  readonly driver = 'local-disk' as const;

  constructor(
    readonly publicRoot: string,
    readonly tempRoot: string,
  ) {}

  static create(input: { storageRoot: string; tempRoot: string }) {
    return new LocalDiskUploadStorageProvider(
      resolve(process.cwd(), input.storageRoot),
      resolve(process.cwd(), input.tempRoot),
    );
  }

  async ensureTempRoot() {
    await mkdir(this.tempRoot, { recursive: true });
    return this.tempRoot;
  }

  async storeObject(input: UploadStorageWriteInput) {
    const storageKey = `${input.folder}/${input.filename}`;
    const absoluteFolder = join(this.publicRoot, input.folder);
    const absolutePath = join(absoluteFolder, input.filename);
    assertPathInsideRoot(this.publicRoot, absolutePath);

    await mkdir(absoluteFolder, { recursive: true });
    await this.moveFile(input.sourcePath, absolutePath);

    return {
      driver: this.driver,
      storageKey,
      relativePath: `/uploads/${storageKey}`,
    };
  }

  async readObject(storageKey: string, range?: string) {
    const normalizedKey = storageKey.startsWith('uploads/') ? storageKey.slice('uploads/'.length) : storageKey;
    const absolutePath = join(this.publicRoot, normalizedKey);
    assertPathInsideRoot(this.publicRoot, absolutePath);

    let objectStat;
    try {
      objectStat = await stat(absolutePath);
    } catch {
      return null;
    }
    if (!objectStat.isFile()) return null;

    const parsedRange = parseByteRange(range, objectStat.size);
    const contentLength = parsedRange ? parsedRange.end - parsedRange.start + 1 : objectStat.size;
    return {
      body: createReadStream(absolutePath, parsedRange ?? undefined),
      statusCode: parsedRange ? 206 as const : 200 as const,
      contentType: contentTypeFromPath(absolutePath),
      contentLength,
      contentRange: parsedRange ? `bytes ${parsedRange.start}-${parsedRange.end}/${objectStat.size}` : undefined,
      acceptRanges: 'bytes',
      lastModified: objectStat.mtime.toUTCString(),
    };
  }

  async deleteObject(storageKey: string) {
    const absolutePath = join(this.publicRoot, storageKey);
    assertPathInsideRoot(this.publicRoot, absolutePath);
    await unlink(absolutePath).catch(() => undefined);
  }

  private async moveFile(sourcePath: string, targetPath: string) {
    try {
      await rename(sourcePath, targetPath);
      return;
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code !== 'EXDEV') {
        throw error;
      }
    }

    await copyFile(sourcePath, targetPath);
    await unlink(sourcePath);
  }
}

export interface S3UploadStorageProviderConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  tempRoot: string;
  keyPrefix?: string;
  forcePathStyle?: boolean;
}

export class S3UploadStorageProvider implements UploadStorageProvider {
  readonly driver = 's3' as const;
  readonly publicRoot: string;
  readonly tempRoot: string;
  private readonly endpoint: URL;
  private readonly keyPrefix: string;
  private readonly forcePathStyle: boolean;

  constructor(private readonly config: S3UploadStorageProviderConfig) {
    this.endpoint = new URL(config.endpoint.endsWith('/') ? config.endpoint.slice(0, -1) : config.endpoint);
    this.publicRoot = `${this.endpoint.origin}/${config.bucket}`;
    this.tempRoot = resolve(process.cwd(), config.tempRoot);
    this.keyPrefix = normalizeStoragePath(String(config.keyPrefix ?? 'uploads').trim());
    this.forcePathStyle = config.forcePathStyle ?? true;
  }

  async ensureTempRoot() {
    await mkdir(this.tempRoot, { recursive: true });
    return this.tempRoot;
  }

  async storeObject(input: UploadStorageWriteInput) {
    const keyParts = [this.keyPrefix, input.folder, input.filename].filter(Boolean);
    const storageKey = keyParts.join('/');
    const body = await readFile(input.sourcePath);
    const targetUrl = this.resolveObjectUrl(storageKey);
    const headers = this.createSignedHeaders({
      method: 'PUT',
      url: targetUrl,
      body,
      contentType: input.contentType ?? 'application/octet-stream',
    });

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers,
      body,
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      throw new Error(`S3 upload failed (${response.status}): ${responseBody.slice(0, 240)}`);
    }

    await unlink(input.sourcePath).catch(() => undefined);

    return {
      driver: this.driver,
      storageKey,
      relativePath: `/${storageKey}`,
    };
  }

  async readObject(storageKey: string, range?: string) {
    const normalizedKey = normalizeStoragePath(storageKey);
    if (!normalizedKey || normalizedKey.includes('..') || !normalizedKey.startsWith(`${this.keyPrefix}/`)) {
      return null;
    }

    const targetUrl = this.resolveObjectUrl(normalizedKey);
    const headers = this.createSignedHeaders({
      method: 'GET',
      url: targetUrl,
      body: Buffer.alloc(0),
    });
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        ...headers,
        ...(range ? { Range: range } : {}),
      },
    });

    if (response.status === 404) return null;
    if (!response.ok || !response.body) {
      const responseBody = await response.text().catch(() => '');
      throw new Error(`S3 download failed (${response.status}): ${responseBody.slice(0, 240)}`);
    }

    return {
      body: Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),
      statusCode: response.status === 206 ? 206 as const : 200 as const,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      contentLength: parseOptionalPositiveInteger(response.headers.get('content-length')),
      contentRange: response.headers.get('content-range') ?? undefined,
      acceptRanges: response.headers.get('accept-ranges') ?? 'bytes',
      etag: response.headers.get('etag') ?? undefined,
      lastModified: response.headers.get('last-modified') ?? undefined,
    };
  }

  async deleteObject(storageKey: string) {
    const targetUrl = this.resolveObjectUrl(storageKey);
    const headers = this.createSignedHeaders({
      method: 'DELETE',
      url: targetUrl,
      body: Buffer.alloc(0),
      contentType: 'application/octet-stream',
    });

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      const responseBody = await response.text().catch(() => '');
      throw new Error(`S3 delete failed (${response.status}): ${responseBody.slice(0, 240)}`);
    }
  }

  private resolveObjectUrl(storageKey: string) {
    const encodedKey = storageKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    if (this.forcePathStyle) {
      return new URL(`${this.endpoint.pathname.replace(/\/$/, '')}/${this.config.bucket}/${encodedKey}`, this.endpoint.origin);
    }

    const url = new URL(`${this.endpoint.pathname.replace(/\/$/, '')}/${encodedKey}`, this.endpoint.origin);
    url.hostname = `${this.config.bucket}.${url.hostname}`;
    return url;
  }

  private createSignedHeaders(input: {
    method: 'GET' | 'PUT' | 'DELETE';
    url: URL;
    body: Buffer;
    contentType?: string;
  }) {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(input.body);
    const host = input.url.host;
    const headers: Record<string, string> = {
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    if (input.contentType) {
      headers['content-type'] = input.contentType;
    }
    const signedHeaderNames = Object.keys(headers).sort((left, right) => left.localeCompare(right));
    const canonicalHeaders = signedHeaderNames
      .map((header) => `${header}:${headers[header].trim()}\n`)
      .join('');
    const signedHeaders = signedHeaderNames.join(';');
    const canonicalRequest = [
      input.method,
      input.url.pathname,
      input.url.searchParams.toString(),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');
    const signingKey = getAwsSignatureKey(this.config.secretAccessKey, dateStamp, this.config.region, 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return {
      ...(headers['content-type'] ? { 'Content-Type': headers['content-type'] } : {}),
      Host: headers.host,
      'X-Amz-Content-Sha256': headers['x-amz-content-sha256'],
      'X-Amz-Date': headers['x-amz-date'],
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }
}

function parseByteRange(value: string | undefined, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return null;

  const startText = match[1];
  const endText = match[2];
  if (!startText && !endText) return null;

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(size - suffixLength, 0), end: size - 1 };
  }

  const start = Number(startText);
  const requestedEnd = endText ? Number(endText) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size) {
    return null;
  }
  return { start, end: Math.min(Math.max(requestedEnd, start), size - 1) };
}

function parseOptionalPositiveInteger(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function contentTypeFromPath(path: string) {
  const extension = path.toLowerCase().split('.').pop();
  const types: Record<string, string> = {
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    png: 'image/png',
    svg: 'image/svg+xml',
    webm: 'video/webm',
    webp: 'image/webp',
  };
  return extension ? types[extension] ?? 'application/octet-stream' : 'application/octet-stream';
}

function normalizeStoragePath(value: string) {
  const parts = value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.join('/');
}

function assertPathInsideRoot(root: string, candidatePath: string) {
  const relativePath = relative(resolve(root), resolve(candidatePath));
  if (relativePath === '') return;
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error('Resolved upload path escapes storage root.');
  }
}

function sha256Hex(input: Buffer | string) {
  return createHash('sha256').update(input).digest('hex');
}

function getAwsSignatureKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(regionName).digest();
  const kService = createHmac('sha256', kRegion).update(serviceName).digest();
  return createHmac('sha256', kService).update('aws4_request').digest();
}
