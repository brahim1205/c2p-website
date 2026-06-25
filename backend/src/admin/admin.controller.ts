import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { AdminService } from './admin.service.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(PermissionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('resources/:resource')
  @RequirePermission('data.admin.read')
  listResource(@Param('resource') resource: string) {
    return this.adminService.listResource(resource);
  }

  @Post('resources/:resource')
  @RequirePermission('data.admin.write')
  createResource(
    @Req() request: AuthenticatedRequest,
    @Param('resource') resource: string,
    @Body() payload: unknown,
  ) {
    return this.adminService.createResource(resource, payload, request.auth?.user?.id ?? null);
  }

  @Patch('resources/:resource/:id')
  @RequirePermission('data.admin.write')
  updateResource(
    @Req() request: AuthenticatedRequest,
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() payload: unknown,
  ) {
    return this.adminService.updateResource(resource, id, payload, request.auth?.user ?? null);
  }

  @Delete('resources/:resource/:id')
  @RequirePermission('data.admin.write')
  deleteResource(
    @Req() request: AuthenticatedRequest,
    @Param('resource') resource: string,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteResource(resource, id, request.auth?.user?.id ?? null);
  }

  @Get('dashboard-data')
  @RequirePermission('data.admin.read')
  getDashboardData() {
    return this.adminService.getDashboardData();
  }

  @Patch('bookings/:bookingId/assign')
  @RequirePermission('data.admin.write')
  assignBookingProvider(
    @Req() request: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() payload: unknown,
  ) {
    return this.adminService.assignBookingProvider(bookingId, payload, request.auth?.user ?? null);
  }

  @Get('analytics-data')
  @RequirePermission('data.admin.read')
  getAnalyticsData() {
    return this.adminService.getAnalyticsData();
  }
}
