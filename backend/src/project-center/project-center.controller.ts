import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { OwnerProjectCommandsService } from './owner-project-commands.service.js';
import { ProjectCenterService } from './project-center.service.js';

@ApiTags('project-center')
@Controller('project-center')
export class ProjectCenterController {
  constructor(
    private readonly projectCenterService: ProjectCenterService,
    private readonly ownerProjectCommandsService: OwnerProjectCommandsService,
  ) {}

  @Get('projects')
  listProjects(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectCenterService.listPublicProjects({
      category,
      status,
      search,
      sort,
      limit,
    });
  }

  @Get('projects/:id')
  getProject(@Param('id') id: string) {
    return this.projectCenterService.getPublicProjectDetail(id);
  }

  @Get('owner/projects')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  listOwnerProjects(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.listOwnerProjects(request.auth?.user ?? null);
  }

  @Get('owner/snapshot')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  getOwnerSnapshot(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.getOwnerSnapshot(request.auth?.user ?? null);
  }

  @Get('owner/projects/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  getOwnerProject(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectCenterService.getOwnerProjectDetail(id, request.auth?.user ?? null);
  }

  @Patch('owner/projects/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.write')
  updateOwnerProject(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() payload: unknown) {
    return this.projectCenterService.updateOwnerProject(id, payload, request.auth?.user ?? null);
  }

  @Delete('owner/projects/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.write')
  deleteOwnerProject(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.ownerProjectCommandsService.deleteOwnerProject(id, request.auth?.user ?? null);
  }

  @Get('owner/funding-rounds')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  listOwnerFundingRounds(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.listOwnerFundingRounds(request.auth?.user ?? null);
  }

  @Get('owner/funding-rounds/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  getOwnerFundingRound(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectCenterService.getOwnerFundingRoundDetail(id, request.auth?.user ?? null);
  }

  @Post('owner/funding-rounds')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.write')
  createOwnerFundingRound(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.projectCenterService.createOwnerFundingRound(payload, request.auth?.user ?? null);
  }

  @Get('owner/partnerships')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  listOwnerPartnerships(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.listOwnerPartnerships(request.auth?.user ?? null);
  }

  @Get('partner/tracked-projects')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  listPartnerTrackedProjects(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.listPartnerTrackedProjects(request.auth?.user ?? null);
  }

  @Get('admin/dashboard-summary')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  getAdminDashboardSummary(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.getAdminDashboardSummary(request.auth?.user ?? null);
  }

  @Get('partner/snapshot')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  getPartnerSnapshot(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.getPartnerSnapshot(request.auth?.user ?? null);
  }

  @Get('partner/tracked-projects/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  getPartnerTrackedProject(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectCenterService.getPartnerTrackedProjectDetail(id, request.auth?.user ?? null);
  }

  @Get('partner/collaborations')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  listPartnerCollaborations(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.listPartnerCollaborations(request.auth?.user ?? null);
  }

  @Patch('partner/collaborations/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.write')
  updatePartnerCollaboration(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() payload: unknown) {
    return this.projectCenterService.updatePartnerCollaboration(id, payload, request.auth?.user ?? null);
  }

  @Post('partner/support-conversations')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.messaging.write')
  openPartnerSupportConversation(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.projectCenterService.openPartnerSupportConversation(payload, request.auth?.user ?? null);
  }

  @Get('partner/open-projects')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.read')
  listPartnerOpenProjects(@Req() request: AuthenticatedRequest) {
    return this.projectCenterService.listPartnerOpenProjects(request.auth?.user ?? null);
  }

  @Post('partner/interests')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.write')
  expressPartnerInterest(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.projectCenterService.expressPartnerInterest(payload, request.auth?.user ?? null);
  }

  @Post('submissions')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.projects.write')
  submitProject(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.projectCenterService.submitProject(payload, request.auth?.user ?? null);
  }
}
