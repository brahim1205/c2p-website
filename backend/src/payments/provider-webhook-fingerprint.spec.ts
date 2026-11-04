import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createProviderWebhookFingerprint, createProviderWebhookReceiptId } from './provider-webhook-fingerprint.js';
import { normalizeSmsRecipientPhone, normalizeUserPhoneForStorage } from '../communications/phone-normalization.js';

const base = {
  provider: 'dexpay',
  providerEventId: 'evt-1',
  providerReference: 'DX-1',
  providerStatus: 'SUCCESS',
  eventType: 'payment.updated',
};

describe('createProviderWebhookFingerprint', () => {
  it('ignores key order so that a replayed webhook is recognised', () => {
    const first = createProviderWebhookFingerprint({ ...base, payload: { amount: 1000, meta: { a: 1, b: 2 } } });
    const second = createProviderWebhookFingerprint({ ...base, payload: { meta: { b: 2, a: 1 }, amount: 1000 } });
    assert.equal(first, second);
  });

  it('changes when the payload is tampered with', () => {
    const original = createProviderWebhookFingerprint({ ...base, payload: { amount: 1000 } });
    assert.notEqual(original, createProviderWebhookFingerprint({ ...base, payload: { amount: 100000 } }));
    assert.notEqual(original, createProviderWebhookFingerprint({ ...base, providerStatus: 'FAILED', payload: { amount: 1000 } }));
  });

  it('keeps array order significant', () => {
    assert.notEqual(
      createProviderWebhookFingerprint({ ...base, payload: [1, 2] }),
      createProviderWebhookFingerprint({ ...base, payload: [2, 1] }),
    );
  });

  it('derives a stable receipt id per provider and idempotency key', () => {
    const id = createProviderWebhookReceiptId('dexpay', 'evt-1');
    assert.equal(id, createProviderWebhookReceiptId('dexpay', 'evt-1'));
    assert.notEqual(id, createProviderWebhookReceiptId('dexpay', 'evt-2'));
    assert.match(id, /^whr-dexpay-[0-9a-f]{32}$/);
  });
});

describe('phone normalization (Senegal)', () => {
  it('normalize the usual local and international formats', () => {
    for (const input of ['+221 77 123 45 67', '00221771234567', '221771234567', '771234567', '77-123-45-67']) {
      assert.equal(normalizeSmsRecipientPhone(input), '221771234567', input);
    }
    assert.equal(normalizeSmsRecipientPhone('0771234567'), '221771234567');
  });

  it('reject empty or malformed numbers', () => {
    for (const input of [null, undefined, '', 'abc', '12345', '+33 6 12 34 56 78']) {
      assert.equal(normalizeSmsRecipientPhone(input), null, String(input));
    }
  });

  it('store numbers in E.164', () => {
    assert.equal(normalizeUserPhoneForStorage('77 123 45 67'), '+221771234567');
    assert.equal(normalizeUserPhoneForStorage('nope'), undefined);
  });
});
