import { uploadFileToServer, type UploadResourceType } from '@/lib/uploadApi';
import { createClientRandomId } from '@/lib/randomId';
import type { EntityId, StudioAssetType } from './studioModel';

// Mirrors backend/src/uploads/upload-policy.ts: anything else would be refused after the upload.
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const RESOURCE_ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.mp3,.m4a,.wav,.txt,.csv,.md,.json';

/** Reads a local video's length (seconds) before upload, so the lecture duration fills itself in. */
export function readVideoDurationSeconds(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done(0);
    video.src = url;
  });
}

export function assetTypeForFile(file: File): StudioAssetType {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (/\.(pptx?|key|odp)$/.test(name)) return 'slides';
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'archive';
  if (/\.(js|ts|py|java|c|cpp|cs|php|rb|go|sql|html|css|json)$/.test(name)) return 'code';
  return 'archive';
}

function resourceTypeFor(assetType: StudioAssetType): UploadResourceType {
  return assetType === 'video' ? 'video' : 'raw';
}

export async function uploadCourseFile(
  file: File,
  target: { courseId: EntityId; lessonId?: EntityId; kind: 'lesson' | 'cover' | 'trailer' },
  onProgress?: (progress: number) => void,
) {
  const folder = target.kind === 'lesson'
    ? `c2p/courses/${target.courseId}/lessons/${target.lessonId}`
    : `c2p/courses/${target.courseId}/${target.kind}`;
  const resourceType: UploadResourceType = target.kind === 'cover'
    ? 'image'
    : target.kind === 'trailer' ? 'video' : resourceTypeFor(assetTypeForFile(file));
  return uploadFileToServer(file, {
    folder,
    filename: createClientRandomId(`${target.kind}-${target.lessonId ?? target.courseId}`),
    resourceType,
    onProgress,
  });
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1).replace('.', ',')} ${units[unit]}`;
}
