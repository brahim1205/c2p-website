const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export type UploadResourceType = 'image' | 'video' | 'raw';

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? null;
}

function toUploadError(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Upload impossible.';
}

export interface UploadedFilePayload {
  uploadId?: string | null;
  url: string;
  relativePath: string;
  folder: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  resourceType: UploadResourceType;
  driver?: 'local-disk' | 's3';
  storageKey?: string;
}

export interface UploadStrategyPayload {
  mode: 'local-disk' | 's3';
  supportsUploadProgress: boolean;
  tempRoot: string;
  storageRoot: string;
  requestMaxBytes: number;
  resourceTypes: Record<UploadResourceType, {
    resourceType: UploadResourceType;
    maxBytes: number;
    label: string;
  }>;
}

async function parseErrorResponse(request: XMLHttpRequest) {
  try {
    const payload = JSON.parse(request.responseText ?? '{}') as { message?: string };
    return payload.message ?? 'Upload impossible.';
  } catch {
    return 'Upload impossible.';
  }
}

export async function fetchUploadStrategy() {
  const response = await fetch(`${API_BASE_URL}/uploads/strategy`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error('Impossible de charger la strategie d upload.');
  }

  return response.json() as Promise<UploadStrategyPayload>;
}

export async function uploadFileToServer(
  file: File,
  options: {
    folder?: string;
    filename?: string;
    resourceType?: UploadResourceType;
    onProgress?: (progress: number) => void;
  } = {},
) {
  const csrfToken = readCookie('c2p_csrf');
  const formData = new FormData();
  formData.append('file', file);
  if (options.folder) formData.append('folder', options.folder);
  if (options.filename) formData.append('filename', options.filename);
  formData.append('resourceType', options.resourceType ?? 'raw');

  return new Promise<UploadedFilePayload>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE_URL}/uploads/local`);
    request.withCredentials = true;
    request.responseType = 'text';
    request.setRequestHeader('Accept', 'application/json');
    request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    if (csrfToken) {
      request.setRequestHeader('X-CSRF-Token', csrfToken);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options.onProgress) return;
      options.onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };

    request.onerror = () => reject(new Error('Upload impossible.'));
    request.onabort = () => reject(new Error('Upload interrompu.'));
    request.onload = async () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(await parseErrorResponse(request)));
        return;
      }

      try {
        const payload = JSON.parse(request.responseText) as UploadedFilePayload;
        options.onProgress?.(100);
        resolve(payload);
      } catch (error) {
        reject(new Error(toUploadError(error)));
      }
    };

    request.send(formData);
  });
}

export async function uploadImageToServer(
  file: File,
  options: { folder?: string; filename?: string; onProgress?: (progress: number) => void } = {},
) {
  return uploadFileToServer(file, { ...options, resourceType: 'image' });
}

export async function uploadVideoToServer(
  file: File,
  options: { folder?: string; filename?: string; onProgress?: (progress: number) => void } = {},
) {
  return uploadFileToServer(file, { ...options, resourceType: 'video' });
}
