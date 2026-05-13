import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import { FinanceReadService } from '../payments/finance-read.service.js';
import { PublicIntakeService } from './public-intake.service.js';

@Controller()
export class PublicController {
  constructor(
    private readonly publicIntakeService: PublicIntakeService,
    private readonly financeReadService: FinanceReadService,
  ) {}

  @Get('healthz')
  healthz() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('public/contact')
  submitContact(
    @Body()
    payload: {
      firstName?: string;
      lastName?: string;
      email?: string;
      subject?: string;
      message?: string;
    },
  ) {
    return this.publicIntakeService.submitContact(payload);
  }

  @Post('public/newsletter')
  subscribeNewsletter(@Body() payload: { email?: string; source?: string }) {
    return this.publicIntakeService.subscribeNewsletter(payload);
  }

  @Get('public/subscription-plans')
  listSubscriptionPlans(@Query('role') role?: string) {
    return this.financeReadService.getSubscriptionPlans(role);
  }

  @Get('public/contact-submissions')
  @UseGuards(PermissionGuard)
  @RequirePermission('support.manage')
  listContactSubmissions(@Req() _request: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.publicIntakeService.listContactSubmissions(limit);
  }

  @Patch('public/contact-submissions/:id/handled')
  @UseGuards(PermissionGuard)
  @RequirePermission('support.manage')
  markContactSubmissionHandled(@Req() _request: AuthenticatedRequest, @Param('id') id: string) {
    return this.publicIntakeService.markContactSubmissionHandled(id);
  }
}
