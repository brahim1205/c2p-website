import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { MessagingService } from './messaging.service.js';

@ApiTags('messaging')
@Controller('messaging')
@UseGuards(PermissionGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  @RequirePermission('data.messaging.read')
  listConversations(
    @Req() request: AuthenticatedRequest,
    @Query('summaryOnly') summaryOnly?: string,
  ) {
    return this.messagingService.listConversations(request.auth!.user, summaryOnly === 'true');
  }

  @Post('conversations')
  @RequirePermission('data.messaging.write')
  createConversation(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    return this.messagingService.createConversation(request.auth!.user, payload);
  }

  @Get('conversations/:conversationId/messages')
  @RequirePermission('data.messaging.read')
  listMessages(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.listMessages(request.auth!.user, conversationId);
  }

  @Post('conversations/:conversationId/messages')
  @RequirePermission('data.messaging.write')
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() payload: unknown,
  ) {
    return this.messagingService.sendMessage(request.auth!.user, conversationId, payload);
  }

  @Patch('conversations/:conversationId/read')
  @RequirePermission('data.messaging.write')
  markConversationRead(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.markConversationRead(request.auth!.user, conversationId);
  }
}
