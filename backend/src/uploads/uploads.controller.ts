import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { UploadsService, type StoredUploadFile, type UploadResourceType } from './uploads.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';

const TEMP_UPLOAD_ROOT = resolve(process.cwd(), process.env.UPLOAD_TMP_ROOT || 'storage/uploads/_tmp');
const MAX_REQUEST_BYTES = Number(process.env.UPLOAD_REQUEST_MAX_MB || '5120') * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('strategy')
  async getUploadStrategy(@Req() request: AuthenticatedRequest) {
    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentification requise.');
    }
    return this.uploadsService.getStrategy();
  }

  @Post('local')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_request: any, _file: any, callback: any) => {
        mkdirSync(TEMP_UPLOAD_ROOT, { recursive: true });
        callback(null, TEMP_UPLOAD_ROOT);
      },
      filename: (_request: any, file: any, callback: any) => {
        const extension = extname(file.originalname ?? '').replace(/[^.a-z0-9]/gi, '');
        callback(null, `${Date.now()}-${randomUUID()}${extension}`);
      },
    }),
    limits: { fileSize: MAX_REQUEST_BYTES },
  }))
  async uploadLocalFile(
    @Req() request: AuthenticatedRequest,
    @Body() payload: { folder?: string; filename?: string; resourceType?: UploadResourceType },
  ) {
    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentification requise.');
    }

    const file = (request as AuthenticatedRequest & { file?: StoredUploadFile }).file;
    if (!file) {
      throw new BadRequestException('Aucun fichier recu.');
    }

    const stored = await this.uploadsService.storeFile(file, payload);
    const protocol = String(request.headers['x-forwarded-proto'] ?? request.protocol ?? 'http');
    const host = String(request.headers.host ?? '');
    const absoluteUrl = host ? `${protocol}://${host}${stored.relativePath}` : stored.relativePath;

    return {
      ...stored,
      url: absoluteUrl,
    };
  }
}
