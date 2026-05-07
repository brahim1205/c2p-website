import { Body, Controller, Get, Header, Post, Req } from '@nestjs/common';
import { MonitoringService } from './monitoring.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';

@Controller()
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics() {
    return this.monitoringService.getMetrics();
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
