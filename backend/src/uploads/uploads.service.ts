import { BadRequestException, Injectable } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '../config/config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MonitoringService } from '../monitoring/monitoring.service.js';
import {
  assertUploadTypeAllowed,
  resolveUploadExtension,
  type UploadResourceType,
} from './upload-policy.js';
import {
  LocalDiskUploadStorageProvider,
  S3UploadStorageProvider,
  type UploadStorageProvider,
} from './upload-storage-provider.js';

export interface StoredUploadFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
  filename?: string;
  destination?: string;
}

interface UploadPolicy {
  resourceType: UploadResourceType;
  maxBytes: number;
  label: string;
}

@Injectable()
export class UploadsService {
  private readonly storageProvider: UploadStorageProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly monitoring: MonitoringService,
  ) {
    this.storageProvider = this.createStorageProvider();
  }

  getStrategy() {
    return {
      mode: this.storageProvider.driver,
      supportsUploadProgress: true,
      supportsSignedUrls: false,
      publicBaseUrl: this.config.uploadPublicBaseUrl ?? null,
      tempRoot: this.storageProvider.tempRoot,
      storageRoot: this.storageProvider.publicRoot,
      requestMaxBytes: this.config.uploadRequestMaxBytes,
      resourceTypes: {
        image: this.getPolicy('image'),
        raw: this.getPolicy('raw'),
        video: this.getPolicy('video'),
      },
    };
  }

  async ensureTempRoot() {
    return this.storageProvider.ensureTempRoot();
  }

  private createStorageProvider(): UploadStorageProvider {
    if (this.config.uploadStorageDriver === 's3') {
      return new S3UploadStorageProvider({
        endpoint: requiredUploadConfig(this.config.uploadS3Endpoint, 'UPLOAD_S3_ENDPOINT'),
        region: this.config.uploadS3Region,
        bucket: requiredUploadConfig(this.config.uploadS3Bucket, 'UPLOAD_S3_BUCKET'),
        accessKeyId: requiredUploadConfig(this.config.uploadS3AccessKeyId, 'UPLOAD_S3_ACCESS_KEY_ID'),
        secretAccessKey: requiredUploadConfig(this.config.uploadS3SecretAccessKey, 'UPLOAD_S3_SECRET_ACCESS_KEY'),
        tempRoot: this.config.uploadTmpRoot,
        keyPrefix: this.config.uploadS3KeyPrefix,
        forcePathStyle: this.config.uploadS3ForcePathStyle,
      });
    }

    return LocalDiskUploadStorageProvider.create({
      storageRoot: this.config.uploadStorageRoot,
      tempRoot: this.config.uploadTmpRoot,
    });
  }

  resolvePublicUrl(relativePath: string, fallbackOrigin?: string) {
    const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    if (this.config.uploadPublicBaseUrl) {
      return `${this.config.uploadPublicBaseUrl}${normalizedPath}`;
    }
    return fallbackOrigin ? `${fallbackOrigin.replace(/\/$/, '')}${normalizedPath}` : normalizedPath;
  }

  async readPublicObject(publicPath: string, range?: string) {
    const storageKey = publicPath
      .replaceAll('\\', '/')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('/');
    if (!storageKey || storageKey.includes('..')) {
      return null;
    }
    return this.storageProvider.readObject(storageKey, range);
  }

  private getPolicy(resourceType: UploadResourceType): UploadPolicy {
    if (resourceType === 'image') {
      return {
        resourceType,
        maxBytes: this.config.uploadImageMaxBytes,
        label: 'images',
      };
    }

    if (resourceType === 'video') {
      return {
        resourceType,
        maxBytes: this.config.uploadVideoMaxBytes,
        label: 'videos',
      };
    }

    return {
      resourceType: 'raw',
      maxBytes: this.config.uploadRawMaxBytes,
      label: 'documents et fichiers',
    };
  }

  private normalizeFolder(folder?: string) {
    const normalized = normalizeStorageFolder(String(folder ?? 'general').trim());

    if (!normalized) {
      throw new BadRequestException('Dossier de stockage invalide.');
    }

    if (!isStorageFolderSafe(normalized) || normalized.includes('..')) {
      throw new BadRequestException('Dossier de stockage invalide.');
    }

    return normalized;
  }

  private normalizeExtension(file: StoredUploadFile) {
    return resolveUploadExtension(file.originalname, file.mimetype);
  }

  private assertMimeType(file: StoredUploadFile, resourceType: UploadResourceType) {
    assertUploadTypeAllowed({
      resourceType,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
  }

  private assertFileSize(file: StoredUploadFile, resourceType: UploadResourceType) {
    const policy = this.getPolicy(resourceType);
    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new BadRequestException('Aucun fichier a enregistrer.');
    }
    if (file.size > policy.maxBytes) {
      throw new BadRequestException(
        `Le fichier depasse la limite autorisee pour les ${policy.label} (${Math.round(policy.maxBytes / (1024 * 1024))} Mo).`,
      );
    }
  }

  private classifyUploadRejection(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('taille') || message.includes('limite') || message.includes('dépasse') || message.includes('depasse')) {
      return 'size_limit';
    }
    if (message.includes('mime') || message.includes('type') || message.includes('extension') || message.includes('image') || message.includes('video')) {
      return 'type_policy';
    }
    if (message.includes('dossier')) {
      return 'invalid_folder';
    }
    if (message.includes('aucun fichier')) {
      return 'empty_file';
    }
    return 'storage_error';
  }

  async storeFile(
    file: StoredUploadFile,
    payload: { folder?: string; filename?: string; resourceType?: UploadResourceType; ownerId?: string },
  ) {
    if (!file?.path) {
      throw new BadRequestException('Aucun fichier a enregistrer.');
    }

    const resourceType = payload.resourceType ?? 'raw';
    const folder = this.normalizeFolder(payload.folder);
    const extension = this.normalizeExtension(file);
    const safeFilenameBase = normalizeFilenameBase(String(payload.filename ?? file.originalname ?? randomUUID())) || randomUUID();
    const finalFilename = `${Date.now()}-${safeFilenameBase}${extension}`;
    let moved = false;

    try {
      this.assertMimeType(file, resourceType);
      this.assertFileSize(file, resourceType);
      const storedObject = await this.storageProvider.storeObject({
        sourcePath: file.path,
        folder,
        filename: finalFilename,
        contentType: file.mimetype,
      });
      moved = true;
      const uploadId = await this.recordUploadObject({
        ownerId: payload.ownerId,
        folder,
        filename: finalFilename,
        storedObject,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        resourceType,
      });
      this.monitoring.recordUploadAccepted(resourceType, file.size);

      return {
        uploadId,
        folder,
        filename: finalFilename,
        driver: storedObject.driver,
        storageKey: storedObject.storageKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        resourceType,
        relativePath: storedObject.relativePath,
      };
    } catch (error) {
      this.monitoring.recordUploadRejected(resourceType, this.classifyUploadRejection(error));
      if (!moved) {
        await rm(file.path, { force: true }).catch(() => undefined);
      }
      throw error;
    }
  }

  private async recordUploadObject(input: {
    ownerId?: string;
    folder: string;
    filename: string;
    storedObject: Awaited<ReturnType<UploadStorageProvider['storeObject']>>;
    originalName: string;
    mimeType: string;
    size: number;
    resourceType: UploadResourceType;
  }) {
    if (!this.prisma.isConnected) return null;

    try {
      const publicUrl = this.config.uploadPublicBaseUrl
        ? this.resolvePublicUrl(input.storedObject.relativePath)
        : null;
      const row = await this.prisma.uploadObject.create({
        data: {
          ownerId: input.ownerId ?? null,
          driver: input.storedObject.driver,
          storageKey: input.storedObject.storageKey,
          relativePath: input.storedObject.relativePath,
          publicUrl,
          folder: input.folder,
          filename: input.filename,
          originalName: input.originalName,
          mimeType: input.mimeType,
          resourceType: input.resourceType,
          sizeBytes: BigInt(input.size),
          status: 'active',
        },
        select: { id: true },
      });
      return row.id;
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        ts: new Date().toISOString(),
        event: 'upload_metadata_write_failed',
        storageKey: input.storedObject.storageKey,
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  }
}

function normalizeStorageFolder(value: string) {
  return value
    .replaceAll('\\', '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
}

function isStorageFolderSafe(value: string) {
  for (const char of value) {
    const code = char.charCodeAt(0);
    const isAlphaNumeric = (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (!isAlphaNumeric && char !== '/' && char !== '_' && char !== '-') {
      return false;
    }
  }
  return true;
}

function normalizeFilenameBase(value: string) {
  let normalized = '';
  for (const char of value.toLowerCase()) {
    const code = char.charCodeAt(0);
    const isAlphaNumeric = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (isAlphaNumeric || char === '_' || char === '-') {
      normalized += char;
    } else if (normalized && !normalized.endsWith('-')) {
      normalized += '-';
    }
    if (normalized.length >= 80) break;
  }
  return normalized.endsWith('-') ? normalized.slice(0, -1) : normalized;
}

function requiredUploadConfig(value: string | undefined, key: string) {
  if (!value?.trim()) {
    throw new Error(`${key} is required by the configured upload storage driver.`);
  }
  return value;
}
