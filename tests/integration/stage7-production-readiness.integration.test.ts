import { HeadBucketCommand, type S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import { validateProductionReadiness } from '@/application/stage7/production-readiness';
import { ProductionReadinessAdapter, type ProductionReadinessProbeOverrides } from '@/infrastructure/deployment/production-readiness-adapter';
import { R2ObjectStorageAdapter } from '@/infrastructure/storage/r2-object-storage';
import { CloudflareAuthorityAdapter } from '@/infrastructure/cloudflare/cloudflare-authority';
import { stage7RuntimeConfig } from '../helpers/stage7';

function probes(config: ReturnType<typeof stage7RuntimeConfig>): ProductionReadinessProbeOverrides {
  const fixture = createStage7ReadinessFixture(config);
  return {
    migrationManifest: async () => ({ count: 14, valid: true }),
    database: async () => ({
      healthy: true,
      schemaVersion: 14,
      appliedMigrationSequenceValid: true,
      mappings: fixture.allSites.map((site) => ({
        hostname: site.normalizedHostname,
        organizationId: site.organizationId,
        domainId: site.domainId,
        siteId: site.id,
        regionId: site.regionId,
        regionExternalKey: site.regionId === null ? null : fixture.regions.find(({ id }) => id === site.regionId)?.externalKey ?? null,
        regionSlug: site.regionId === null ? null : fixture.regions.find(({ id }) => id === site.regionId)?.slug ?? null,
        coherent: true,
      })),
    }),
    supabaseAuthHealthy: async () => true,
    r2: async () => ({ healthy: true, dataPlaneHealthy: true, private: true }),
    upstashHealthy: async () => true,
    telegram: async () => ({ healthy: true, webhookMatches: true, secretMatches: true }),
    zone: async (hostname) => ({ hostname, nameserversAuthoritative: true, publicDelegationAuthoritative: true, apexProxied: true, wildcardProxied: true, fullStrict: true }),
    exactDomain: async (hostname) => ({ hostname, associated: true, verified: true }),
    tls: async () => ({ reachable: true, proxied: true }),
  };
}

function response(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

describe('injectable production readiness adapter', () => {
  it('uses the production R2 S3 adapter for a non-mutating HeadBucket data-plane probe', async () => {
    const config = stage7RuntimeConfig();
    const send = vi.fn(async (command: unknown) => {
      expect(command).toBeInstanceOf(HeadBucketCommand);
      expect((command as HeadBucketCommand).input).toEqual({ Bucket: config.r2.bucketName });
      return {};
    });
    const storage = new R2ObjectStorageAdapter(config.r2, { send } as unknown as S3Client);
    await expect(storage.check()).resolves.toEqual({ service: 'cloudflare-r2', status: 'healthy', category: 'r2_bucket_ready' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('runs every production check deterministically without contacting live providers', async () => {
    const config = stage7RuntimeConfig(); const fixture = createStage7ReadinessFixture(config);
    const unexpectedFetch: typeof fetch = async () => { throw new Error('unexpected live provider call'); };
    const adapter = new ProductionReadinessAdapter(config, unexpectedFetch, process.cwd(), probes(config));
    const snapshot = await adapter.inspect(fixture);
    expect(snapshot.schemaVersion).toBe(14);
    expect(snapshot.zones).toHaveLength(3);
    expect(snapshot.domains).toHaveLength(12);
    expect(snapshot.mappings).toHaveLength(12);
    await expect(validateProductionReadiness(config, fixture, adapter)).resolves.toMatchObject({ ready: true });
  });

  it('exercises the complete production HTTP and DNS probes with faithful read-only provider contracts', async () => {
    const config = stage7RuntimeConfig(); const fixture = createStage7ReadinessFixture(config);
    const zoneById = new Map(config.cloudflare.zoneIds.map((id, index) => [id, fixture.roots[index]!]));
    const requested: string[] = [];
    const providerFetch: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input : input.url);
      requested.push(`${init?.method ?? 'GET'} ${url.origin}${url.pathname}`);
      if (url.href === `${config.supabase.url}/auth/v1/health`) return response({ ok: true });
      if (url.origin === config.redis.url && url.pathname === '/ping') {
        expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${config.redis.token}`);
        return response({ result: 'PONG' });
      }
      if (url.origin === 'https://api.telegram.org' && url.pathname.endsWith('/getMe')) return response({ ok: true, result: { id: 1 } });
      if (url.origin === 'https://api.telegram.org' && url.pathname.endsWith('/getWebhookInfo')) return response({ ok: true, result: { url: config.telegram.webhookUrl } });
      if (url.hostname === config.hosts.webhook && url.pathname === '/api/webhooks/readiness/telegram-secret') {
        expect(new Headers(init?.headers).get('x-indicate-cloudflare-origin')).toBe(config.cloudflare.originSecret);
        return new Headers(init?.headers).get('x-telegram-bot-api-secret-token') === config.telegram.webhookSecret
          ? response(null, 204)
          : response(null, 404);
      }
      if (url.origin === 'https://api.cloudflare.com' && url.pathname.includes(`/accounts/${config.r2.accountId}/r2/buckets/${config.r2.bucketName}`)) {
        expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${config.cloudflare.apiToken}`);
        if (url.pathname.endsWith('/domains/custom')) return response({ success: true, result: { domains: [] } });
        if (url.pathname.endsWith('/domains/managed')) return response({ success: true, result: { enabled: false } });
        return response({ success: true, result: { name: config.r2.bucketName } });
      }
      if (url.origin === 'https://api.cloudflare.com' && /^\/client\/v4\/zones\/[^/]+$/u.test(url.pathname)) {
        const id = url.pathname.split('/').at(-1)!; const root = zoneById.get(id)!;
        return response({ success: true, result: { id, name: root.normalizedHostname, name_servers: config.cloudflare.expectedNameservers } });
      }
      if (url.origin === 'https://api.cloudflare.com' && url.pathname.endsWith('/dns_records')) {
        const id = url.pathname.split('/')[4]!; const root = zoneById.get(id)!;
        return response({ success: true, result: [
          { name: root.normalizedHostname, type: 'CNAME', content: config.vercel.productionTarget, proxied: true },
          { name: `*.${root.normalizedHostname}`, type: 'CNAME', content: config.vercel.productionTarget, proxied: true },
        ] });
      }
      if (url.origin === 'https://api.cloudflare.com' && url.pathname.endsWith('/settings/ssl')) return response({ success: true, result: { value: 'strict' } });
      if (url.origin === 'https://api.vercel.com' && url.pathname.includes('/domains/')) {
        const hostname = decodeURIComponent(url.pathname.split('/').at(-1)!);
        return response({ name: hostname, verified: true });
      }
      if (fixture.allSites.some(({ normalizedHostname }) => normalizedHostname === url.hostname) && url.pathname === '/robots.txt') {
        return new Response('User-agent: *', { status: 200, headers: { 'cf-ray': 'contract-ray', server: 'cloudflare' } });
      }
      return response({ category: 'unexpected_provider_request' }, 500);
    };
    const database = probes(config).database!;
    const resolver = async (hostname: string) => {
      expect(fixture.roots.some(({ normalizedHostname }) => normalizedHostname === hostname)).toBe(true);
      return config.cloudflare.expectedNameservers;
    };
    const adapter = new ProductionReadinessAdapter(config, providerFetch, process.cwd(), { database, r2DataPlaneHealthy: async () => true }, resolver);
    const report = await validateProductionReadiness(config, fixture, adapter);
    expect(report.ready).toBe(true);
    expect(requested.filter((value) => value.includes('api.vercel.com')).length).toBe(12);
    expect(requested.filter((value) => value.endsWith('/robots.txt')).length).toBe(12);
    expect(requested.filter((value) => value.includes('/api/webhooks/readiness/telegram-secret')).length).toBe(1);
    expect(JSON.stringify(report)).not.toContain(config.telegram.webhookSecret);
    expect(JSON.stringify(report)).not.toContain(config.cloudflare.originSecret);
  });

  it('rejects a parent Cloudflare zone when root readiness requires exact authoritative zones', async () => {
    const providerFetch = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      result: { id: 'parent-zone', name: 'example.web.id', name_servers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'] },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', providerFetch);
    try {
      const cloudflare = new CloudflareAuthorityAdapter(
        'account', 'token', ['zone-a', 'zone-b', 'zone-c'],
        ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'], 'cname.vercel-dns.com', async () => [],
      );
      await expect(cloudflare.verifyRootZone('alpha.example.web.id')).rejects.toThrow('cloudflare_zone_unavailable');
      expect(providerFetch).toHaveBeenCalledTimes(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fails closed when an injected provider reports an unavailable or public resource', async () => {
    const config = stage7RuntimeConfig(); const fixture = createStage7ReadinessFixture(config);
    const broken = { ...probes(config), r2: async () => ({ healthy: true, dataPlaneHealthy: false, private: true }), telegram: async () => ({ healthy: false, webhookMatches: false, secretMatches: false }) };
    const adapter = new ProductionReadinessAdapter(config, fetch, process.cwd(), broken);
    const report = await validateProductionReadiness(config, fixture, adapter);
    expect(report.ready).toBe(false);
    expect(report.checks.filter(({ status }) => status === 'failed').map(({ name }) => name)).toEqual(['r2_private_bucket', 'telegram_webhook']);
  });
});
