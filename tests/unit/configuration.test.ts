import { describe, expect, it } from 'vitest';

import { getPublicConfig } from '@/config/public';
import { normalizeConfiguredHostname, validateRuntimeConfig } from '@/config/schema';
import { createValidRuntimeEnvironment } from '../helpers/runtime-environment';

describe('runtime configuration', () => {
  it('parses one complete shared topology and applies conservative bounded defaults', () => {
    const environment = createValidRuntimeEnvironment({
      MEDIA_MAX_BYTES: undefined,
      PUBLISH_MAX_ATTEMPTS: undefined,
      CACHE_DEFAULT_TTL_SECONDS: undefined,
    });
    const result = validateRuntimeConfig(environment);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.hosts.mvpRoots).toHaveLength(3);
    expect(result.config.hosts.reserved).toEqual(new Set(['indicate.web.id', 'api.indicate.web.id', 'webhook.indicate.web.id']));
    expect(result.config.r2.maxBytes).toBe(10_485_760);
    expect(result.config.publishing.maxAttempts).toBe(5);
    expect(result.config.cache.defaultTtlSeconds).toBe(300);
    expect(result.config.rateLimits).toEqual({
      mutation: { allowance: 30, windowSeconds: 60 },
      webhook: { allowance: 60, windowSeconds: 60 },
      publicRead: { allowance: 300, windowSeconds: 60 },
    });
  });

  it('normalizes configured IDN case and terminal dots', () => {
    expect(normalizeConfiguredHostname('BÜCHER.WEB.ID.')).toBe('xn--bcher-kva.web.id');
  });

  it('returns deterministic value-free errors for duplicate roots and invalid bounds', () => {
    const result = validateRuntimeConfig(createValidRuntimeEnvironment({
      MVP_ROOT_HOSTS: 'same.example.web.id,same.example.web.id,third.example.web.id',
      PUBLISH_LEASE_SECONDS: '999999',
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues).toEqual([...result.issues].sort((a, b) => `${a.path}:${a.category}`.localeCompare(`${b.path}:${b.category}`)));
    expect(JSON.stringify(result.issues)).not.toContain('same.example.web.id');
    expect(JSON.stringify(result.issues)).not.toContain('999999');
  });

  it('rejects root conflicts with reserved control-plane hosts', () => {
    const result = validateRuntimeConfig(createValidRuntimeEnvironment({
      CMS_HOST: 'alpha.example.web.id',
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues).toContainEqual({ path: 'MVP_ROOT_HOSTS', category: 'root_host_conflicts_with_control_plane' });
  });

  it('rejects Supabase Auth, pooled database, and direct database identity divergence or lookalike hosts', () => {
    const cases = [
      { NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnop.attacker.example' },
      { DATABASE_POOL_URL: 'postgresql://indicate_runtime.abcdefghijklmnop:password@attacker.example:6543/postgres' },
      { DATABASE_DIRECT_URL: 'postgresql://postgres:password@db.abcdefghijklmnop.attacker.example:5432/postgres' },
    ];
    for (const override of cases) {
      const result = validateRuntimeConfig(createValidRuntimeEnvironment(override));
      expect(result.success).toBe(false);
      if (result.success) continue;
      expect(result.issues.some((issue) => issue.category === 'supabase_project_identity_mismatch')).toBe(true);
      expect(JSON.stringify(result.issues)).not.toContain('attacker.example');
    }
  });

  it('rejects out-of-range endpoint-class rate policies without exposing values', () => {
    const result = validateRuntimeConfig(createValidRuntimeEnvironment({ RATE_LIMIT_MUTATION_ALLOWANCE: '1000001' }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((issue) => issue.path === 'RATE_LIMIT_MUTATION_ALLOWANCE')).toBe(true);
    expect(JSON.stringify(result.issues)).not.toContain('1000001');
  });

  it('requires bounded non-placeholder control-plane and webhook secrets in production', () => {
    const result = validateRuntimeConfig(createValidRuntimeEnvironment({
      NODE_ENV: 'production', APP_ENVIRONMENT: 'production', SCHEMA_GATE_MODE: 'live',
      CLOUDFLARE_ORIGIN_SECRET: 'change-me', TELEGRAM_WEBHOOK_SECRET: 'test-secret',
      GENERIC_WEBHOOK_SECRET: 'placeholder', CRON_SECRET: 'short',
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.filter(({ category }) => category === 'production_secret_not_bounded').map(({ path }) => path).sort()).toEqual([
      'CLOUDFLARE_ORIGIN_SECRET', 'CRON_SECRET', 'GENERIC_WEBHOOK_SECRET', 'TELEGRAM_WEBHOOK_SECRET',
    ]);
    expect(JSON.stringify(result.issues)).not.toMatch(/change-me|test-secret|placeholder/u);
  });

  it('requires production-strength R2 data-plane credentials without exposing values', () => {
    const result = validateRuntimeConfig(createValidRuntimeEnvironment({
      NODE_ENV: 'production', APP_ENVIRONMENT: 'production', SCHEMA_GATE_MODE: 'live',
      CLOUDFLARE_ORIGIN_SECRET: 'prod_origin_4de950a83132408a96731e48',
      TELEGRAM_WEBHOOK_SECRET: 'prod_telegram_24fa9321c7894c91',
      GENERIC_WEBHOOK_SECRET: 'prod_generic_808d8277eb274cf1',
      CRON_SECRET: 'prod_cron_7f4f678c63b24437b4eb2a88',
      R2_ACCESS_KEY_ID: 'short-r2-key', R2_SECRET_ACCESS_KEY: 'stage1-client-secret-sentinel-r2-secret',
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.filter(({ category }) => category === 'production_credential_not_bounded').map(({ path }) => path).sort()).toEqual([
      'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
    ]);
    expect(JSON.stringify(result.issues)).not.toMatch(/short-r2-key|sentinel-r2-secret/u);
  });

  it('exposes only explicitly public Supabase values', () => {
    const config = getPublicConfig(createValidRuntimeEnvironment());
    expect(config).toEqual({
      supabaseUrl: 'https://abcdefghijklmnop.supabase.co',
      supabaseAnonKey: 'public-anon-value',
    });
    expect(JSON.stringify(config)).not.toContain('service-role-secret');
  });
});
