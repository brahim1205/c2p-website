import {
  Body,
  Controller,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { AuthService } from '../auth/auth.service.js';
import { CommunicationsService } from './communications.service.js';
import { EmailService } from './email.service.js';
import { SmsService } from './sms.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  dispatchCampaignSchema,
  emailTestSchema,
  smsTestSchema,
  type DispatchCampaignDto,
  type EmailTestDto,
  type SmsTestDto,
} from './dto/communications.dto.js';

@Controller('communications')
export class CommunicationsController {
  constructor(
    private readonly authService: AuthService,
    private readonly communicationsService: CommunicationsService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  @Get('sms/status')
  async getSmsStatus(@Req() request: AuthenticatedRequest) {
    this.authService.requireRole(request, ['admin']);
    return this.smsService.getStatus();
  }

  @Get('email/status')
  async getEmailStatus(@Req() request: AuthenticatedRequest) {
    this.authService.requireRole(request, ['admin']);
    return this.emailService.getStatus();
  }

  @Post('sms/test')
  async sendTestSms(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(smsTestSchema)) payload: SmsTestDto,
  ) {
    const actor = this.authService.requireRole(request, ['admin']);
    const result = await this.smsService.send({
      phone: payload.phone,
      message: payload.message,
      purpose: 'admin-test',
      userId: actor.id,
    });

    return {
      ok: result.accepted,
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
    };
  }

  @Post('email/test')
  async sendTestEmail(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(emailTestSchema)) payload: EmailTestDto,
  ) {
    const actor = this.authService.requireRole(request, ['admin']);
    const result = await this.emailService.send({
      to: payload.email,
      subject: payload.subject,
      text: payload.message,
      purpose: 'admin-test',
      userId: actor.id,
    });

    return {
      ok: result.accepted,
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
    };
  }

  @Post('campaigns/dispatch')
  async dispatchCampaign(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(dispatchCampaignSchema)) payload: DispatchCampaignDto,
  ) {
    const actor = this.authService.requireRole(request, ['admin']);
    return this.communicationsService.dispatchCampaign(actor, payload);
  }
}
