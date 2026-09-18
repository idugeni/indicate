import { describe, expect, it } from 'vitest';

import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';
import { createPublicError } from '@/core/errors';
import { handleTelegramSecretReadiness } from '@/app/api/webhooks/readiness/telegram-secret/route';

const SECRET = 'webhook-secret-123';

const CONFIG = {
  hosts: { webhook: 'webhook.indicate.web.id' },
  cloudflare: { originSecret: 'origin-secret-123' },
  telegram: { webhookSecret: SECRET },
} as unknown as RuntimeConfig;

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://webhook.indicate.web.id/api/webhooks/readiness/telegram-secret', { headers: new Headers(headers) });
}

function sourceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    host: 'webhook.indicate.web.id',
    'x-indicate-cloudflare-origin': 'origin-secret-123',
    'cf-connecting-ip': '203.0.113.10',
    ...extra,
  };
}

const ALLOW = {
  publicKey: () => 'k',
  enforce: async () => ({
    ok: true as const,
    value: { allowed: true, remaining: 59, retryAfterSeconds: 0, resetAt: '2026-09-19T00:01:00.000Z' },
  }),
} as const;

describe('handleTelegramSecretReadiness', () => {
  it('menolak sumber tak tepercaya dengan 404', async () => {
    const response = await handleTelegramSecretReadiness(requestWith({ host: 'asing.example' }), CONFIG, ALLOW);
    expect(response.status).toBe(404);
  });

  it('meneruskan rate limit sebagai 429 dengan Retry-After', async () => {
    const limiter = {
      publicKey: () => 'k',
      enforce: async () => ({
        ok: false as const,
        error: createPublicError('RATE_LIMITED', 'pelan', 'req-1', { retryAfterSeconds: ['17'] }),
      }),
    };
    const response = await handleTelegramSecretReadiness(requestWith(sourceHeaders()), CONFIG, limiter);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('17');
  });

  it('menerima secret yang cocok dengan 204', async () => {
    const response = await handleTelegramSecretReadiness(
      requestWith(sourceHeaders({ 'x-telegram-bot-api-secret-token': SECRET })),
      CONFIG,
      ALLOW,
    );
    expect(response.status).toBe(204);
  });

  it('menolak secret salah atau hilang dengan 404', async () => {
    const wrong = await handleTelegramSecretReadiness(
      requestWith(sourceHeaders({ 'x-telegram-bot-api-secret-token': 'salah' })),
      CONFIG,
      ALLOW,
    );
    expect(wrong.status).toBe(404);
    const missing = await handleTelegramSecretReadiness(requestWith(sourceHeaders()), CONFIG, ALLOW);
    expect(missing.status).toBe(404);
  });
});
