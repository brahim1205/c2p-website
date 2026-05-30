import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { LearningService } from './learning.service.js';

@ApiTags('learning')
@Controller('learning')
export class LearningParentController {
  constructor(
    private readonly learningService: LearningService,
  ) {}

  @Get('parent/dashboard')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getParentDashboardSnapshot(@Req() request: AuthenticatedRequest) {
    return this.learningService.getParentDashboardSnapshot(request.auth?.user ?? null);
  }
}
