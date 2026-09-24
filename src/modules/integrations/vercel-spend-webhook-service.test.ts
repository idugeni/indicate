import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { VercelSpendWebhookService } from '@/modules/integrations/vercel-spend-webhook-service';
import type { WebhookReplayClaim } from '@/modules/integrations/models';

const NOW = new Date('2026-09-24T18:00:00.000Z');
const TEAM_ID = 'team_HvgOzoFV92X1vjzqQkczC8kK';
const SECRET = 'test-spend-secret';
const clock = { now: () => new Date(NOW) };

const sign = (body: string) => createHmac('sha1', SECRET).update(body).digest('hex');

function claim(): WebhookReplayClaim {
  return {
    source: 'vercel-spend', replayId: 'spend:50:25', organizationId: null, bodyDigest: 'abc', identityBindingDigest: null,
    claimToken: 'token-1', businessReceipt: null, status: 'claimed', pendingStatus: null, outcome: null,
    receivedAt: NOW.toISOString(), leaseExpiresAt: NOW.toISOString(), attemptCount: 1, expiresAt: NOW.toISOString(),
  };
}

const body = JSON.stringify({ budgetAmount: 50, currentSpend: 25, teamId: TEAM_ID, thresholdPercent: 50 });

describe('VercelSpendWebhookService', () => {
  it('accepts a signed spend alert for the allowlisted team', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'created' as const, claim: claim() })) };
    const service = new VercelSpendWebhookService(repository, TEAM_ID, SECRET, clock);
    const result = await service.process(body, sign(body), 'request-1');
    expect(result).toEqual({ ok: true, value: { received: true, thresholdPercent: 50, currentSpend: 25, budgetAmount: 50, deduped: false } });
    expect(repository.claimReplay).toHaveBeenCalledWith(expect.objectContaining({ source: 'vercel-spend', replayId: 'spend:50:25' }));
  });

  it('dedupes redeliveries without error', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'duplicate' as const, claim: claim() })) };
    const service = new VercelSpendWebhookService(repository, TEAM_ID, SECRET, clock);
    const result = await service.process(body, sign(body), 'request-1');
    expect(result).toEqual({ ok: true, value: { received: true, thresholdPercent: 50, currentSpend: 25, budgetAmount: 50, deduped: true } });
  });

  it('denies forged signatures, foreign team ids, and malformed payloads without disclosure', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'created' as const, claim: claim() })) };
    const service = new VercelSpendWebhookService(repository, TEAM_ID, SECRET, clock);
    const forged = await service.process(body, '0'.repeat(40), 'request-1');
    expect(forged.ok).toBe(false);
    const missing = await service.process(body, null, 'request-1');
    expect(missing.ok).toBe(false);
    const foreignBody = JSON.stringify({ budgetAmount: 50, currentSpend: 50, teamId: 'team_asing', thresholdPercent: 100 });
    const foreign = await service.process(foreignBody, sign(foreignBody), 'request-1');
    expect(foreign.ok).toBe(false);
    const malformed = await service.process('bukan-json', sign('bukan-json'), 'request-1');
    expect(malformed.ok).toBe(false);
    const oversized = await service.process(`{"a":"${'x'.repeat(9_000)}"}`, sign(`{"a":"${'x'.repeat(9_000)}"}`), 'request-1');
    expect(oversized.ok).toBe(false);
    expect(repository.claimReplay).not.toHaveBeenCalled();
  });
});
