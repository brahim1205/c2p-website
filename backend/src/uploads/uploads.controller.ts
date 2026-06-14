import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { UploadsService, type StoredUploadFile } from './uploads.service.js';
import type { UploadResourceType } from './upload-policy.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';

const TEMP_UPLOAD_ROOT = resolve(process.cwd(), process.env.UPLOAD_TMP_ROOT || 'storage/uploads/_tmp');
const MAX_REQUEST_BYTES = Number(process.env.UPLOAD_REQUEST_MAX_MB || '5120') * 1024 * 1024;

@ApiTags('uploads')
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

  @Get('public/*path')
  async getPublicFile(
    @Param('path') path: string | string[],
    @Headers('range') range: string | undefined,
    @Res() response: Response,
  ) {
    const publicPath = Array.isArray(path) ? path.join('/') : path;
    const stored = await this.uploadsService.readPublicObject(publicPath, range);
    if (!stored) {
      throw new NotFoundException('Fichier introuvable.');
    }

    response.status(stored.statusCode);
    response.setHeader('Content-Type', stored.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (stored.contentLength !== undefined) response.setHeader('Content-Length', String(stored.contentLength));
    if (stored.contentRange) response.setHeader('Content-Range', stored.contentRange);
    if (stored.acceptRanges) response.setHeader('Accept-Ranges', stored.acceptRanges);
    if (stored.etag) response.setHeader('ETag', stored.etag);
    if (stored.lastModified) response.setHeader('Last-Modified', stored.lastModified);
    await pipeline(stored.body, response);
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

    const stored = await this.uploadsService.storeFile(file, {
      ...payload,
      ownerId: request.auth.user.id,
    });
    const protocol = String(request.headers['x-forwarded-proto'] ?? request.protocol ?? 'http');
    const host = String(request.headers.host ?? '');
    const fallbackOrigin = host ? `${protocol}://${host}` : undefined;

    return {
      ...stored,
      url: this.uploadsService.resolvePublicUrl(stored.relativePath, fallbackOrigin),
    };
  }
}
