import type { UploadResourceType } from '@/lib/uploadApi';

export function getUploadResourceType(file: File): UploadResourceType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'raw';
}
