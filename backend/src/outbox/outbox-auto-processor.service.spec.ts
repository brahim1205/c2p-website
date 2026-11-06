import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OutboxAutoProcessorService } from './outbox-auto-processor.service.js';
import type { OutboxProcessorService } from './outbox.processor.service.js';

describe('OutboxAutoProcessorService', () => {
  it('is on in production, off elsewhere, and can be forced either way', () => {
    assert.equal(OutboxAutoProcessorService.isEnabled({ NODE_ENV: 'production' }), true);
    assert.equal(OutboxAutoProcessorService.isEnabled({ NODE_ENV: 'test' }), false);
    assert.equal(OutboxAutoProcessorService.isEnabled({ NODE_ENV: 'test', OUTBOX_AUTO_PROCESS: 'true' }), true);
    assert.equal(OutboxAutoProcessorService.isEnabled({ NODE_ENV: 'production', OUTBOX_AUTO_PROCESS: 'false' }), false);
  });

  it('only processes recent in-app notification events, never emails, SMS or webhooks', async () => {
    const calls: Array<{ eventTypes?: string[]; createdAfter?: Date }> = [];
    const processor = {
      processPendingBatch: async (_limit: number, filter: { eventTypes?: string[]; createdAfter?: Date }) => {
        calls.push(filter);
        return { claimed: 0, processed: 0, failed: 0, dead: 0 };
      },
    } as unknown as OutboxProcessorService;
    const service = new OutboxAutoProcessorService(processor);
    await service.tick();
    const types = calls[0]?.eventTypes ?? [];
    assert.ok(types.includes('virtual_class.scheduled'));
    assert.ok(!types.some((type) => /email|sms|webhook/.test(type)), `unexpected types: ${types.join(', ')}`);
    assert.ok(calls[0]?.createdAfter instanceof Date);
  });
});
