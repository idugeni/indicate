import { describe, expect, it } from 'vitest';

import { roleCreateSchema } from '@/application/stage3/schemas';
import { deriveApiKeyHash, ScryptApiKeyHasher } from '@/application/stage6/api-key-service';
import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { trustedCloudflareSource } from '@/application/stage6/trusted-request-boundary';
import { telegramUpdateSchema } from '@/application/stage6/schemas';
import { signWebhook, webhookBodyDigest } from '@/application/stage6/webhook-service';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';

describe('Stage 6 external-entry-point primitives', () => {
  it('never accepts a platform-scoped permission in tenant role schemas', () => {
    expect(roleCreateSchema.safeParse({ name: 'Tenant admin', active: true, permissions: ['platform.customer.admin'] }).success).toBe(false);
    expect(roleCreateSchema.safeParse({ name: 'Tenant API admin', active: true, permissions: ['api_key.manage'] }).success).toBe(true);
  });

  it('trusts a source only on the exact configured host with Cloudflare origin proof and a valid IP', () => {
    const request = (host: string, proof = 'origin-secret', source = '203.0.113.7') => new Request('https://origin.invalid/api/v1/commands', { headers: { host, 'x-indicate-cloudflare-origin': proof, 'cf-connecting-ip': source } });
    expect(trustedCloudflareSource(request('api.indicate.web.id'), 'api.indicate.web.id', 'origin-secret')).toBe('203.0.113.7');
    expect(trustedCloudflareSource(request('deployment.vercel.app'), 'api.indicate.web.id', 'origin-secret')).toBeNull();
    expect(trustedCloudflareSource(request('api.indicate.web.id', 'attacker-value'), 'api.indicate.web.id', 'origin-secret')).toBeNull();
    expect(trustedCloudflareSource(request('api.indicate.web.id', 'origin-secret', 'spoofed-source'), 'api.indicate.web.id', 'origin-secret')).toBeNull();
  });

  it('derives deterministic salted API-key hashes and rejects a different secret', async () => {
    const salt = Buffer.from('stage6-unit-salt').toString('base64');
    const first = await deriveApiKeyHash('secret-one', salt);
    expect(first).toBe(await deriveApiKeyHash('secret-one', salt));
    expect(first).not.toBe(await deriveApiKeyHash('secret-two', salt));
    const hasher = new ScryptApiKeyHasher();
    await expect(hasher.verify('secret-one', salt, first)).resolves.toBe(true);
    await expect(hasher.verify('secret-two', salt, first)).resolves.toBe(false);
  });

  it('accepts real Telegram document fields without a caller-supplied checksum', () => {
    const parsed = telegramUpdateSchema.safeParse({
      update_id: 42,
      message: {
        message_id: 8,
        date: 1788048000,
        from: { id: 6001, is_bot: false, first_name: 'Publisher' },
        chat: { id: 6002, type: 'private' },
        document: { file_id: 'telegram-file', file_unique_id: 'unique-file', file_name: 'lead.png', mime_type: 'image/png', file_size: 4 },
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('signs the exact raw body and returns stable hexadecimal body digests', () => {
    const body = '{"ordered":true,"value":1}';
    expect(signWebhook('secret', 123, body)).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(signWebhook('secret', 123, body)).not.toBe(signWebhook('secret', 123, `${body} `));
    expect(webhookBodyDigest(body)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fails closed for protected endpoints and opens only an explicit low-risk policy', async () => {
    const port = new InMemoryRateLimitAdapter();
    const service = new RateLimitService(port, { now: () => new Date('2026-08-30T00:00:00.000Z') });
    port.failNext = true;
    await expect(service.enforce('mutation:key', { allowance: 1, windowSeconds: 60, failureMode: 'closed' }, 'closed')).resolves.toMatchObject({ ok: false, error: { error: { code: 'DEPENDENCY_UNAVAILABLE' } } });
    port.failNext = true;
    await expect(service.enforce('public:key', { allowance: 1, windowSeconds: 60, failureMode: 'open_low_risk' }, 'open')).resolves.toMatchObject({ ok: true, value: { allowed: true, remaining: 0, retryAfterSeconds: 60 } });
    await expect(service.enforce('invalid', { allowance: 0, windowSeconds: 60, failureMode: 'closed' }, 'invalid')).resolves.toMatchObject({ ok: false, error: { error: { code: 'CONFIGURATION_INVALID' } } });
  });
});
