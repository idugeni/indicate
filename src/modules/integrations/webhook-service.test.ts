import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { signWebhook, WebhookService } from '@/modules/integrations/webhook-service';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const SECRET = 'webhook-secret-1';
const SECRETS = { github: SECRET };
const BODY = JSON.stringify({ event: 'push', ref: 'main' });

const digestOf = (value: string) => createHash('sha256').update(value).digest('hex');
const timestamp = () => Math.floor(NOW.getTime() / 1_000);

function headersFor(body: string, overrides: Record<string, unknown> = {}) {
  const ts = timestamp();
  return {
    source: 'github',
    replayId: 'replay-1',
    timestamp: ts,
    signature: signWebhook(SECRET, ts, body),
    ...overrides,
  };
}

function baseClaim(bodyDigest: string, extra: Record<string, unknown> = {}) {
  return {
    source: 'github',
    replayId: 'replay-1',
    organizationId: null,
    bodyDigest,
    identityBindingDigest: null,
    claimToken: 'token-1',
    businessReceipt: null,
    status: 'claimed',
    pendingStatus: null,
    outcome: null,
    receivedAt: NOW.toISOString(),
    leaseExpiresAt: NOW.toISOString(),
    attemptCount: 1,
    expiresAt: NOW.toISOString(),
    ...extra,
  };
}

function harness(claims: {
  claimReplay?: (...args: unknown[]) => Promise<unknown>;
  prepareReplayOutcome?: (...args: unknown[]) => Promise<unknown>;
  finalizeReplay?: (...args: unknown[]) => Promise<unknown>;
} = {}) {
  const repository = {
    claimReplay: vi.fn(
      claims.claimReplay ??
        (async (input: unknown) => {
          const digest = (input as { bodyDigest: string }).bodyDigest;
          return { kind: 'created', claim: baseClaim(digest) };
        }),
    ),
    prepareReplayOutcome: vi.fn(
      claims.prepareReplayOutcome ??
        (async (...args: unknown[]) => {
          const outcome = args[4] as Record<string, unknown>;
          const claim = baseClaim(digestOf(BODY), {
            status: 'claimed',
            pendingStatus: 'processed',
            outcome,
          });
          return claim;
        }),
    ),
    finalizeReplay: vi.fn(
      claims.finalizeReplay ??
        (async () => baseClaim(digestOf(BODY), { status: 'processed', outcome: { accepted: true } })),
    ),
  };
  const service = new WebhookService(repository as never, SECRETS, 300, 3600, { now: () => NOW });
  return { repository, service };
}

describe('signWebhook', () => {
  it('menghasilkan signature sha256 heksagonal yang deterministik', () => {
    const first = signWebhook(SECRET, timestamp(), BODY);
    const second = signWebhook(SECRET, timestamp(), BODY);
    expect(first).toBe(second);
    expect(first).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(signWebhook('other', timestamp(), BODY)).not.toBe(first);
  });
});

describe('WebhookService process guards', () => {
  it('menolak header tidak valid secara non-disclosing', async () => {
    const { service } = harness();
    const result = await service.process(BODY, { source: 'github' }, null, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak source tanpa secret secara non-disclosing', async () => {
    const { service } = harness();
    const ts = timestamp();
    const result = await service.process(
      BODY,
      { source: 'unknown', replayId: 'r-1', timestamp: ts, signature: signWebhook(SECRET, ts, BODY) },
      null,
      'req-1',
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak signature yang salah secara non-disclosing', async () => {
    const { service } = harness();
    const ts = timestamp();
    const result = await service.process(
      BODY,
      { source: 'github', replayId: 'r-1', timestamp: ts, signature: signWebhook('wrong', ts, BODY) },
      null,
      'req-1',
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak timestamp basi secara non-disclosing', async () => {
    const { service } = harness();
    const stale = timestamp() - 3_600;
    const result = await service.process(
      BODY,
      { source: 'github', replayId: 'r-1', timestamp: stale, signature: signWebhook(SECRET, stale, BODY) },
      null,
      'req-1',
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak body raksasa secara non-disclosing', async () => {
    const { service, repository } = harness();
    const huge = `{"data":"${'x'.repeat(1_000_001)}"}`;
    const result = await service.process(huge, headersFor(huge), null, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.claimReplay).not.toHaveBeenCalled();
  });
});

describe('WebhookService process outcomes', () => {
  it('menerima JSON valid dan menyiapkan outcome processed', async () => {
    const { service, repository } = harness();
    const result = await service.process(BODY, headersFor(BODY), null, 'req-1');
    expect(result.ok).toBe(true);
    expect(repository.prepareReplayOutcome).toHaveBeenCalledTimes(1);
    expect(repository.finalizeReplay).toHaveBeenCalledTimes(1);
  });

  it('memetakan JSON rusak ke invalid input', async () => {
    const broken = '{not-json';
    const prepared = () =>
      baseClaim(digestOf(broken), { status: 'claimed', pendingStatus: 'rejected', outcome: { code: 'invalid_json' } });
    const { service } = harness({
      claimReplay: async (input: unknown) => ({
        kind: 'created',
        claim: baseClaim((input as { bodyDigest: string }).bodyDigest),
      }),
      prepareReplayOutcome: async () => prepared(),
      finalizeReplay: async () => ({ ...prepared(), status: 'rejected' }),
    });
    const result = await service.process(broken, headersFor(broken), null, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak duplikat yang sedang diproses sebagai conflict', async () => {
    const { service } = harness({
      claimReplay: async (input: unknown) => ({
        kind: 'duplicate',
        claim: baseClaim((input as { bodyDigest: string }).bodyDigest, {
          status: 'claimed',
          pendingStatus: null,
          businessReceipt: null,
        }),
      }),
    });
    const result = await service.process(BODY, headersFor(BODY), null, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('memutar ulang outcome duplikat yang sudah processed', async () => {
    const outcome = { accepted: true };
    const { service } = harness({
      claimReplay: async (input: unknown) => ({
        kind: 'duplicate',
        claim: baseClaim((input as { bodyDigest: string }).bodyDigest, { status: 'processed', outcome }),
      }),
    });
    const result = await service.process(BODY, headersFor(BODY), null, 'req-1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual(outcome);
  });

  it('menolak klaim dengan digest berbeda secara non-disclosing', async () => {
    const { service } = harness({
      claimReplay: async () => ({ kind: 'created', claim: baseClaim('digest-lain') }),
    });
    const result = await service.process(BODY, headersFor(BODY), null, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('memetakan kegagalan repo ke dependency unavailable', async () => {
    const { service } = harness({
      claimReplay: async () => {
        throw new Error('db down');
      },
    });
    const result = await service.process(BODY, headersFor(BODY), null, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
});
