import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { CommunicationsService } from './communications.service.js';
import { EmailService } from './email.service.js';
import { buildOutboxEvent } from '../outbox/outbox-contract.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { SmsService } from './sms.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import {
  dispatchCampaignSchema,
  emailTestSchema,
  smsTestSchema,
  type DispatchCampaignDto,
  type EmailTestDto,
  type SmsTestDto,
} from './dto/communications.dto.js';

@Controller('communications')
@UseGuards(PermissionGuard)
@RequirePermission('communications.manage')
export class CommunicationsController {
  constructor(
    private readonly communicationsService: CommunicationsService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly outboxService: OutboxService,
  ) {}

  @Get('sms/status')
  async getSmsStatus(@Req() _request: AuthenticatedRequest) {
    return this.smsService.getStatus();
  }

  @Get('email/status')
  async getEmailStatus(@Req() _request: AuthenticatedRequest) {
    return this.emailService.getStatus();
  }

  @Post('sms/test')
  async sendTestSms(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(smsTestSchema)) payload: SmsTestDto,
  ) {
    const actor = request.auth!.user;
    const event = await this.outboxService.enqueue(buildOutboxEvent({
      eventType: 'communications.sms.send',
      aggregateId: actor.id,
      actorId: actor.id,
      payload: {
        recipients: [{ userId: actor.id, phone: payload.phone }],
        message: payload.message,
        purpose: 'admin-test',
      },
      metadata: { channel: 'sms-test' },
    }));

    return {
      ok: true,
      queued: true,
      provider: this.smsService.getStatus().provider,
      providerMessageId: null,
      outboxEventId: event.id,
    };
  }

  @Post('email/test')
  async sendTestEmail(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(emailTestSchema)) payload: EmailTestDto,
  ) {
    const actor = request.auth!.user;
    const event = await this.outboxService.enqueue(buildOutboxEvent({
      eventType: 'communications.email.send',
      aggregateId: actor.id,
      actorId: actor.id,
      payload: {
        recipients: [{ userId: actor.id, email: payload.email }],
        subject: payload.subject,
        message: payload.message,
        purpose: 'admin-test',
      },
      metadata: { channel: 'email-test' },
    }));

    return {
      ok: true,
      queued: true,
      provider: this.emailService.getStatus().provider,
      providerMessageId: null,
      outboxEventId: event.id,
    };
  }

  @Post('campaigns/dispatch')
  async dispatchCampaign(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(dispatchCampaignSchema)) payload: DispatchCampaignDto,
  ) {
    const actor = request.auth!.user;
    return this.communicationsService.dispatchCampaign(actor, payload);
  }
}
