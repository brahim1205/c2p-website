import { BadRequestException, Injectable } from '@nestjs/common';
import { copyFile, mkdir, rename, rm, unlink } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '../config/config.service.js';

export type UploadResourceType = 'image' | 'video' | 'raw';

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
  constructor(private readonly config: ConfigService) {}

  private get storageRoot() {
    return resolve(process.cwd(), this.config.uploadStorageRoot);
  }

  private get tmpRoot() {
    return resolve(process.cwd(), this.config.uploadTmpRoot);
  }

  getStrategy() {
    return {
      mode: 'local-disk',
      supportsUploadProgress: true,
      tempRoot: this.tmpRoot,
      storageRoot: this.storageRoot,
      requestMaxBytes: this.config.uploadRequestMaxBytes,
      resourceTypes: {
        image: this.getPolicy('image'),
        raw: this.getPolicy('raw'),
        video: this.getPolicy('video'),
      },
    };
  }

  async ensureTempRoot() {
    await mkdir(this.tmpRoot, { recursive: true });
    return this.tmpRoot;
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
    const normalized = String(folder ?? 'general')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/{2,}/g, '/');

    if (!normalized) {
      throw new BadRequestException('Dossier de stockage invalide.');
    }

    if (!/^[a-zA-Z0-9/_-]+$/.test(normalized) || normalized.includes('..')) {
      throw new BadRequestException('Dossier de stockage invalide.');
    }

    return normalized;
  }

  private normalizeExtension(file: StoredUploadFile) {
    const fromOriginal = extname(file.originalname || '').toLowerCase();
    if (fromOriginal) {
      return fromOriginal.replace(/[^.a-z0-9]/g, '');
    }

    const mimeExtensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/mp4': '.m4a',
      'application/pdf': '.pdf',
      'application/zip': '.zip',
      'application/x-zip-compressed': '.zip',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.ms-powerpoint': '.ppt',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'application/json': '.json',
    };

    return mimeExtensionMap[file.mimetype] ?? '';
  }

  private assertMimeType(file: StoredUploadFile, resourceType: UploadResourceType) {
    const mime = String(file.mimetype || '').toLowerCase();

    if (resourceType === 'image' && !mime.startsWith('image/')) {
      throw new BadRequestException('Le fichier doit etre une image.');
    }

    if (resourceType === 'video' && !mime.startsWith('video/')) {
      throw new BadRequestException('Le fichier doit etre une video.');
    }

    if (resourceType === 'raw') {
      const allowed = [
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/json',
        'application/octet-stream',
        'text/plain',
        'text/markdown',
      ];

      if (!mime.startsWith('audio/') && !allowed.includes(mime)) {
        throw new BadRequestException('Type de fichier non autorise.');
      }
    }
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

  async storeFile(
    file: StoredUploadFile,
    payload: { folder?: string; filename?: string; resourceType?: UploadResourceType },
  ) {
    if (!file?.path) {
      throw new BadRequestException('Aucun fichier a enregistrer.');
    }

    const resourceType = payload.resourceType ?? 'raw';
    const folder = this.normalizeFolder(payload.folder);
    const extension = this.normalizeExtension(file);
    const safeFilenameBase = String(payload.filename ?? file.originalname ?? randomUUID())
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || randomUUID();
    const finalFilename = `${Date.now()}-${safeFilenameBase}${extension}`;
    const absoluteFolder = join(this.storageRoot, folder);
    const absolutePath = join(absoluteFolder, finalFilename);
    let moved = false;

    try {
      this.assertMimeType(file, resourceType);
      this.assertFileSize(file, resourceType);
      await mkdir(absoluteFolder, { recursive: true });
      await this.moveFile(file.path, absolutePath);
      moved = true;

      return {
        folder,
        filename: finalFilename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        resourceType,
        relativePath: `/uploads/${folder}/${finalFilename}`,
      };
    } catch (error) {
      if (!moved) {
        await rm(file.path, { force: true }).catch(() => undefined);
      }
      throw error;
    }
  }
}
