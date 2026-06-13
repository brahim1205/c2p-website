import { Body, Controller, Get, Header, NotFoundException, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import { AlertmanagerNotificationService } from './alertmanager-notification.service.js';
import { MonitoringService } from './monitoring.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { ConfigService } from '../config/config.service.js';

@ApiTags('monitoring')
@Controller()
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly configService: ConfigService,
    private readonly alertmanagerNotificationService: AlertmanagerNotificationService,
  ) {}

  private hasValidMetricsToken(request: AuthenticatedRequest) {
    const expected = this.configService.metricsAuthToken.trim();
    const rawAuthorization = String(request.headers.authorization ?? '').trim();
    const bearerToken = rawAuthorization.toLowerCase().startsWith('bearer ')
      ? rawAuthorization.slice(7).trim()
      : '';
    const headerToken = String(request.headers['x-metrics-token'] ?? '').trim();
    const provided = bearerToken || headerToken;

    if (!expected || !provided) {
      return false;
    }

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(@Req() request: AuthenticatedRequest) {
    if (!this.configService.metricsEnabled) {
      throw new NotFoundException();
    }
    if (!this.hasValidMetricsToken(request)) {
      throw new UnauthorizedException('Acces refuse.');
    }
    return this.monitoringService.getMetrics();
  }

  @Post('monitoring/alertmanager')
  async alertmanager(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    if (!this.hasValidMetricsToken(request)) {
      throw new UnauthorizedException('Acces refuse.');
    }
    await this.alertmanagerNotificationService.notify(payload);
    return { success: true };
  }

  @Post('monitoring/frontend-errors')
  frontendErrors(
    @Req() request: AuthenticatedRequest,
    @Body()
    payload: {
      type?: string;
      message?: string;
      route?: string;
      requestId?: string;
    },
  ) {
    this.monitoringService.recordFrontendError(payload.type || 'unknown');
    return {
      success: true,
      requestId: request.requestId ?? payload.requestId ?? null,
    };
  }

  @Post('monitoring/web-vitals')
  webVitals(
    @Body()
    payload: {
      name?: string;
      value?: number;
      route?: string;
    },
  ) {
    if (payload.name && typeof payload.value === 'number') {
      this.monitoringService.recordWebVital(payload.name, payload.route || '/', payload.value);
    }
    return { success: true };
  }
}
