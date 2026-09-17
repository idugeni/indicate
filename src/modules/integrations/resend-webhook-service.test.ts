import { describe, expect, it, vi } from 'vitest';

import { ResendWebhookService } from '@/modules/integrations/resend-webhook-service';
import type { WebhookReplayClaim } from '@/modules/integrations/models';

const NOW = new Date('2026-09-17T16:30:00.000Z');
const clock = { now: () => new Date(NOW) };
const timestamp = String(Math.floor(NOW.getTime() / 1_000));

function claim(): WebhookReplayClaim {
  return {
    source: 'resend', replayId: 'msg-1', organizationId: null, bodyDigest: 'abc', identityBindingDigest: null,
    claimToken: 'token-1', businessReceipt: null, status: 'claimed', pendingStatus: null, outcome: null,
    receivedAt: NOW.toISOString(), leaseExpiresAt: NOW.toISOString(), attemptCount: 1, expiresAt: NOW.toISOString(),
  };
}

const headers = { 'svix-id': 'msg-1', 'svix-timestamp': timestamp, 'svix-signature': 'v1,abc' };
const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'email-1' } });

describe('ResendWebhookService', () => {
  it('accepts a verified delivery event', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'created' as const, claim: claim() })) };
    const service = new ResendWebhookService(repository, () => ({ type: 'email.delivered' }), clock);
    const result = await service.process(body, headers, 'request-1');
    expect(result).toEqual({ ok: true, value: { received: true, type: 'email.delivered', deduped: false } });
    expect(repository.claimReplay).toHaveBeenCalledWith(expect.objectContaining({ source: 'resend', replayId: 'msg-1' }));
  });

  it('dedupes redeliveries without error', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'duplicate' as const, claim: claim() })) };
    const service = new ResendWebhookService(repository, () => ({ type: 'email.bounced' }), clock);
    const result = await service.process(body, headers, 'request-1');
    expect(result).toEqual({ ok: true, value: { received: true, type: 'email.bounced', deduped: true } });
  });

  it('denies forged signatures without disclosure', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'created' as const, claim: claim() })) };
    const service = new ResendWebhookService(repository, () => {
      throw new Error('invalid signature');
    }, clock);
    const result = await service.process(body, headers, 'request-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.claimReplay).not.toHaveBeenCalled();
  });

  it('denies missing headers and stale timestamps', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'created' as const, claim: claim() })) };
    const service = new ResendWebhookService(repository, () => ({ type: 'email.delivered' }), clock);
    const missing = await service.process(body, {}, 'request-1');
    expect(missing.ok).toBe(false);
    const stale = await service.process(body, { ...headers, 'svix-timestamp': '1000000000' }, 'request-1');
    expect(stale.ok).toBe(false);
    expect(repository.claimReplay).not.toHaveBeenCalled();
  });
});
