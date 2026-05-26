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

  private readonly uploadsTotal = new Counter({
    name: 'c2p_uploads_total',
    help: 'Nombre total d uploads acceptes ou refuses',
    labelNames: ['resource_type', 'status', 'reason'] as const,
    registers: [this.registry],
  });

  private readonly uploadBytesTotal = new Counter({
    name: 'c2p_upload_bytes_total',
    help: 'Volume total des fichiers acceptes',
    labelNames: ['resource_type'] as const,
    registers: [this.registry],
  });

  private readonly rateLimitBlockedTotal = new Counter({
    name: 'c2p_rate_limit_blocked_total',
    help: 'Nombre de requetes bloquees par rate limiting',
    labelNames: ['scope', 'route'] as const,
    registers: [this.registry],
  });

  private readonly legacyDataApiRequestsTotal = new Counter({
    name: 'c2p_legacy_data_api_requests_total',
    help: 'Nombre de requetes vers l API legacy /data',
    labelNames: ['operation', 'table', 'mode', 'status'] as const,
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

  recordUploadAccepted(resourceType: string, bytes: number) {
    const normalizedResourceType = resourceType || 'unknown';
    this.uploadsTotal.inc({
      resource_type: normalizedResourceType,
      status: 'accepted',
      reason: 'ok',
    });
    if (Number.isFinite(bytes) && bytes > 0) {
      this.uploadBytesTotal.inc({ resource_type: normalizedResourceType }, bytes);
    }
  }

  recordUploadRejected(resourceType: string, reason: string) {
    this.uploadsTotal.inc({
      resource_type: resourceType || 'unknown',
      status: 'rejected',
      reason: reason || 'unknown',
    });
  }

  recordRateLimitBlocked(scope: string, route: string) {
    this.rateLimitBlockedTotal.inc({
      scope: scope || 'unknown',
      route: route || 'unknown',
    });
  }

  recordLegacyDataApiRequest(operation: string, table: string, mode: string, status: 'allowed' | 'blocked') {
    this.legacyDataApiRequestsTotal.inc({
      operation: operation || 'unknown',
      table: this.normalizeMetricLabel(table),
      mode: mode || 'unknown',
      status,
    });
  }

  async getMetrics() {
    return this.registry.metrics();
  }

  private normalizeMetricLabel(value: string) {
    const normalized = String(value || 'unknown')
      .replace(/[^a-zA-Z0-9_:-]/g, '_')
      .slice(0, 80);

    return normalized || 'unknown';
  }
}
