import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { FormateurEngagementService } from './formateur-engagement.service.js';

@ApiTags('learning')
@Controller('learning')
export class FormateurEngagementController {
  constructor(private readonly formateurEngagementService: FormateurEngagementService) {}

  @Get('formateur/reviews')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurReviews(@Req() request: AuthenticatedRequest) {
    return this.formateurEngagementService.getReviews(request.auth?.user ?? null);
  }

  @Patch('formateur/reviews/:reviewId/response')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  respondToFormateurReview(
    @Req() request: AuthenticatedRequest,
    @Param('reviewId') reviewId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurEngagementService.respondToReview(reviewId, payload, request.auth?.user ?? null);
  }

  @Get('formateur/announcements')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurAnnouncements(@Req() request: AuthenticatedRequest) {
    return this.formateurEngagementService.getAnnouncements(request.auth?.user ?? null);
  }

  @Post('formateur/courses/:courseId/announcements')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurAnnouncement(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurEngagementService.createAnnouncement(courseId, payload, request.auth?.user ?? null);
  }
}
