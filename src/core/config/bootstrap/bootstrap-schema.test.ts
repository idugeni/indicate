import { describe, expect, it } from 'vitest';

import { validateBootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';

function validEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: 'test',
    NEON_AUTH_BASE_URL: 'https://ep-test.neonauth.example/indicate/auth',
    NEON_AUTH_COOKIE_SECRET: 'neon_cookie_signing_key_98aef02381_valid_length',
    DATABASE_POOL_URL: 'postgresql://user:pass@ep-test-pooler.c-4.ap-southeast-1.aws.neon.tech/indicate?sslmode=require',
    DATABASE_DIRECT_URL: 'postgresql://user:pass@ep-test.c-4.ap-southeast-1.aws.neon.tech/indicate?sslmode=require',
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
  it('menerima env lengkap, membungkus secret, dan memakai Neon Auth', () => {
    const result = validateBootstrapConfig(validEnv());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.controlHosts.dashboard).toBe('indicate.website');
    expect(result.config.controlHosts.status).toBe('status.indicate.website');
    expect(result.config.database.directUrl.reveal()).toBe('postgresql://user:pass@localhost:5432/indicate');
    expect(result.config.neonAuth.baseUrl).toBe('https://ep-test.neonauth.example/indicate/auth');
    expect(result.config.neonAuth.cookieSecret.reveal()).toBe('neon_cookie_signing_key_98aef02381_valid_length');
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

  it('menolak kunci cookie Neon yang terlalu pendek', () => {
    const result = validateBootstrapConfig({ ...validEnv(), NEON_AUTH_COOKIE_SECRET: 'too-short' });
    expect(result.success).toBe(false);
  });

  it('menolak pasangan Resend yang tidak lengkap', () => {
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

  it('mengizinkan kunci DATABASE_* milik Neon saat production dan tetap menolak typo', () => {
    const result = validateBootstrapConfig({
      ...validEnv(),
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@ep-test-pooler.neon.tech/indicate',
      DATABASE_URL_UNPOOLED: 'postgresql://user:pass@ep-test.neon.tech/indicate',
      DATABASE_TYPO: 'x',
    } as Record<string, string | undefined>);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.path === 'DATABASE_TYPO')).toBe(true);
      expect(result.issues.some((issue) => issue.path === 'DATABASE_URL')).toBe(false);
    }
  });

  it('menolak URL database non-Neon saat production', () => {
    const result = validateBootstrapConfig({
      ...validEnv(),
      NODE_ENV: 'production',
      DATABASE_POOL_URL: 'postgresql://user:pass@db.example.com:5432/indicate',
      DATABASE_DIRECT_URL: 'postgresql://user:pass@db.example.com:5432/indicate',
      CLOUDFLARE_API_TOKEN: 'credential-production-long-enough-987654321',
      CLOUDFLARE_ORIGIN_SECRET: 'credential-production-long-enough-987654321',
      VERCEL_API_TOKEN: 'credential-production-long-enough-987654321',
      GENERIC_WEBHOOK_SECRET: 'credential-production-long-enough-987654321',
      CRON_SECRET: 'credential-production-long-enough-987654321',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.category === 'neon_database_host_required')).toBe(true);
    }
  });

  it('mengizinkan production tanpa turnstile site key', () => {
    const secrets = Object.fromEntries(
      ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ORIGIN_SECRET', 'VERCEL_API_TOKEN', 'GENERIC_WEBHOOK_SECRET', 'CRON_SECRET'].map((name) => [name, 'kredensial-produksi-yang-cukup-panjang']),
    );
    const result = validateBootstrapConfig({ ...validEnv(), ...secrets, NODE_ENV: 'production' });
    expect(result.success).toBe(true);
  });

  it('menerima peta secret widget laporan dan menolaknya saat rusak', () => {
    const sitekey = '0x4AAAAAAFHN_lpLqmLytOD5';
    const other = '0x4AAAAAAFHOAAQPpr6CqLFW';
    const valid = validateBootstrapConfig({
      ...validEnv(),
      TURNSTILE_REPORT_SECRETS: JSON.stringify({
        [sitekey]: 'secret-widget-satu-yang-panjang',
        [other]: 'secret-widget-dua-yang-panjang',
      }),
    });
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.config.credentials.turnstileReportSecrets?.get(sitekey)?.reveal()).toBe('secret-widget-satu-yang-panjang');

    for (const [label, value, category] of [
      ['bukan json', 'bukan-json', 'turnstile_secrets_not_json'],
      ['bukan objek', '["secret-yang-panjang"]', 'turnstile_secrets_not_object'],
      ['kosong', '{}', 'turnstile_secrets_empty'],
      ['kunci bukan sitekey', JSON.stringify({ 'bukan-sitekey': 'secret-widget-yang-panjang' }), 'turnstile_sitekey_malformed'],
      ['nilai terlalu pendek', JSON.stringify({ [sitekey]: 'pendek' }), 'secret_too_short'],
      ['nilai placeholder', JSON.stringify({ [sitekey]: 'replace-with-turnstile-secret' }), 'turnstile_secret_placeholder'],
    ] as const) {
      const result = validateBootstrapConfig({ ...validEnv(), TURNSTILE_REPORT_SECRETS: value });
      expect(result.success, label).toBe(false);
      if (!result.success) {
        expect(result.issues.some((issue) => issue.category === category), label).toBe(true);
      }
    }
  });

  it('mengizinkan production dengan site key dan rahasia server Turnstile auth', () => {
    const secrets = Object.fromEntries(
      ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ORIGIN_SECRET', 'VERCEL_API_TOKEN', 'GENERIC_WEBHOOK_SECRET', 'CRON_SECRET'].map((name) => [name, 'kredensial-produksi-yang-cukup-panjang']),
    );
    const result = validateBootstrapConfig({
      ...validEnv(),
      ...secrets,
      NODE_ENV: 'production',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAE6hIUaGluz57tjx',
      TURNSTILE_AUTH_SECRET: 'turnstile-auth-secret-production-is-long-enough',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.credentials.turnstileReportSecrets).toBe(null);
  });

  it('menerima GOOGLE_SITE_VERIFICATION opsional dan menolak format salah', () => {
    const valid = validateBootstrapConfig({ ...validEnv(), GOOGLE_SITE_VERIFICATION: 'dBw4xYz_9-ABCdef1234567890abcDEF' });
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.config.seo.googleSiteVerification).toBe('dBw4xYz_9-ABCdef1234567890abcDEF');
    const invalid = validateBootstrapConfig({ ...validEnv(), GOOGLE_SITE_VERIFICATION: 'pendek' });
    expect(invalid.success).toBe(false);
  });

  it('menerima INDEXNOW_KEY opsional dan menolak format salah', () => {
    const valid = validateBootstrapConfig({ ...validEnv(), INDEXNOW_KEY: 'abc12345-DEF67890' });
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.config.seo.indexnowKey).toBe('abc12345-DEF67890');
    const missing = validateBootstrapConfig(validEnv());
    expect(missing.success).toBe(true);
    if (!missing.success) return;
    expect(missing.config.seo.indexnowKey).toBe(null);
    const invalid = validateBootstrapConfig({ ...validEnv(), INDEXNOW_KEY: 'pendek' });
    expect(invalid.success).toBe(false);
  });

  it('menerima kredensial Google OAuth opsional', () => {
    const valid = validateBootstrapConfig({
      ...validEnv(),
      GOOGLE_CLIENT_ID: '123456789012-abcdefghijklmnopqrstuvwx.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'GOCSPX-contohsecretcukupanjang',
      GOOGLE_REFRESH_TOKEN: 'refresh-token-contoh-yang-cukup-panjang',
    });
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.config.credentials.googleClientId).toContain('.apps.googleusercontent.com');
    const badClient = validateBootstrapConfig({ ...validEnv(), GOOGLE_CLIENT_ID: 'bukan-client-id' });
    expect(badClient.success).toBe(false);
  });
});

describe('validateBootstrapConfig NEXT_PUBLIC_DISQUS_SHORTNAME', () => {
  it('menerima label forum yang valid', () => {
    const result = validateBootstrapConfig({ ...validEnv(), NEXT_PUBLIC_DISQUS_SHORTNAME: 'indicate-1' });
    expect(result.success).toBe(true);
  });

  it('tetap booting tanpa shortname, karena komentar itu opsional', () => {
    const result = validateBootstrapConfig(validEnv());
    expect(result.success).toBe(true);
  });

  it.each([
    'evil.com/embed.js',
    'user@evil.com',
    '*.disqus.com',
    'Indicate-1',
    'indicate_1',
    '-indicate',
    'indicate-',
    'ab',
  ])('menolak shortname malformed: %s', (value) => {
    const result = validateBootstrapConfig({ ...validEnv(), NEXT_PUBLIC_DISQUS_SHORTNAME: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.path.includes('NEXT_PUBLIC_DISQUS_SHORTNAME'))).toBe(true);
    }
  });
});
