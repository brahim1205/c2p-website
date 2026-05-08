import { Body, Controller, Get, Post } from '@nestjs/common';
import { PublicIntakeService } from './public-intake.service.js';

@Controller()
export class PublicController {
  constructor(private readonly publicIntakeService: PublicIntakeService) {}

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
}
