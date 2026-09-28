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

  it('melanjutkan production saat widget auth punya site key tanpa secret server', () => {
    const secrets = Object.fromEntries(
      ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ORIGIN_SECRET', 'VERCEL_API_TOKEN', 'GENERIC_WEBHOOK_SECRET', 'CRON_SECRET'].map((name) => [name, 'kredensial-produksi-yang-cukup-panjang']),
    );
    const result = validateBootstrapConfig({
      ...validEnv(),
      ...secrets,
      NODE_ENV: 'production',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAE6hIUaGluz57tjx',
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

});

const REF = 'abcdefgh1234';
const OTHER_REF = 'zyxwvuts9876';

function identityEnv(database: { readonly pool: string; readonly direct: string }) {
  return {
    ...validEnv(),
    SUPABASE_PROJECT_REF: REF,
    DATABASE_POOL_URL: database.pool,
    DATABASE_DIRECT_URL: database.direct,
  };
}

function categoriesFor(env: Record<string, string | undefined>, key: 'DATABASE_POOL_URL' | 'DATABASE_DIRECT_URL') {
  const result = validateBootstrapConfig(env);
  if (result.success) return [];
  return result.issues.filter((issue) => issue.path.includes(key)).map((issue) => issue.category);
}

describe('identitas project pada URL database', () => {
  it('menerima host direct per-project', () => {
    const env = identityEnv({
      pool: `postgresql://indicate_runtime.${REF}:pw@db.${REF}.supabase.co:5432/postgres`,
      direct: `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`,
    });
    expect(categoriesFor(env, 'DATABASE_POOL_URL')).toEqual([]);
    expect(categoriesFor(env, 'DATABASE_DIRECT_URL')).toEqual([]);
  });

  it('menerima pooler dengan ref di username, karena bentuk inilah yang dipakai jaringan tanpa IPv6', () => {
    const env = identityEnv({
      pool: `postgresql://indicate_runtime.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
      direct: `postgresql://postgres.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
    });
    expect(validateBootstrapConfig(env).success).toBe(true);
  });

  it('menolak pooler tanpa ref di username walau password memuat ref', () => {
    const env = identityEnv({
      pool: `postgresql://postgres:pw-${REF}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      direct: `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`,
    });
    expect(categoriesFor(env, 'DATABASE_POOL_URL')).toContain('supabase_project_identity_mismatch');
  });

  it('menolak pooler yang menunjuk project lain', () => {
    const env = identityEnv({
      pool: `postgresql://indicate_runtime.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      direct: `postgresql://postgres.${OTHER_REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
    });
    expect(categoriesFor(env, 'DATABASE_DIRECT_URL')).toContain('supabase_project_identity_mismatch');
  });

  it('menolak username pooler kosong dan host asing', () => {
    const emptyUser = identityEnv({
      pool: `postgresql://:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      direct: `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`,
    });
    expect(categoriesFor(emptyUser, 'DATABASE_POOL_URL')).toContain('supabase_project_identity_mismatch');

    const foreignHost = identityEnv({
      pool: `postgresql://indicate_runtime.${REF}:pw@db.${REF}.supabase.co:5432/postgres`,
      direct: `postgresql://postgres:pw@db.other-project.supabase.co:5432/postgres`,
    });
    expect(categoriesFor(foreignHost, 'DATABASE_DIRECT_URL')).toContain('supabase_project_identity_mismatch');
  });

  it('menolak host yang hanya menyerupai pooler', () => {
    const env = identityEnv({
      pool: `postgresql://indicate_runtime.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com.example.net:6543/postgres`,
      direct: `postgresql://postgres:${REF}@db.${REF}.supabase.co:5432/postgres`,
    });
    expect(categoriesFor(env, 'DATABASE_POOL_URL')).toContain('supabase_project_identity_mismatch');
  });

  it('tetap menolak NEXT_PUBLIC_SUPABASE_URL project lain', () => {
    const env = identityEnv({
      pool: `postgresql://indicate_runtime.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      direct: `postgresql://postgres.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
    });
    const result = validateBootstrapConfig({ ...env, NEXT_PUBLIC_SUPABASE_URL: `https://${OTHER_REF}.supabase.co` });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.path.includes('NEXT_PUBLIC_SUPABASE_URL'))).toBe(true);
    }
  });
});
