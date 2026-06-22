import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { ProjectFundingService } from './project-funding.service.js';

@ApiTags('project-center-funding')
@Controller('project-center')
@UseGuards(PermissionGuard)
export class ProjectFundingController {
  constructor(private readonly projectFundingService: ProjectFundingService) {}

  @Get('partner/opportunities')
  @RequirePermission('data.projects.read')
  listOpportunities(@Req() request: AuthenticatedRequest) {
    return this.projectFundingService.listPartnerOpportunities(request.auth?.user ?? null);
  }

  @Get('partner/funding/commitments')
  @RequirePermission('data.projects.read')
  listCommitments(@Req() request: AuthenticatedRequest) {
    return this.projectFundingService.listCommitments(request.auth?.user ?? null);
  }

  @Get('owner/funding/commitments')
  @RequirePermission('data.projects.read')
  listOwnerCommitments(@Req() request: AuthenticatedRequest) {
    return this.projectFundingService.listOwnerCommitments(request.auth?.user ?? null);
  }

  @Get('admin/funding/commitments')
  @RequirePermission('data.projects.read')
  listAdminCommitments(@Req() request: AuthenticatedRequest) {
    return this.projectFundingService.listAdminCommitments(request.auth?.user ?? null);
  }

  @Post('partner/funding/simulate')
  @RequirePermission('data.projects.read')
  simulate(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.projectFundingService.simulate(payload, request.auth?.user ?? null);
  }

  @Post('partner/funding/commitments')
  @RequirePermission('data.projects.write')
  createCommitment(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.projectFundingService.createCommitment(payload, request.auth?.user ?? null);
  }

  @Post('partner/projects/:id/actions')
  @RequirePermission('data.projects.write')
  recordAction(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() payload: unknown) {
    return this.projectFundingService.recordPartnerAction(id, payload, request.auth?.user ?? null);
  }

  @Post('admin/opportunity-flags')
  @RequirePermission('data.projects.write')
  flagOpportunity(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.projectFundingService.flagOpportunity(payload, request.auth?.user ?? null);
  }

  @Patch('admin/funding/commitments/:id/review')
  @RequirePermission('data.projects.write')
  reviewCommitment(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() payload: unknown) {
    return this.projectFundingService.reviewCommitment(id, payload, request.auth?.user ?? null);
  }

  @Patch('admin/funding/commitments/:id/activate')
  @RequirePermission('data.projects.write')
  activateCommitment(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() payload: unknown) {
    return this.projectFundingService.activateCommitment(id, payload, request.auth?.user ?? null);
  }

  @Patch('admin/funding/commitments/:id/installments/:period/paid')
  @RequirePermission('data.projects.write')
  markInstallmentPaid(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('period') period: string) {
    return this.projectFundingService.markInstallmentPaid(id, period, request.auth?.user ?? null);
  }
}
