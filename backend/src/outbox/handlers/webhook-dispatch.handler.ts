import { Injectable } from '@nestjs/common';
import { OutboxDeliveryLogService } from '../outbox-delivery-log.service.js';
import type { OutboxEventDescriptor, OutboxEventHandler } from '../outbox.types.js';

@Injectable()
export class WebhookDispatchOutboxHandler implements OutboxEventHandler {
  constructor(private readonly deliveryLogService: OutboxDeliveryLogService) {}

  supports(event: OutboxEventDescriptor) {
    return event.eventType === 'webhook.dispatch' && event.eventVersion === 1;
  }

  async handle(event: OutboxEventDescriptor) {
    const url = String(event.payload.url ?? '').trim();
    if (!url) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url, {
        method: String(event.payload.method ?? 'POST'),
        signal: controller.signal,
        headers: typeof event.payload.headers === 'object' && event.payload.headers !== null
          ? event.payload.headers as Record<string, string>
          : { 'content-type': 'application/json' },
        body: event.payload.body !== undefined ? JSON.stringify(event.payload.body) : undefined,
      });

      const responseBody = await response.text();
      if (!response.ok) {
        await this.deliveryLogService.recordWebhookDispatch({
          outboxEventId: event.id,
          eventType: event.eventType,
          targetUrl: url,
          method: String(event.payload.method ?? 'POST'),
          status: 'failed',
          responseStatus: response.status,
          responseBody,
          error: `Webhook dispatch failed with status ${response.status}`,
          attemptCount: event.attemptCount + 1,
          correlationId: event.correlationId ?? null,
          metadata: event.metadata ?? {},
        });
        throw new Error(`Webhook dispatch failed with status ${response.status}`);
      }
      await this.deliveryLogService.recordWebhookDispatch({
        outboxEventId: event.id,
        eventType: event.eventType,
        targetUrl: url,
        method: String(event.payload.method ?? 'POST'),
        status: 'delivered',
        responseStatus: response.status,
        responseBody,
        attemptCount: event.attemptCount + 1,
        correlationId: event.correlationId ?? null,
        metadata: event.metadata ?? {},
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Webhook dispatch failed with status')) {
        await this.deliveryLogService.recordWebhookDispatch({
          outboxEventId: event.id,
          eventType: event.eventType,
          targetUrl: url,
          method: String(event.payload.method ?? 'POST'),
          status: 'failed',
          error: String(error),
          attemptCount: event.attemptCount + 1,
          correlationId: event.correlationId ?? null,
          metadata: event.metadata ?? {},
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
