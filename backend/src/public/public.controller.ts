import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import { PrismaService } from '../database/prisma.service.js';
import { FinanceReadService } from '../payments/finance-read.service.js';
import { PublicIntakeService } from './public-intake.service.js';
import { store } from '../data/data-app-store.js';

@ApiTags('public')
@Controller()
export class PublicController {
  constructor(
    private readonly publicIntakeService: PublicIntakeService,
    private readonly financeReadService: FinanceReadService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('healthz')
  async healthz() {
    const database = await this.getDatabaseHealth();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database,
    };
  }

  @Get('public/platform-status')
  async getPlatformStatus() {
    return {
      maintenance: await this.isMaintenanceModeEnabled(),
      timestamp: new Date().toISOString(),
    };
  }

  private async isMaintenanceModeEnabled() {
    if (!this.prisma.isConnected) {
      return false;
    }

    try {
      const row = await this.prisma.appRow.findUnique({
        where: { key: 'admin_feature_flags::maintenance_mode' },
        select: { data: true },
      });
      const data = row?.data;
      return Boolean(data && typeof data === 'object' && 'enabled' in data && (data as { enabled?: unknown }).enabled);
    } catch {
      return false;
    }
  }

  private async getDatabaseHealth() {
    if (!this.prisma.isConnected) {
      return {
        connected: false,
        appRows: null,
      };
    }

    try {
      return {
        connected: true,
        appRows: await this.prisma.appRow.count(),
      };
    } catch (error) {
      return {
        connected: false,
        appRows: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
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

  @Get('public/certificates/:id/verify')
  verifyCertificate(@Param('id') id: string) {
    const normalizedId = decodeURIComponent(id).trim();
    const certificate = (store.certificates ?? []).find((row) => (
      String(row.certificate_number ?? row.certificate_id ?? row.id) === normalizedId
    ));

    if (!certificate || certificate.status !== 'issued') {
      return {
        valid: false,
        certificateId: normalizedId,
      };
    }

    return {
      valid: true,
      certificateId: certificate.certificate_number ?? certificate.certificate_id ?? String(certificate.id),
      studentName: certificate.student_name ?? null,
      courseName: certificate.course_name ?? certificate.title ?? null,
      issuedAt: certificate.issued_at ?? null,
      completionDate: certificate.completion_date ?? null,
      issuer: 'C2P Academy',
    };
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
