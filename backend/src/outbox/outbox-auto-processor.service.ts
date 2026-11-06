import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { SUPPORTED_NOTIFICATION_EVENTS } from './handlers/notification-dispatch.handler.js';
import { OutboxProcessorService } from './outbox.processor.service.js';

const INTERVAL_MS = 30_000;
/** Only events recorded after (boot time - this window) are auto-processed; older backlog stays manual. */
const BACKLOG_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Delivers in-app notification events (virtual class scheduled / started / replay..., bookings,
 * payouts...) from the outbox inside the API process, every 30 s.
 * Emails, SMS and webhooks are never sent from here: they keep their explicit worker / admin flow.
 * Enabled in production, or with OUTBOX_AUTO_PROCESS=true; OUTBOX_AUTO_PROCESS=false turns it off.
 */
@Injectable()
export class OutboxAutoProcessorService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxAutoProcessorService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private createdAfter = new Date();

  constructor(private readonly processor: OutboxProcessorService) {}

  static isEnabled(env: NodeJS.ProcessEnv = process.env) {
    if (env.OUTBOX_AUTO_PROCESS === 'false') return false;
    return env.OUTBOX_AUTO_PROCESS === 'true' || env.NODE_ENV === 'production';
  }

  onApplicationBootstrap() {
    if (!OutboxAutoProcessorService.isEnabled()) return;
    this.createdAfter = new Date(Date.now() - BACKLOG_WINDOW_MS);
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    this.logger.log('In-app notification outbox auto-processing enabled (every 30 s).');
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (this.running) return null;
    this.running = true;
    try {
      const result = await this.processor.processPendingBatch(50, {
        eventTypes: [...SUPPORTED_NOTIFICATION_EVENTS],
        createdAfter: this.createdAfter,
      });
      if (result.processed || result.failed) this.logger.log(`Outbox: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.warn(`Outbox auto-processing failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      this.running = false;
    }
  }
}
