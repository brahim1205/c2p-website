import { apiRequest } from './api';

interface CloudinarySignaturePayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId?: string;
  resourceType: 'image' | 'video' | 'raw';
  signature: string;
  uploadUrl: string;
}

export async function uploadImageToCloudinary(file: File, options: { folder?: string; publicId?: string } = {}) {
  const signature = await apiRequest<CloudinarySignaturePayload>('/uploads/cloudinary/sign', {
    method: 'POST',
    body: JSON.stringify({
      folder: options.folder,
      publicId: options.publicId,
      resourceType: 'image',
    }),
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);
  if (signature.publicId) {
    formData.append('public_id', signature.publicId);
  }

  const response = await fetch(signature.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload Cloudinary impossible.');
  }

  const payload = await response.json() as { secure_url?: string };
  if (!payload.secure_url) {
    throw new Error('URL Cloudinary manquante.');
  }

  return payload.secure_url;
}
