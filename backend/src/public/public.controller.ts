import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { PublicIntakeService } from './public-intake.service.js';

@Controller()
export class PublicController {
  constructor(
    private readonly publicIntakeService: PublicIntakeService,
    private readonly authService: AuthService,
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

  @Get('public/contact-submissions')
  listContactSubmissions(@Req() request: AuthenticatedRequest) {
    this.authService.requireRole(request, ['admin']);
    return this.publicIntakeService.listContactSubmissions();
  }

  @Patch('public/contact-submissions/:id/handled')
  markContactSubmissionHandled(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.authService.requireRole(request, ['admin']);
    return this.publicIntakeService.markContactSubmissionHandled(id);
  }
}
