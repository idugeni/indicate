import { describe, expect, it } from 'vitest';

import { validateBootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';

function validEnv(): Record<string, string | undefined> {
  return {
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
}

describe('validateBootstrapConfig sukses', () => {
  it('menerima env lengkap dan membungkus secret', () => {
    const result = validateBootstrapConfig(validEnv());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.controlHosts.dashboard).toBe('indicate.web.id');
    expect(result.config.database.directUrl.reveal()).toBe('postgresql://user:pass@localhost:5432/indicate');
    expect(result.config.credentials.resendApiKey).toBe(null);
  });
});

describe('validateBootstrapConfig gagal', () => {
  it('menolak secret pendek dan host duplikat', () => {
    const short = validateBootstrapConfig({ ...validEnv(), CRON_SECRET: 'pendek' });
    expect(short.success).toBe(false);
    const duplicated = validateBootstrapConfig({ ...validEnv(), API_HOST: 'indicate.web.id' });
    expect(duplicated.success).toBe(false);
    if (!duplicated.success) {
      expect(duplicated.issues.some((issue) => issue.category === 'control_hosts_must_be_distinct')).toBe(true);
    }
  });

  it('menolak pasangan resend yang tidak lengkap', () => {
    const result = validateBootstrapConfig({ ...validEnv(), RESEND_API_KEY: 'resend-key-123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.category === 'resend_email_incomplete')).toBe(true);
    }
  });

  it('menolak kunci namespace tak dikenal saat production', () => {
    const result = validateBootstrapConfig({ ...validEnv(), NODE_ENV: 'production', TELEGRAM_BOT_TOKEN: undefined, TELEGRAM_BOT_TOKEN_X: 'x' } as Record<string, string | undefined>);
    expect(result.success).toBe(false);
  });

  it('mengizinkan production tanpa turnstile site key', () => {
    const secrets = Object.fromEntries(
      ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ORIGIN_SECRET', 'VERCEL_API_TOKEN', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'GENERIC_WEBHOOK_SECRET', 'CRON_SECRET'].map((name) => [name, 'kredensial-produksi-yang-cukup-panjang']),
    );
    const result = validateBootstrapConfig({ ...validEnv(), ...secrets, NODE_ENV: 'production' });
    expect(result.success).toBe(true);
  });
});
