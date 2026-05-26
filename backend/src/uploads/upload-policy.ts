import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

export type UploadResourceType = 'image' | 'video' | 'raw';

const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'application/pdf': ['.pdf'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
};

const ALLOWED_MIME_BY_RESOURCE: Record<UploadResourceType, Set<string>> = {
  image: new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]),
  video: new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ]),
  raw: new Set([
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/json',
    'text/plain',
    'text/markdown',
  ]),
};

export function getUploadPolicySnapshot() {
  return Object.fromEntries(
    Object.entries(ALLOWED_MIME_BY_RESOURCE).map(([resourceType, mimeTypes]) => [
      resourceType,
      [...mimeTypes].sort(),
    ]),
  ) as Record<UploadResourceType, string[]>;
}

export function normalizeUploadMimeType(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeUploadExtension(value: unknown) {
  const extension = extname(String(value ?? '')).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return extension.length > 1 ? extension : '';
}

export function resolveUploadExtension(originalName: string, mimeType: string) {
  const fromOriginal = normalizeUploadExtension(originalName);
  if (fromOriginal) return fromOriginal;
  return MIME_EXTENSION_MAP[normalizeUploadMimeType(mimeType)]?.[0] ?? '';
}

export function assertUploadTypeAllowed(input: {
  resourceType: UploadResourceType;
  mimeType: string;
  originalName?: string | null;
}) {
  const mimeType = normalizeUploadMimeType(input.mimeType);
  const allowedMimeTypes = ALLOWED_MIME_BY_RESOURCE[input.resourceType];

  if (!allowedMimeTypes?.has(mimeType)) {
    throw new BadRequestException(
      input.resourceType === 'image'
        ? 'Le fichier doit etre une image autorisee.'
        : input.resourceType === 'video'
          ? 'Le fichier doit etre une video autorisee.'
          : 'Type de fichier non autorise.',
    );
  }

  const extension = normalizeUploadExtension(input.originalName);
  if (!extension) {
    return;
  }

  const expectedExtensions = MIME_EXTENSION_MAP[mimeType] ?? [];
  if (!expectedExtensions.includes(extension)) {
    throw new BadRequestException('Extension de fichier incoherente avec le type MIME.');
  }
}
