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
    GENERIC_WEBHOOK_SECRET: 'generic-secret-123',
    CRON_SECRET: 'cron-secret-123',
  };
}

describe('validateBootstrapConfig sukses', () => {
  it('menerima env lengkap dan membungkus secret', () => {
    const result = validateBootstrapConfig(validEnv());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.controlHosts.dashboard).toBe('indicate.website');
    expect(result.config.database.directUrl.reveal()).toBe('postgresql://user:pass@localhost:5432/indicate');
    expect(result.config.credentials.resendApiKey).toBe(null);
  });
});

describe('validateBootstrapConfig gagal', () => {
  it('menolak secret pendek dan host duplikat', () => {
    const short = validateBootstrapConfig({ ...validEnv(), CRON_SECRET: 'pendek' });
    expect(short.success).toBe(false);
    const duplicated = validateBootstrapConfig({ ...validEnv(), API_HOST: 'indicate.website' });
    expect(duplicated.success).toBe(false);
    if (!duplicated.success) {
      expect(duplicated.issues.some((issue) => issue.category === 'control_hosts_must_be_distinct')).toBe(true);
    }
  });

  it('menolak pasangan resend yang tidak lengkap', async () => {
    const { validateBootstrapConfig } = await import('@/core/config/bootstrap/bootstrap-schema');
    const result = validateBootstrapConfig({ ...validEnv(), RESEND_API_KEY: 'resend-key-123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.category === 'resend_email_incomplete')).toBe(true);
    }
  });

  it('menerima pasangan bucket publik dan menolak yang timpang', () => {
    const pair = validateBootstrapConfig({
      ...validEnv(),
      R2_PUBLIC_BUCKET_NAME: 'indicate-media-public',
      R2_PUBLIC_HOST: 'media.indicate.website',
    });
    expect(pair.success).toBe(true);
    if (!pair.success) return;
    expect(pair.config.credentials.r2PublicBucketName).toBe('indicate-media-public');
    expect(pair.config.credentials.r2PublicHost).toBe('media.indicate.website');
    const lopsided = validateBootstrapConfig({ ...validEnv(), R2_PUBLIC_BUCKET_NAME: 'indicate-media-public' });
    expect(lopsided.success).toBe(false);
    if (!lopsided.success) {
      expect(lopsided.issues.some((issue) => issue.category === 'r2_public_incomplete')).toBe(true);
    }
  });

  it('menolak kunci namespace tak dikenal saat production', () => {
    const result = validateBootstrapConfig({ ...validEnv(), NODE_ENV: 'production', R2_FOO: 'x' } as Record<string, string | undefined>);
    expect(result.success).toBe(false);
  });

  it('mengizinkan production tanpa turnstile site key', () => {
    const secrets = Object.fromEntries(
      ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ORIGIN_SECRET', 'VERCEL_API_TOKEN', 'GENERIC_WEBHOOK_SECRET', 'CRON_SECRET'].map((name) => [name, 'kredensial-produksi-yang-cukup-panjang']),
    );
    const result = validateBootstrapConfig({ ...validEnv(), ...secrets, NODE_ENV: 'production' });
    expect(result.success).toBe(true);
  });

  it('menerima GOOGLE_SITE_VERIFICATION opsional dan menolak format salah', () => {
    const valid = validateBootstrapConfig({ ...validEnv(), GOOGLE_SITE_VERIFICATION: 'dBw4xYz_9-ABCdef1234567890abcDEF' });
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.config.seo.googleSiteVerification).toBe('dBw4xYz_9-ABCdef1234567890abcDEF');
    const invalid = validateBootstrapConfig({ ...validEnv(), GOOGLE_SITE_VERIFICATION: 'pendek' });
    expect(invalid.success).toBe(false);
  });

  it('menerima kredensial google oauth dan smtp resend opsional', () => {
    const valid = validateBootstrapConfig({
      ...validEnv(),
      GOOGLE_CLIENT_ID: '123456789012-abcdefghijklmnopqrstuvwx.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'GOCSPX-contohsecretcukupanjang',
      GOOGLE_REFRESH_TOKEN: 'refresh-token-contoh-yang-cukup-panjang',
      RESEND_SMTP_PASS: 're_contohsecretcukupanjang1234',
    });
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.config.credentials.googleClientId).toContain('.apps.googleusercontent.com');
    expect(valid.config.credentials.resendSmtpPass).not.toBe(null);
    const badClient = validateBootstrapConfig({ ...validEnv(), GOOGLE_CLIENT_ID: 'bukan-client-id' });
    expect(badClient.success).toBe(false);
  });

  it('menerima FB_APP_TOKEN format app-id pipe app-secret', () => {
    const result = validateBootstrapConfig({ ...validEnv(), FB_APP_TOKEN: '1234567890123456|AbCdEfGhIjKlMnOpQrStUvWx' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.credentials.facebookAppToken).not.toBe(null);
  });

  it('menolak FB_APP_TOKEN tanpa separator atau sisi kosong', () => {
    for (const token of ['tanpa-separator-sama-sekali', '|sisi-kiri-kosong', 'sisi-kanan-kosong|', 'dua|separator|lebih']) {
      const result = validateBootstrapConfig({ ...validEnv(), FB_APP_TOKEN: token });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((issue) => issue.category === 'fb_app_token_malformed')).toBe(true);
      }
    }
  });

  it('menolak FB_APP_TOKEN placeholder saat production', () => {
    const result = validateBootstrapConfig({ ...validEnv(), NODE_ENV: 'production', FB_APP_TOKEN: 'test-secret-token|bagian-kedua' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.category === 'production_secret_not_bounded')).toBe(true);
    }
  });
});
