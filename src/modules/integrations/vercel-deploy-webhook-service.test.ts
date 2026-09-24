import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { VercelDeployWebhookService } from '@/modules/integrations/vercel-deploy-webhook-service';
import type { WebhookReplayClaim } from '@/modules/integrations/models';

const NOW = new Date('2026-09-24T18:30:00.000Z');
const PROJECT_ID = 'prj_GLknFyW3H6b9KBcvbJbwCN2TMcnt';
const SECRET = 'test-deploy-secret';
const clock = { now: () => new Date(NOW) };

const sign = (body: string) => createHmac('sha1', SECRET).update(body).digest('hex');

function claim(): WebhookReplayClaim {
  return {
    source: 'vercel-deploy', replayId: 'deploy:evt-1', organizationId: null, bodyDigest: 'abc', identityBindingDigest: null,
    claimToken: 'token-1', businessReceipt: null, status: 'claimed', pendingStatus: null, outcome: null,
    receivedAt: NOW.toISOString(), leaseExpiresAt: NOW.toISOString(), attemptCount: 1, expiresAt: NOW.toISOString(),
  };
}

const body = JSON.stringify({
  id: 'evt-1', type: 'deployment.error', createdAt: NOW.getTime(), region: 'sin1',
  payload: { deployment: { id: 'dpl-1', url: 'indicate-abc.vercel.app' }, project: { id: PROJECT_ID }, target: 'production' },
});

describe('VercelDeployWebhookService', () => {
  it('accepts a signed deployment error for the allowlisted project', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'created' as const, claim: claim() })) };
    const service = new VercelDeployWebhookService(repository, PROJECT_ID, SECRET, clock);
    const result = await service.process(body, sign(body), 'request-1');
    expect(result).toEqual({ ok: true, value: { received: true, type: 'deployment.error', deploymentId: 'dpl-1', deduped: false } });
    expect(repository.claimReplay).toHaveBeenCalledWith(expect.objectContaining({ source: 'vercel-deploy', replayId: 'deploy:evt-1' }));
  });

  it('dedupes redeliveries without error', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'duplicate' as const, claim: claim() })) };
    const service = new VercelDeployWebhookService(repository, PROJECT_ID, SECRET, clock);
    const result = await service.process(body, sign(body), 'request-1');
    expect(result).toEqual({ ok: true, value: { received: true, type: 'deployment.error', deploymentId: 'dpl-1', deduped: true } });
  });

  it('denies forged signatures, foreign projects, and malformed payloads without disclosure', async () => {
    const repository = { claimReplay: vi.fn(async () => ({ kind: 'created' as const, claim: claim() })) };
    const service = new VercelDeployWebhookService(repository, PROJECT_ID, SECRET, clock);
    const forged = await service.process(body, '0'.repeat(40), 'request-1');
    expect(forged.ok).toBe(false);
    const foreignBody = JSON.stringify({ id: 'evt-2', type: 'deployment.canceled', createdAt: NOW.getTime(), payload: { deployment: { id: 'dpl-9' }, project: { id: 'prj_asing' } } });
    const foreign = await service.process(foreignBody, sign(foreignBody), 'request-1');
    expect(foreign.ok).toBe(false);
    const wrongType = JSON.stringify({ id: 'evt-3', type: 'deployment.ready', createdAt: NOW.getTime(), payload: { deployment: { id: 'dpl-3' }, project: { id: PROJECT_ID } } });
    const rejected = await service.process(wrongType, sign(wrongType), 'request-1');
    expect(rejected.ok).toBe(false);
    expect(repository.claimReplay).not.toHaveBeenCalled();
  });
});
