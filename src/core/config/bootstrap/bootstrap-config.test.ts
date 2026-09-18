import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeConfigurationError, getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';

const VALID = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh1234.supabase.co',
  DATABASE_POOL_URL: 'postgresql://user:pass@localhost:5432/indicate',
  DATABASE_DIRECT_URL: 'postgresql://user:pass@localhost:5432/indicate',
  CLOUDFLARE_API_TOKEN: 'cf-token-123',
  CLOUDFLARE_ORIGIN_SECRET: 'origin-secret-123',
  VERCEL_API_TOKEN: 'vercel-token-123',
  R2_ACCESS_KEY_ID: 'r2-key-id-123',
  R2_SECRET_ACCESS_KEY: 'r2-secret-123',
  UPSTASH_REDIS_REST_URL: 'https://redis.example',
  UPSTASH_REDIS_REST_TOKEN: 'upstash-token-123',
  TELEGRAM_BOT_TOKEN: 'telegram-token-123',
  TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-123',
  GENERIC_WEBHOOK_SECRET: 'generic-secret-123',
  CRON_SECRET: 'cron-secret-123',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getBootstrapConfig', () => {
  it('melempar RuntimeConfigurationError saat env invalid', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('CRON_SECRET', 'x');
    expect(() => getBootstrapConfig()).toThrow(RuntimeConfigurationError);
  });

  it('memuat dan me-memoize konfigurasi valid', () => {
    for (const [key, value] of Object.entries(VALID)) vi.stubEnv(key, value);
    const first = getBootstrapConfig();
    expect(first.controlHosts.api).toBe('api.indicate.web.id');
    expect(getBootstrapConfig()).toBe(first);
  });
});
