import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  private assertCloudinaryConfigured() {
    if (!this.config.cloudinaryCloudName || !this.config.cloudinaryApiKey || !this.config.cloudinaryApiSecret) {
      throw new ServiceUnavailableException('Configuration Cloudinary incomplete.');
    }
  }

  createCloudinarySignature(payload: { folder?: string; publicId?: string; resourceType?: 'image' | 'video' | 'raw' }) {
    this.assertCloudinaryConfigured();

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = (payload.folder || this.config.cloudinaryUploadFolder || 'c2p').trim().replace(/^\/+|\/+$/g, '');
    const publicId = payload.publicId?.trim();
    const resourceType = payload.resourceType || 'image';

    if (!folder) {
      throw new BadRequestException('Dossier Cloudinary invalide.');
    }

    const signaturePayload = [
      `folder=${folder}`,
      ...(publicId ? [`public_id=${publicId}`] : []),
      `timestamp=${timestamp}`,
    ].join('&');

    const signature = createHash('sha1')
      .update(`${signaturePayload}${this.config.cloudinaryApiSecret!}`)
      .digest('hex');

    return {
      cloudName: this.config.cloudinaryCloudName,
      apiKey: this.config.cloudinaryApiKey,
      timestamp,
      folder,
      publicId,
      resourceType,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.config.cloudinaryCloudName}/${resourceType}/upload`,
    };
  }
}
