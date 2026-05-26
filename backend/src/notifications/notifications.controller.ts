import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(PermissionGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @RequirePermission('data.notifications.read')
  listMine(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.listMine(request.auth!.user, Number(limit));
  }

  @Post()
  @RequirePermission('data.notifications.write')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    return this.notificationsService.create(request.auth!.user, payload);
  }

  @Patch(':id/read')
  @RequirePermission('data.notifications.write')
  markAsRead(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(request.auth!.user, id);
  }

  @Patch('read-all')
  @RequirePermission('data.notifications.write')
  markAllAsRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(request.auth!.user);
  }

  @Delete(':id')
  @RequirePermission('data.notifications.write')
  deleteOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteOne(request.auth!.user, id);
  }

  @Delete()
  @RequirePermission('data.notifications.write')
  clearMine(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.clearMine(request.auth!.user);
  }

  @Get('provider-recipients/:providerId')
  @RequirePermission('data.notifications.write')
  getProviderRecipient(
    @Req() request: AuthenticatedRequest,
    @Param('providerId') providerId: string,
  ) {
    return this.notificationsService.getProviderRecipient(request.auth!.user, providerId);
  }
}
