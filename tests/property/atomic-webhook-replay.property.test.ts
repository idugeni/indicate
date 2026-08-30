import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { signWebhook, webhookBodyDigest, WebhookService } from '@/application/stage6/webhook-service';
import { InMemoryStage6Repository } from '@/infrastructure/testing/stage6-memory';
import { assertAsyncProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 33: Webhook replay claims produce one logical outcome
// **Validates: Requirements 17.15, 17.16, 17.17, 17.18, 17.19, 17.20, 21.29**
describe('Property 33: atomic webhook replay claims', () => {
  it('converges concurrent and repeated authenticated deliveries on one deterministic outcome', async () => {
    await assertAsyncProperty('Property 33: Webhook replay claims produce one logical outcome', fc.asyncProperty(
      fc.record({
        replayId: fc.uuid(),
        source: fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/),
        count: fc.integer({ min: 2, max: 20 }),
        value: fc.integer(),
      }),
      async ({ replayId, source, count, value }) => {
        const now = new Date('2026-08-30T00:00:00.000Z');
        const timestamp = Math.floor(now.getTime() / 1_000);
        const secret = 'property-webhook-secret';
        const rawBody = JSON.stringify({ value });
        const headers = { source, replayId, timestamp, signature: signWebhook(secret, timestamp, rawBody) };
        const repository = new InMemoryStage6Repository();
        const service = new WebhookService(repository, { [source]: secret }, 300, 900, { now: () => now });
        const expected = { accepted: true, payloadDigest: webhookBodyDigest(rawBody) };

        const concurrent = await Promise.all(Array.from({ length: count }, (_, index) => service.process(rawBody, headers, null, `concurrent-${index}`)));
        expect(concurrent.filter((result) => result.ok)).toHaveLength(1);
        expect(concurrent.filter((result) => !result.ok).every((result) => !result.ok && result.error.error.code === 'CONFLICT')).toBe(true);

        const repeated = await service.process(rawBody, headers, null, 'repeat');
        expect(repeated).toEqual({ ok: true, value: expected });

        const invalid = await service.process(rawBody, { ...headers, signature: `sha256=${'0'.repeat(64)}` }, null, 'invalid');
        const staleTimestamp = timestamp - 301;
        const stale = await service.process(rawBody, { ...headers, replayId: `${replayId}-stale`, timestamp: staleTimestamp, signature: signWebhook(secret, staleTimestamp, rawBody) }, null, 'stale');
        expect(invalid.ok).toBe(false);
        expect(stale.ok).toBe(false);
      },
    ), ['property-webhook-secret']);
  });
});
