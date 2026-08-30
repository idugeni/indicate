import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UpstashRateLimitAdapter } from '@/infrastructure/redis/upstash-rate-limit';
import { TelegramBotApiAdapter } from '@/infrastructure/telegram/telegram-bot-api';

afterEach(() => vi.unstubAllGlobals());

describe('Stage 6 deterministic provider contracts', () => {
  it('downloads an exact Telegram file, computes SHA-256, and uploads only checksum-bound bytes', async () => {
    const bytes = new TextEncoder().encode('stage6-image');
    const checksum = createHash('sha256').update(bytes).digest('base64');
    const uploads: { url: string; init?: RequestInit }[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/getFile?')) return new Response(JSON.stringify({ ok: true, result: { file_path: 'documents/stage6.png' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.includes('/file/bot')) return new Response(bytes, { status: 200, headers: { 'content-length': String(bytes.byteLength), 'content-type': 'image/png' } });
      uploads.push({ url, ...(init === undefined ? {} : { init }) }); return new Response(null, { status: 200 });
    });
    const adapter = new TelegramBotApiAdapter('contract-token', 1024, fetcher as typeof fetch);
    const prepared = await adapter.prepare({ fileId: 'telegram-file', expectedSize: bytes.byteLength });
    expect(prepared).toMatchObject({ sizeBytes: bytes.byteLength, checksumSha256: checksum });
    await adapter.transfer({ media: prepared, mediaType: 'image/png', authorization: { key: 'articles/id/stage6.png', url: 'https://upload.example/stage6', expiresAt: new Date(Date.now() + 60_000), requiredHeaders: { 'content-type': 'image/png', 'x-amz-checksum-sha256': checksum } } });
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toMatchObject({ url: 'https://upload.example/stage6', init: { method: 'PUT', headers: { 'content-type': 'image/png', 'x-amz-checksum-sha256': checksum } } });
    await expect(adapter.prepare({ fileId: 'telegram-file', expectedSize: 2048 })).rejects.toThrow('configured media policy');
  });

  it('maps the atomic Upstash script result to bounded fixed-window guidance', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), ...(init === undefined ? {} : { init }) });
      return new Response(JSON.stringify([{ result: [3, 12_345, 3] }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const adapter = new UpstashRateLimitAdapter({ url: 'https://contract.upstash.io', token: 'contract-token', namespace: 'indicate:contract' });
    const result = await adapter.consume('api:org:one', { allowance: 3, windowSeconds: 30, failureMode: 'closed' }, new Date('2026-08-30T00:00:00.000Z'));
    expect(result).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 13, resetAt: '2026-08-30T00:00:12.345Z' });
    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.init?.body)).toContain('indicate:contract:ratelimit:api:org:one');
  });
});

const liveEnabled = process.env.STAGE6_LIVE_PROVIDER_CHECKS === '1';
const liveSuite = liveEnabled ? describe : describe.skip;
liveSuite('optional live Stage 6 provider checks', () => {
  it('checks Telegram Bot API health with explicit credentials', async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required when STAGE6_LIVE_PROVIDER_CHECKS=1.');
    await expect(new TelegramBotApiAdapter(token, 20_000_000).check()).resolves.toMatchObject({ status: 'healthy' });
  });

  it('consumes an isolated Upstash rate-limit key with explicit credentials', async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL; const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('Upstash credentials are required when STAGE6_LIVE_PROVIDER_CHECKS=1.');
    const adapter = new UpstashRateLimitAdapter({ url, token, namespace: `indicate:stage6-live:${crypto.randomUUID()}` });
    await expect(adapter.consume('provider-check', { allowance: 1, windowSeconds: 5, failureMode: 'closed' }, new Date())).resolves.toMatchObject({ allowed: true, remaining: 0 });
  });
});
