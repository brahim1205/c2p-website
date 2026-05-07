import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { AuthService } from '../auth/auth.service.js';
import { SmsService } from './sms.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  dispatchCampaignSchema,
  smsTestSchema,
  type DispatchCampaignDto,
  type SmsTestDto,
} from './dto/communications.dto.js';

@Controller('communications')
export class CommunicationsController {
  constructor(
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
  ) {}

  @Get('sms/status')
  async getSmsStatus(@Req() request: AuthenticatedRequest) {
    this.authService.requireRole(request, ['admin']);
    return this.smsService.getStatus();
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

  @Post('campaigns/dispatch')
  async dispatchCampaign(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(dispatchCampaignSchema)) payload: DispatchCampaignDto,
  ) {
    this.authService.requireRole(request, ['admin']);
    if (!['sms', 'all'].includes(payload.type)) {
      return { dispatched: 0, skipped: true };
    }

    const users = await this.authService.getUsers(request);
    const recipients = this.resolveRecipients(payload.target, users)
      .filter((user) => Boolean(user.phone))
      .map((user) => ({ userId: user.id, phone: user.phone }));

    const results = await this.smsService.sendBulk(
      recipients,
      payload.content,
      `campaign:${payload.title}`,
    );

    return {
      dispatched: results.filter((entry) => entry.ok).length,
      failed: results.filter((entry) => !entry.ok).length,
      recipients: recipients.length,
    };
  }

  private resolveRecipients(
    target: string,
    users: Awaited<ReturnType<AuthService['getUsers']>>,
  ) {
    const normalized = target.trim().toLowerCase();
    if (normalized.includes('apprenant')) {
      return users.filter((user) => user.role === 'apprenant');
    }
    if (normalized.includes('client')) {
      return users.filter((user) => user.role === 'client');
    }
    if (normalized.includes('porteur')) {
      return users.filter((user) => user.role === 'porteur');
    }
    if (normalized.includes('prestataire')) {
      return users.filter((user) => user.role === 'prestataire');
    }
    if (normalized.includes('partenaire')) {
      return users.filter((user) => user.role === 'partenaire');
    }
    if (normalized.includes('formateur')) {
      return users.filter((user) => user.role === 'formateur');
    }
    return users;
  }
}
