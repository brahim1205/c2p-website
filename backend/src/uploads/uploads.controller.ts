import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { UploadsService } from './uploads.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('cloudinary/sign')
  signCloudinaryUpload(
    @Req() request: AuthenticatedRequest,
    @Body() payload: { folder?: string; publicId?: string; resourceType?: 'image' | 'video' | 'raw' },
  ) {
    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentification requise.');
    }

    return this.uploadsService.createCloudinarySignature(payload);
  }
}
