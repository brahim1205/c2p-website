import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MonitoringService {
  private readonly registry = new Registry();

  private readonly httpRequestDuration = new Histogram({
    name: 'c2p_http_request_duration_ms',
    help: 'Duree des requetes HTTP en millisecondes',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [this.registry],
  });

  private readonly httpRequestsTotal = new Counter({
    name: 'c2p_http_requests_total',
    help: 'Nombre total de requetes HTTP',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  private readonly frontendErrorsTotal = new Counter({
    name: 'c2p_frontend_errors_total',
    help: 'Nombre d erreurs frontend remontees',
    labelNames: ['type'] as const,
    registers: [this.registry],
  });

  private readonly frontendVitals = new Gauge({
    name: 'c2p_frontend_web_vital',
    help: 'Derniere valeur connue des Core Web Vitals',
    labelNames: ['metric_name', 'route'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'c2p_node_' });
  }

  observeHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
    const labels = {
      method,
      route: route || 'unknown',
      status_code: String(statusCode),
    };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs);
  }

  recordFrontendError(type: string) {
    this.frontendErrorsTotal.inc({ type });
  }

  recordWebVital(metricName: string, route: string, value: number) {
    this.frontendVitals.set({ metric_name: metricName, route }, value);
  }

  async getMetrics() {
    return this.registry.metrics();
  }
}
